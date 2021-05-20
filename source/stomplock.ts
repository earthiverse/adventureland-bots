import AL from "alclient-mongo"
import { startBuyLoop, startCompoundLoop, startConnectLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startTrackerLoop, startPartyLoop, startPontyLoop, startSellLoop, startSendStuffDenylistLoop, startUpdateLoop, startUpgradeLoop } from "./base/general"

/** Config */
const warriorName = "earthWar"
const warrior2Name = "earthWar2"
const warrior3Name = "earthWar3"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "II"

const partyLeader = "earthWar"
const partyMembers = [warriorName, warrior2Name, warrior3Name,
    // Lolwutpear's characters
    "fdsfdsfds"
]

const targets: AL.MonsterName[] = ["bluefairy", "greenfairy", "redfairy"]

/** Characters */
let leader: AL.Warrior
let follower1: AL.Warrior
let follower2: AL.Warrior

/** Types */
type ReadyCM = {
    type: "ready"
    ready: boolean
}
type StompOrderCM = {
    type: "stompOrder"
    order: string[]
}

async function startShared(bot: AL.Warrior) {
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startConnectLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)

    startPontyLoop(bot)
    startSellLoop(bot)

    startUpdateLoop(bot)
    startUpgradeLoop(bot)

    async function attackLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            if (bot.canUse("attack")) {
                for (const [, entity] of bot.entities) {
                    if (!targets.includes(entity.type)) continue // Not a target
                    if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                    if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent
                    if (!entity.s.stunned) continue // Enemy is not stunned, don't attack!

                    await bot.basicAttack(entity.id)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()
}

async function startLeader(bot: AL.Warrior) {
    const readyToStomp = new Set<string>()

    startTrackerLoop(bot)

    // TODO: Update with CMData type when ALClient gets updated
    bot.socket.on("cm", async (data: { name: string, message: string }) => {
        if (!partyMembers.includes(data.name)) return // Discard messages from other players

        try {
            const decodedMessage: ReadyCM = JSON.parse(data.message)
            if (decodedMessage.type == "ready") {
                if (decodedMessage.ready) {
                    readyToStomp.add(data.name)
                } else {
                    readyToStomp.delete(data.name)
                }
            }
        } catch (e) {
            console.error(e)
        }
    })
}

async function startFollower(bot: AL.Warrior) {
    let stompOrder: string[] = []

    startPartyLoop(bot, partyLeader)

    // TODO: Update with CMData type when ALClient gets updated
    bot.socket.on("cm", async (data: { name: string, message: string }) => {
        if (!partyMembers.includes(data.name)) return // Discard messages from other players

        try {
            const decodedMessage: StompOrderCM = JSON.parse(data.message)
            if (decodedMessage.type == "stompOrder") {
                stompOrder = decodedMessage.order
            }
        } catch (e) {
            console.error(e)
        }
    })

    async function stompLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { stompLoop() }, 10)
                return
            }

            if(stompOrder[0] == bot.id) {
                // It's our turn to stomp!
            }

        } catch (e) {
            console.error(e)
        }
        
        setTimeout(async () => { stompLoop() }, Math.max(10, bot.getCooldown("stomp")))
    }
    stompLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Game.getGData()])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const leaderP = AL.Game.startWarrior(warriorName, region, identifier)
    const follower1P = AL.Game.startWarrior(warrior2Name, region, identifier)
    const follower2P = AL.Game.startWarrior(warrior3Name, region, identifier)
    leader = await leaderP
    follower1 = await follower1P
    follower2 = await follower2P

    // Start the characters
    startShared(leader)
    startLeader(leader)

    startShared(follower1)
    startFollower(follower1)

    startShared(follower2)
    startFollower(follower2)
}
run()