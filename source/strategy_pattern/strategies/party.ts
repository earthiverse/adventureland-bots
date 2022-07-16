import { InviteData, Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class AcceptPartyRequestStrategy<Type extends Character> implements Strategy<Type> {
    private onInvite: (data: InviteData) => Promise<void>

    public membersList: string[]

    public constructor(membersList: string[]) {
        this.membersList = membersList
    }

    public onApply(bot: Type) {
        this.onInvite = async (data: InviteData) => {
            if (!this.membersList.includes(data.name)) {
                return
            }

            await bot.acceptPartyRequest(data.name)
        }
    }

    public onRemove(bot: Type) {
        bot.socket.off("invite", this.onInvite)
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
            return bot.sendPartyRequest(this.partyLeader).catch((e) => console.error(e))
        }
    }
}