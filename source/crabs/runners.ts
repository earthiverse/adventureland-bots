import AL from "alclient-mongo"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToPoitonSellerIfLow, goToBankIfFull } from "../base/general.js"
import { partyLeader, partyMembers } from "./party.js"

export type Boundary = { x: [number, number], y: [number, number] }

export const region: AL.ServerRegion = "US"
export const identifier: AL.ServerIdentifier = "I"
export const targets: AL.MonsterName[] = ["crab"]
const LOOP_MS = 10

let map: AL.MapName
let boundary: Boundary
export async function startShared(bot: AL.Mage, targets: AL.MonsterName[], friends: AL.Mage[]): Promise<void> {
    if (!boundary) {
        for (const mapN in bot.G.maps) {
            if (boundary) break
            const gmap = bot.G.maps[mapN] as AL.GMap
            if (gmap.ignore) continue
            for (const monster of gmap.monsters) {
                if (monster.type == targets[0]) {
                    boundary = {
                        x: [monster.boundary[0], monster.boundary[2]],
                        y: [monster.boundary[1], monster.boundary[1]]
                    }
                    map = mapN as AL.MapName
                }
            }
        }
    }

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

            // Divide the boundary box in to equal sections and move there based on our position in the party list
            const numDivisions = Math.ceil(Math.sqrt(bot.partyData.list.length))
            const index = bot.partyData.list.indexOf(bot.name)
            const boundaryWidth = (boundary.x[0] + boundary.x[1])
            const divisionWidth = boundaryWidth / numDivisions
            const boundaryHeight = (boundary.y[0] + boundary.y[1])
            const divisionHeight = boundaryHeight / numDivisions

            const xFrom = ((index % numDivisions)) * divisionWidth
            const xTo = ((index % numDivisions) + 1) * divisionWidth
            const yFrom = (Math.floor(index / (numDivisions * 2))) * divisionHeight
            const yTo = (Math.floor(index / (numDivisions * 2)) + 1) * divisionHeight

            // Attack within our square
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: targets,
                    willBurnToDeath: false,
                    willDieToProjectiles: false,
                    withinRange: bot.range
                })) {
                    if (entity.x < xFrom || entity.x > xTo) continue
                    if (entity.y < yFrom || entity.y > yTo) continue

                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of friends) {
                            if (!friend) continue
                            if (friend.id == bot.id) continue
                            if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't delete special monsters
                            friend.deleteEntity(entity.id)
                        }
                    }

                    for (const friend of friends) {
                        if (!friend) continue // Not started
                        if (!friend.socket || friend.socket.disconnected) continue // Not connected
                        if (friend.id == bot.id) continue // Can't energize ourself
                        if (AL.Tools.distance(bot, friend) > bot.G.skills.energize.range) continue // Too far away
                        if (!friend.canUse("energize")) continue // Can't energize us
                        friend.energize(bot.id)
                    }

                    await bot.basicAttack(entity.id)
                    break
                }
            }

            // Attack outside our square
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: targets,
                    willBurnToDeath: false,
                    willDieToProjectiles: false,
                    withinRange: bot.range
                })) {
                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of friends) {
                            if (!friend) continue
                            if (friend.id == bot.id) continue
                            if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't delete special monsters
                            friend.deleteEntity(entity.id)
                        }
                    }

                    for (const friend of friends) {
                        if (!friend) continue // Not started
                        if (!friend.socket || friend.socket.disconnected) continue // Not connected
                        if (friend.id == bot.id) continue // Can't energize ourself
                        if (AL.Tools.distance(bot, friend) > bot.G.skills.energize.range) continue // Too far away
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
            if (bot.party) { // We're partying!
                // Divide the boundary box in to equal sections and move there based on our position in the party list
                const numDivisions = Math.ceil(Math.sqrt(bot.partyData.list.length))
                const index = bot.partyData.list.indexOf(bot.name)
                const boundaryWidth = (boundary.x[0] + boundary.x[1])
                const divisionWidth = boundaryWidth / numDivisions
                const boundaryHeight = (boundary.y[0] + boundary.y[1])
                const divisionHeight = boundaryHeight / numDivisions

                const x = ((index % numDivisions) + 0.5) * divisionWidth
                const y = (Math.floor(index / (numDivisions * 2)) + 0.5) * divisionHeight
                await bot.smartMove({ map: map, x: x, y: y })
            } else { // No party, move to center of spawn
                await bot.smartMove({ map: map, x: (boundary.x[0] + boundary.x[1]) / 2, y: (boundary.y[0] + boundary.y[1]) / 2 })
            }
        } catch (e) {
            console.error(e)
        }
    }
    moveLoop()
}