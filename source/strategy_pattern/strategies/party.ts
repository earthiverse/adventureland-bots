import { InviteData, PingCompensatedCharacter } from "alclient"
import { partyLeader } from "../../base/party.js"
import { Loop, Loops, Strategy } from "../context.js"

export class AcceptPartyRequestStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public name = "RequestPartyStrategy"
    public loops: Loops<Type> = new Map<string, Loop<Type>>()

    public membersList: string[]

    public constructor(membersList: string[]) {
        this.membersList = membersList

        this.loops.set("party", {
            fn: async (bot: Type) => { await this.checkRequests(bot) },
            interval: 5000
        })
    }

    async checkRequests(bot: Type) {
        if (!bot.socket.hasListeners("invite")) {
            bot.socket.on("invite", async (data: InviteData) => {
                if (!this.membersList.includes(data.name)) {
                    console.warn(`Ignoring party request from ${data.name}`)
                    return
                }

                console.log(`Accepting party request from ${data.name}`)
                await bot.acceptPartyRequest(data.name)
            })
        }
    }
}

export class RequestPartyStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public name = "RequestPartyStrategy"
    public loops: Loops<Type> = new Map<string, Loop<Type>>()

    public partyLeader: string

    public constructor(partyLeader: string) {
        this.partyLeader = partyLeader

        this.loops.set("party", {
            fn: async (bot: Type) => { await this.requestPartyInvite(bot) },
            interval: 5000
        })
    }

    async requestPartyInvite(bot: Type) {
        if (!bot.partyData?.list?.includes(partyLeader)) {
            // They're not in our party, send a request
            await bot.sendPartyRequest(partyLeader)
        }
    }
}