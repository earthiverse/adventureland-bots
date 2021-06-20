import AL from "alclient-mongo"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToPoitonSellerIfLow, goToBankIfFull } from "../base/general.js"
import { partyLeader, partyMembers } from "./party.js"

export const region: AL.ServerRegion = "US"
export const identifier: AL.ServerIdentifier = "I"
export const targets: AL.MonsterName[] = ["crab"]
export const topBoundary: Boundary = { x: [-1354, -1051], y: [-264, -132] }
export const topPositions: AL.IPosition[] = [{ map: "main", x: -1278.25, y: -198 }, { map: "main", x: -1202.5, y: -198 }, { map: "main", x: -1126.75, y: -198 }]
export const middleBoundary: Boundary = { x: [-1354, -1051], y: [-132, 0] }
export const middlePositions: AL.IPosition[] = [{ map: "main", x: -1278.25, y: -66 }, { map: "main", x: -1202.5, y: -66 }, { map: "main", x: -1126.75, y: -66 }]
export const bottomBoundary: Boundary = { x: [-1354, -1051], y: [0, 132] }
export const bottomPositions: AL.IPosition[] = [{ map: "main", x: -1278.25, y: 66 }, { map: "main", x: -1202.5, y: 66 }, { map: "main", x: -1126.75, y: 66 }]
const LOOP_MS = 10

export type Boundary = { x: [number, number], y: [number, number] }

export async function startShared(bot: AL.Mage, targets: AL.MonsterName[], boundary: Boundary, position: AL.IPosition, friends: AL.Mage[]): Promise<void> {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startPontyLoop(bot)
    startSellLoop(bot)
    startUpgradeLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: targets,
                    willBurnToDeath: false,
                    willDieToProjectiles: false,
                    withinRange: bot.range
                })) {
                    if (entity.x < boundary.x[0] || entity.x > boundary.x[1]) continue
                    if (entity.y < boundary.y[0] || entity.y > boundary.y[1]) continue

                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of friends) {
                            if (!friend) continue
                            if (friend.id == bot.id) continue
                            friend.entities.delete(entity.id)
                        }
                    }

                    for (const friend of friends) {
                        if (!friend) continue // Not started
                        if (!friend.socket || friend.socket.disconnected) continue // Not connected
                        if (friend.id == bot.id) continue // Can't energize ourself
                        if (!friend.canUse("energize")) continue // Can't energize us
                        friend.energize(bot.id)
                    }

                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            await goToPoitonSellerIfLow(bot)
            await goToBankIfFull(bot)

            // Hold position
            await bot.smartMove(position)
        } catch (e) {
            console.error(e)
        }
    }
    moveLoop()
}