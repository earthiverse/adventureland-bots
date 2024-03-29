import AL, { EntitiesData, MonsterName, NewMapData, Rogue, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist } from "../strategy_pattern/context.js"
import { AlwaysInvisStrategy } from "../strategy_pattern/strategies/invis.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { CRYPT_MONSTERS } from "../base/crypt.js"
import { sleep } from "../base/general.js"
import { AvoidDeathStrategy } from "../strategy_pattern/strategies/avoid_death.js"
import { caveCryptEntrance, winterlandXmageEntrance } from "../base/locations.js"
import { suppress_errors } from "../strategy_pattern/logging.js"
import { XMAGE_MONSTERS } from "../strategy_pattern/setups/xmage.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"

const credentials = "../../credentials.json"
const rogueName = "earthRog"
const serverRegion: ServerRegion = "US"
const serverIdentifier: ServerIdentifier = "III"

async function run() {
    console.log("Connecting...")
    await Promise.all([AL.Game.loginJSONFile(credentials, false), AL.Game.getGData(true)])

    await AL.Pathfinder.prepare(AL.Game.G, { cheat: false })
    const rogue = await AL.Game.startRogue(rogueName, serverRegion, serverIdentifier)

    const instances = await AL.InstanceModel.find({
        serverIdentifier: serverIdentifier,
        serverRegion: serverRegion,
    }).sort({
        map: 1
    }).lean().exec()

    const context = new Strategist<Rogue>(rogue)
    context.applyStrategy(new BaseStrategy())
    context.applyStrategy(new AlwaysInvisStrategy())
    context.applyStrategy(new RespawnStrategy())
    context.applyStrategy(new AvoidDeathStrategy())
    // TODO: Add strategy to scare if we have a target

    let num = 1
    const total = instances.length

    if (total === 0) {
        console.debug("No instances!")
        await sleep(5000)
        context.stop()
        AL.Database.disconnect()
        return
    }

    // TODO: Add support if we find all the missing entities to stop searching and go to the next one
    for (const instance of instances) {
        console.debug(`Trying to fix ${instance.map} ${instance.in} (${num}/${total})...`)

        const found = new Map<MonsterName, Set<string>>()
        let error = false

        const listener = (data: EntitiesData) => {
            for (const monster of data.monsters) {
                if (CRYPT_MONSTERS.includes(monster.type) || XMAGE_MONSTERS.includes(monster.type)) {
                    if (found.has(monster.type)) {
                        // Make sure the ID is in the set
                        const ids = found.get(monster.type)
                        ids.add(monster.id)
                    } else {
                        // Create the set with the ID
                        console.debug(`We found a ${monster.type} in ${instance.map} ${instance.in}`)
                        found.set(monster.type, new Set([monster.id]))
                    }
                }
            }
        }
        const listener2 = (data: NewMapData) => {
            if (!data.entities?.monsters) return
            for (const monster of data.entities.monsters) {
                if (CRYPT_MONSTERS.includes(monster.type) || XMAGE_MONSTERS.includes(monster.type)) {
                    if (found.has(monster.type)) {
                        // Make sure the ID is in the set
                        const ids = found.get(monster.type)
                        ids.add(monster.id)
                    } else {
                        // Create the set with the ID
                        console.debug(`We found a ${monster.type} in ${instance.map} ${instance.in}`)
                        found.set(monster.type, new Set([monster.id]))
                    }
                }
            }
        }
        context.bot.socket.on("entities", listener)
        context.bot.socket.on("new_map", listener2)

        const prepareNext = async function (removeEntities = false) {
            context.bot.socket.off("entities", listener)
            context.bot.socket.off("new_map", listener2)
            if (removeEntities) {
                await AL.InstanceModel.deleteOne({ _id: instance._id }).lean().exec()
                await AL.EntityModel.deleteMany({ in: instance.in, serverIdentifier: instance.serverIdentifier, serverRegion: instance.serverRegion }).lean().exec()
            }
            num += 1
        }

        if (instance.map === "crypt") {
            // Top right of map
            await rogue.smartMove({
                in: instance.in,
                map: instance.map,
                x: 2750,
                y: -1750
            }).catch((e) => {
                console.error(e)
                error = true
            })

            if (rogue.map !== instance.map) {
                try {
                    await rogue.enter(instance.map, instance.in)
                } catch (e) {
                    if (e.message?.startsWith("We don't have the required item to enter")) {
                        console.debug("Instance expired! Deleting...")
                        await prepareNext(true)
                        continue
                    }
                }
            }

            // Near crypt bats
            await rogue.smartMove({
                in: instance.in,
                map: instance.map,
                x: 1450,
                y: -550
            }).catch((e) => {
                console.error(e)
                error = true
            })

            // End of crypt
            await rogue.smartMove({
                in: instance.in,
                map: instance.map,
                x: 2500,
                y: 450
            }).catch((e) => {
                console.error(e)
                error = true
            })

            // Exit the crypt
            await rogue.smartMove(caveCryptEntrance).catch(suppress_errors)
        } else if (instance.map === "winter_instance") {
            await rogue.smartMove({
                in: instance.in,
                map: instance.map,
                x: -10,
                y: 200
            }).catch((e) => {
                console.error(e)
                error = true
            })

            // Exit the lair
            await rogue.smartMove(winterlandXmageEntrance).catch(suppress_errors)
        }

        if (found.size === 0 && !error) {
            console.debug(`No monsters were found on ${instance.map} ${instance.in}, deleting...`)
            await prepareNext(true)
        } else {
            await prepareNext()
        }
    }

    console.debug("Disconnecting...")
    context.stop()
    AL.Database.disconnect()
}

await run()
