import AL, { Character, GMap, Mage, MapName, MonsterName, Ranger, ServerIdentifier, ServerRegion, Tools } from "alclient"
import { startBuyLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, goToPotionSellerIfLow, goToBankIfFull } from "../base/general.js"
import { mainCrabs, offsetPositionParty } from "../base/locations.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { attackTheseTypesRanger } from "../base/ranger.js"

export type Boundary = { x: [number, number], y: [number, number] }

export const region: ServerRegion = "US"
export const identifier: ServerIdentifier = "I"
export const targets: MonsterName[] = ["crab"]
const LOOP_MS = 10

let map: MapName
let boundary: Boundary
export async function startShared(bot: Mage, targets: MonsterName[], friends: Mage[]): Promise<void> {
    if (!boundary) {
        for (const mapN in bot.G.maps) {
            if (boundary) break
            const gmap = bot.G.maps[mapN] as GMap
            if (gmap.ignore) continue
            for (const monster of gmap.monsters) {
                if (monster.type == targets[0]) {
                    boundary = {
                        x: [monster.boundary[0], monster.boundary[2]],
                        y: [monster.boundary[1], monster.boundary[1]]
                    }
                    map = mapN as MapName
                }
            }
        }
    }

    startBuyLoop(bot, new Set())
    startElixirLoop(bot, "elixirluck")
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startSellLoop(bot, { "cclaw": 2, "crabclaw": 2, "hpamulet": 2, "hpbelt": 2, "ringsj": 2, "wcap": 2, "wshoes": 2 })

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
                        friend.energize(bot.id).catch(e => console.error(e))
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
                        friend.energize(bot.id).catch(e => console.error(e))
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
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            await goToPotionSellerIfLow(bot)
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
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

export async function startSharedRanger(bot: Ranger, friends: Character[]) {
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, "earthMer")

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            await attackTheseTypesRanger(bot, ["crab"], friends, { disableHuntersMark: true, disableSupershot: true })
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
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            if (bot.party) {
                await bot.smartMove(offsetPositionParty(mainCrabs, bot))
            } else {
                await bot.smartMove(mainCrabs)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}