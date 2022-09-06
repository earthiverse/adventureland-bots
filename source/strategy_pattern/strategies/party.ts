import { InviteData, Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type PartyOptions = {
    /** A list of IDs that are allowed to join your party */
    allowList?: string[]
    /** A list of IDs that are not allowed to join your party */
    denyList?: string[]
}

export class AcceptPartyRequestStrategy<Type extends Character> implements Strategy<Type> {
    private onRequest: (data: {name: string}) => Promise<void>

    public options: PartyOptions

    public constructor(options?: PartyOptions) {
        if (!options) options = {}
        this.options = options
    }

    public onApply(bot: Type) {
        this.onRequest = async (data: InviteData) => {
            if (this.options.allowList && !this.options.allowList.includes(data.name)) return // Not in allow list
            if (this.options.denyList && this.options.denyList.includes(data.name)) return // In deny list

            await bot.acceptPartyRequest(data.name)
        }
        bot.socket.on("request", this.onRequest)
    }

    public onRemove(bot: Type) {
        bot.socket.off("request", this.onRequest)
    }
}

export class RequestPartyStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public partyLeader: string

    public constructor(partyLeader: string) {
        this.partyLeader = partyLeader

        this.loops.set("party", {
            fn: async (bot: Type) => { await this.requestPartyInvite(bot) },
            interval: 5000
        })
    }

    private async requestPartyInvite(bot: Type) {
        if (!bot.partyData?.list?.includes(this.partyLeader)) {
            // They're not in our party, send a request
            return bot.sendPartyRequest(this.partyLeader).catch(console.error)
        }
    }
}