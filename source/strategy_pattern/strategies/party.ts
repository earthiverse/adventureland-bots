import { InviteData, Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type PartyOptions = {
    /** A list of IDs that are allowed to join your party */
    allowList?: string[]
    /** A list of IDs that are not allowed to join your party */
    denyList?: string[]
}

export class AcceptPartyRequestStrategy<Type extends Character> implements Strategy<Type> {
    private onRequest: (data: { name: string }) => Promise<void>

    public options: PartyOptions

    public constructor(options?: PartyOptions) {
        if (!options) options = {}
        this.options = options
    }

    public onApply(bot: Type) {
        this.onRequest = async (data: InviteData) => {
            console.debug(data)
            if (this.options.allowList && !this.options.allowList.includes(data.name)) return // Not in allow list
            if (this.options.denyList && this.options.denyList.includes(data.name)) return // In deny list

            await bot.acceptPartyRequest(data.name).catch(console.error)
        }
        bot.socket.on("request", this.onRequest)
    }

    public onRemove(bot: Type) {
        if (this.onRequest) bot.socket.off("request", this.onRequest)
    }
}

export class RequestPartyStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public partyLeader: string

    public constructor(partyLeader: string) {
        this.partyLeader = partyLeader

        this.loops.set("party", {
            fn: async (bot: Type) => {
                await this.requestPartyInvite(bot)
            },
            interval: 2000,
        })
    }

    private async requestPartyInvite(bot: Type) {
        if (!bot.partyData?.list?.includes(this.partyLeader)) {
            // They're not in our party, send a request
            return bot.sendPartyRequest(this.partyLeader).catch(console.error)
        }
    }
}

/**
 * Polio's party code requires a CM, then they'll invite you.
 */
export class PolioPartyStrategy<Type extends Character> implements Strategy<Type> {
    private onInvite: (data: { name: string }) => Promise<void>
    public loops = new Map<LoopName, Loop<Character>>()

    public constructor() {
        this.loops.set("party", {
            fn: async (bot: Character) => {
                await this.requestPartyInvite(bot)
            },
            interval: 2000,
        })
    }

    public onApply(bot: Type) {
        this.onInvite = async (data: InviteData) => {
            if (data.name !== "Polio") return // Not Polio
            await bot.acceptPartyInvite(data.name).catch(console.error)
        }
        bot.socket.on("invite", this.onInvite)
    }

    public onRemove(bot: Type) {
        if (this.onInvite) bot.socket.off("invite", this.onInvite)
    }

    private async requestPartyInvite(bot: Character) {
        if (!bot.partyData?.list?.includes("Polio")) {
            // They're not in our party, send a request
            await bot.sendCM(["Polio"], { data: "partyInvite", id: bot.id })
        }
    }
}
