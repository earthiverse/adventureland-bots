import { ItemName, ItemInfo, MonsterName } from "./definitions/adventureland"
import { getInventory, getCooldownMS, isAvailable, findItem } from "./functions"
import FastPriorityQueue from "fastpriorityqueue"
import { PriorityEntity, InventoryItemInfo } from "./definitions/bots"

const TIMEOUT = 500

class Hardcore {
    mainTarget: MonsterName = "goo"

    async run() {
        this.attackLoop()
        this.buyLoop()
        this.compoundLoop()
        this.equipLoop()
        this.exchangeLoop()
        this.healLoop()
        this.lootLoop()
        this.moveLoop()
        this.pontyLoop()
        this.sellLoop()
        this.upgradeLoop()
    }

    async attackLoop() {
        try {
            const potentialTargets = new FastPriorityQueue<PriorityEntity>((x, y) => x.priority > y.priority)
            for (const id in parent.entities) {
                const entity = parent.entities[id]
                let priority = 0

                if (entity.rip) continue // Don't attack dead things
                if (parent.party_list.includes(id)) continue // Don't attack party members
                if (entity.s.invincible) continue // Don't attack things that are invincible
                if (entity.npc) continue // Don't attack NPCs
                if (entity.mtype && entity.target && !entity.cooperative && entity.target != parent.character.id) continue // Don't attack monsters that are attacking other players
                if (entity.mtype && entity.mtype != this.mainTarget) continue // Only attack the main target
                const d = distance(parent.character, entity)
                if (d > parent.character.range) continue // Don't attack things out of range

                if (entity.target == parent.character.id) priority += 100 // Increase priority if it's attacking us
                if (!entity.mtype) priority += 10 // Increase priority if it's another player

                potentialTargets.add({ id: id, priority: priority })
            }

            const entity = parent.entities[potentialTargets.poll().id]
            await attack(entity)
            reduce_cooldown("attack", Math.min(...parent.pings))
        } catch (e) {
            if (e.reason == "cooldown") {
                setTimeout(async () => { this.attackLoop() }, Math.min(...parent.pings) - e.remaining)
                return
            }
            console.error(e)
        }

        setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack", true))
    }

    async buyLoop() {
        try {
            let numHp = 0
            let numMp = 0
            let numScrolls = 0
            let numCScrolls = 0
            let numDexScrolls = 0
            for (const item of getInventory()) {
                if (item.name == "hpot1") {
                    numHp += item.q
                } else if (item.name == "mpot1") {
                    numMp += item.q
                } else if (item.name == "cscroll2") {
                    numCScrolls += item.q
                } else if (item.name == "scroll2") {
                    numScrolls += item.q
                } else if (item.name == "dexscroll") {
                    numDexScrolls += item.q
                }
            }

            const promises: Promise<any>[] = []
            if (numHp < 25) promises.push(buy("hpot1", 25 - numHp))
            if (numMp < 25) promises.push(buy("mpot1", 25 - numMp))
            if (numCScrolls < 3) promises.push(buy("cscroll2", 3 - numCScrolls))
            if (numScrolls < 3) promises.push(buy("scroll2", 3 - numScrolls))
            if (numDexScrolls < 110) promises.push(buy("dexscroll", 110 - numDexScrolls))
            Promise.all(promises)
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.buyLoop() }, TIMEOUT)
    }
    async compoundLoop() {
        try {
            if (parent.character.q.compound // Already compounding something
                || parent.character.map == "bank") { // We can't do things in the bank
                setTimeout(async () => { this.compoundLoop() }, TIMEOUT)
                return
            }

            const items = getInventory()
            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                const gInfo = G.items[item.name]
                if (!gInfo.compound) continue // Item isn't compoundable

                // Look for three more items of the same type
                const same: InventoryItemInfo[] = [item]
                for (let j = i + 1; j < items.length; j++) {
                    const item2 = items[j]
                    if (item2.name != item.name) continue
                    if (item2.level != item.level) continue
                    same.push(item2)
                }

                if (same.length >= 3) {
                    // Look for scroll
                    const scroll = findItem("cscroll2")
                    if (scroll) compound(same[0].index, same[1].index, same[2].index, scroll.index)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.compoundLoop() }, TIMEOUT)
    }

    // TODO: This code is broken! It only counts the stats as a level 0 item, not as the actual level it is.
    // TODO: You should fix this.
    async equipLoop() {
        try {
            // Helmet
            let bestHelmet: InventoryItemInfo
            let bestHelmetScore = -1
            if (parent.character.slots.helmet) {
                const gData2 = G.items[parent.character.slots.helmet.name]
                bestHelmetScore = 0
                if (gData2.armor) bestHelmetScore += gData2.armor
                if (gData2.upgrade.armor) bestHelmetScore += gData2.upgrade.armor * parent.character.slots.helmet.level
                if (gData2.resistance) bestHelmetScore += gData2.resistance
                if (gData2.upgrade.resistance) bestHelmetScore += gData2.upgrade.resistance * parent.character.slots.helmet.level
            }

            // Chest
            let bestChest: InventoryItemInfo
            let bestChestScore = -1
            if (parent.character.slots.chest) {
                const gData2 = G.items[parent.character.slots.chest.name]
                bestChestScore = 0
                if (gData2.armor) bestChestScore += gData2.armor
                if (gData2.upgrade.armor) bestChestScore += gData2.upgrade.armor * parent.character.slots.chest.level
                if (gData2.resistance) bestChestScore += gData2.resistance
                if (gData2.upgrade.resistance) bestChestScore += gData2.upgrade.resistance * parent.character.slots.chest.level
            }

            // Pants
            let bestPants: InventoryItemInfo
            let bestPantsScore = -1
            if (parent.character.slots.pants) {
                const gData2 = G.items[parent.character.slots.pants.name]
                bestPantsScore = 0
                if (gData2.armor) bestPantsScore += gData2.armor
                if (gData2.upgrade.armor) bestPantsScore += gData2.upgrade.armor * parent.character.slots.pants.level
                if (gData2.resistance) bestPantsScore += gData2.resistance
                if (gData2.upgrade.resistance) bestPantsScore += gData2.upgrade.resistance * parent.character.slots.pants.level
            }

            // Shoes
            let bestShoes: InventoryItemInfo
            let bestShoesScore = -1
            if (parent.character.slots.shoes) {
                const gData2 = G.items[parent.character.slots.shoes.name]
                bestShoesScore = 0
                if (gData2.armor) bestShoesScore += gData2.armor
                if (gData2.resistance) bestShoesScore += gData2.resistance
            }

            // Gloves
            let bestGloves: InventoryItemInfo
            let bestGlovesScore = -1
            if (parent.character.slots.shoes) {
                const gData2 = G.items[parent.character.slots.shoes.name]
                bestGlovesScore = 0
                if (gData2.armor) bestGlovesScore += gData2.armor
                if (gData2.resistance) bestGlovesScore += gData2.resistance
            }

            // Cape
            let bestCape: InventoryItemInfo
            let bestCapeScore = -1
            if (parent.character.slots.cape) {
                const gData2 = G.items[parent.character.slots.cape.name]
                bestCapeScore = 0
                if (gData2.armor) bestCapeScore += gData2.armor
                if (gData2.resistance) bestCapeScore += gData2.resistance
            }

            // Bow
            let bestBow: InventoryItemInfo
            let bestBowScore = -1
            if (parent.character.slots.mainhand) {
                const gData2 = G.items[parent.character.slots.mainhand.name]
                bestBowScore = 0
                if (gData2.range) bestBowScore += gData2.range
                if (gData2.upgrade.range) bestBowScore += gData2.upgrade.range * parent.character.slots.mainhand.level
            }

            // Quiver
            let bestQuiver: InventoryItemInfo
            let bestQuiverScore = -1
            if (parent.character.slots.offhand) {
                const gData2 = G.items[parent.character.slots.offhand.name]
                bestQuiverScore = 0
                if (gData2.range) bestQuiverScore += gData2.range
                if (gData2.upgrade.range) bestQuiverScore += gData2.upgrade.range * parent.character.slots.offhand.level
            }

            // Amulet
            let bestAmulet: InventoryItemInfo
            let bestAmuletScore = -1
            if (parent.character.slots.amulet) {
                const gData2 = G.items[parent.character.slots.amulet.name]
                bestAmuletScore = 0
                if (gData2.vit) bestAmuletScore += gData2.vit
            }

            // Ring1
            let bestRing1: InventoryItemInfo
            let bestRing1Score = -1
            if (parent.character.slots.ring1) {
                const gData2 = G.items[parent.character.slots.ring1.name]
                bestRing1Score = 0
                if (gData2.vit) bestRing1Score += gData2.vit
                if (gData2.compound.vit) bestRing1Score += gData2.compound.vit * parent.character.slots.ring1.level
            }

            // Ring2
            let bestRing2: InventoryItemInfo
            let bestRing2Score = -1
            if (parent.character.slots.ring2) {
                const gData2 = G.items[parent.character.slots.ring2.name]
                bestRing2Score = 0
                if (gData2.vit) bestRing2Score += gData2.vit
                if (gData2.compound.vit) bestRing2Score += gData2.compound.vit * parent.character.slots.ring2.level
            }

            // Earring1
            let bestEarring1: InventoryItemInfo
            let bestEarring1Score = -1
            if (parent.character.slots.earring1) {
                const gData2 = G.items[parent.character.slots.earring1.name]
                bestEarring1Score = 0
                if (gData2.vit) bestEarring1Score += gData2.vit
            }

            // Earring2
            let bestEarring2: InventoryItemInfo
            let bestEarring2Score = -1
            if (parent.character.slots.earring2) {
                const gData2 = G.items[parent.character.slots.earring2.name]
                bestEarring2Score = 0
                if (gData2.vit) bestEarring2Score += gData2.vit
            }

            // Belt
            let bestBelt: InventoryItemInfo
            let bestBeltScore = -1
            if (parent.character.slots.belt) {
                const gData2 = G.items[parent.character.slots.belt.name]
                bestBeltScore = 0
                if (gData2.vit) bestBeltScore += gData2.vit
            }

            // Orb
            let bestOrb: InventoryItemInfo
            let bestOrbScore = -1
            if (parent.character.slots.orb) {
                const gData2 = G.items[parent.character.slots.orb.name]
                bestOrbScore = 0
                if (gData2.vit) bestOrbScore += gData2.vit
            }

            for (const item of getInventory()) {
                const gData = G.items[item.name]
                if (gData.type == "weapon" && gData.wtype == "bow") {
                    let bowScore = 0
                    if (gData.range) bowScore += gData.range
                    if (gData.upgrade.range) bowScore += gData.upgrade.range * item.level
                    if (bowScore > bestBowScore) {
                        bestBow = item
                        bestBowScore = bowScore
                    }
                } else if (gData.type == "helmet") {
                    let helmetScore = 0
                    if (gData.armor) helmetScore += gData.armor
                    if (gData.upgrade.armor) helmetScore += gData.upgrade.armor * item.level
                    if (gData.resistance) helmetScore += gData.resistance
                    if (gData.upgrade.resistance) helmetScore += gData.upgrade.resistance * item.level
                    if (helmetScore > bestHelmetScore) {
                        bestHelmet = item
                        bestHelmetScore = helmetScore
                    }
                } else if (gData.type == "chest") {
                    let chestScore = 0
                    if (gData.armor) chestScore += gData.armor
                    if (gData.upgrade.armor) chestScore += gData.upgrade.armor * item.level
                    if (gData.resistance) chestScore += gData.resistance
                    if (gData.upgrade.resistance) chestScore += gData.upgrade.resistance * item.level
                    if (chestScore > bestChestScore) {
                        bestChest = item
                        bestChestScore = chestScore
                    }
                } else if (gData.type == "pants") {
                    let pantsScore = 0
                    if (gData.armor) pantsScore += gData.armor
                    if (gData.upgrade.armor) pantsScore += gData.upgrade.armor * item.level
                    if (gData.resistance) pantsScore += gData.resistance
                    if (pantsScore > bestPantsScore) {
                        bestPants = item
                        bestPantsScore = pantsScore
                    }
                } else if (gData.type == "shoes") {
                    let shoesScore = 0
                    if (gData.armor) shoesScore += gData.armor
                    if (gData.upgrade.armor) shoesScore += gData.upgrade.armor * item.level
                    if (gData.resistance) shoesScore += gData.resistance
                    if (shoesScore > bestShoesScore) {
                        bestShoes = item
                        bestShoesScore = shoesScore
                    }
                } else if (gData.type == "gloves") {
                    let glovesScore = 0
                    if (gData.armor) glovesScore += gData.armor
                    if (gData.upgrade.armor) glovesScore += gData.upgrade.armor * item.level
                    if (gData.resistance) glovesScore += gData.resistance
                    if (glovesScore > bestGlovesScore) {
                        bestGloves = item
                        bestGlovesScore = glovesScore
                    }
                } else if (gData.type == "cape") {
                    let capeScore = 0
                    if (gData.armor) capeScore += gData.armor
                    if (gData.upgrade.armor) capeScore += gData.upgrade.armor * item.level
                    if (gData.resistance) capeScore += gData.resistance
                    if (capeScore > bestCapeScore) {
                        bestCape = item
                        bestCapeScore = capeScore
                    }
                } else if (gData.type == "quiver") {
                    let quiverScore = 0
                    if (gData.range) quiverScore += gData.range
                    if (gData.upgrade.range) quiverScore += gData.upgrade.range * item.level
                    if (quiverScore > bestQuiverScore) {
                        bestQuiver = item
                        bestQuiverScore = quiverScore
                    }
                } else if (gData.type == "amulet") {
                    let amuletScore = 0
                    if (gData.vit) amuletScore += gData.vit
                    if (amuletScore > bestAmuletScore) {
                        bestAmulet = item
                        bestAmuletScore = amuletScore
                    }
                } else if (gData.type == "ring") {
                    let ringScore = 0
                    if (gData.vit) ringScore += gData.vit
                    if (gData.compound.vit) ringScore += gData.compound.vit * item.level
                    if (ringScore > bestRing1Score) {
                        bestRing1 = item
                        bestRing1Score = ringScore
                    } else if (ringScore > bestRing2Score) {
                        bestRing2 = item
                        bestRing2Score = ringScore
                    }
                } else if (gData.type == "earring") {
                    let earringScore = 0
                    if (gData.vit) earringScore += gData.vit
                    if (gData.compound.vit) earringScore += gData.compound.vit * item.level
                    if (earringScore > bestEarring1Score) {
                        bestEarring1 = item
                        bestEarring1Score = earringScore
                    } else if (earringScore > bestEarring2Score) {
                        bestEarring2 = item
                        bestEarring2Score = earringScore
                    }
                } else if (gData.type == "belt") {
                    let beltScore = 0
                    if (gData.vit) beltScore += gData.vit
                    if (gData.compound.vit) beltScore += gData.compound.vit * item.level
                    if (beltScore > bestBeltScore) {
                        bestBelt = item
                        bestBeltScore = beltScore
                    }
                } else if (gData.type == "orb") {
                    let orbScore = 0
                    if (gData.vit) orbScore += gData.vit
                    if (gData.compound.vit) orbScore += gData.compound.vit * item.level
                    if (orbScore > bestOrbScore) {
                        bestOrb = item
                        bestOrbScore = orbScore
                    }
                }
            }

            // Equip better items
            if (bestBow) equip(bestBow.index, "mainhand")
            if (bestQuiver) equip(bestQuiver.index, "offhand")
            if (bestHelmet) equip(bestHelmet.index, "helmet")
            if (bestChest) equip(bestChest.index, "chest")
            if (bestPants) equip(bestPants.index, "pants")
            if (bestShoes) equip(bestShoes.index, "shoes")
            if (bestGloves) equip(bestGloves.index, "gloves")
            if (bestCape) equip(bestCape.index, "cape")
            if (bestAmulet) equip(bestAmulet.index, "amulet")
            if (bestRing1) equip(bestRing1.index, "ring1")
            if (bestRing2) equip(bestRing2.index, "ring2")
            if (bestEarring1) equip(bestEarring1.index, "earring1")
            if (bestEarring2) equip(bestEarring2.index, "earring2")
            if (bestBelt) equip(bestBelt.index, "belt")
            if (bestOrb) equip(bestOrb.index, "orb")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.equipLoop() }, TIMEOUT)
    }

    async exchangeLoop() {
        try {
            if (parent.character.q.exchange // Already exchanging something
                || parent.character.map == "bank") { // We can't do things in the bank
                setTimeout(async () => { this.exchangeLoop() }, TIMEOUT)
                return
            }

            for (const item of getInventory()) {
                if (G.items[item.name].e && item.q >= G.items[item.name].e) {
                    exchange(item.index)
                } else if (item.name == "glitch") {
                    exchange(item.index)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.exchangeLoop() }, TIMEOUT)
    }

    async healLoop(): Promise<void> {
        try {
            if (parent.character.rip) {
                // Respawn if we're dead
                respawn()
                setTimeout(async () => { this.healLoop() }, getCooldownMS("use_town"))
                return
            } else if (!isAvailable("use_hp")) {
                setTimeout(async () => { this.healLoop() }, getCooldownMS("use_hp"))
                return
            }

            const hpPots: ItemName[] = ["hpot0", "hpot1"]
            const mpPots: ItemName[] = ["mpot0", "mpot1"]
            let useMpPot: ItemInfo = null
            let useHpPot: ItemInfo = null

            // TODO: find last potion in inventory
            for (let i = parent.character.items.length - 1; i >= 0; i--) {
                const item = parent.character.items[i]
                if (!item) continue

                if (!useHpPot && hpPots.includes(item.name)) {
                    // This is the HP Pot that will be used
                    useHpPot = item
                } else if (!useMpPot && mpPots.includes(item.name)) {
                    // This is the MP Pot that will be used
                    useMpPot = item
                }

                if (useHpPot && useMpPot) {
                    // We've found the last two pots we're using
                    break
                }
            }

            const hpRatio = parent.character.hp / parent.character.max_hp
            const mpRatio = parent.character.mp / parent.character.max_mp
            if (hpRatio <= mpRatio
                && hpRatio != 1
                && (!useHpPot
                    || (useHpPot.name == "hpot0" && (parent.character.hp <= parent.character.max_hp - 200 || parent.character.hp < 50))
                    || (useHpPot.name == "hpot1" && (parent.character.hp <= parent.character.max_hp - 400 || parent.character.hp < 50)))) {
                use_skill("use_hp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            } else if (mpRatio != 1
                && (!useMpPot
                    || (useMpPot.name == "mpot0" && (parent.character.mp <= parent.character.max_mp - 300 || parent.character.mp < 50))
                    || (useMpPot.name == "mpot1" && (parent.character.mp <= parent.character.max_mp - 500 || parent.character.mp < 50)))) {
                use_skill("use_mp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            } else if (hpRatio < mpRatio) {
                use_skill("regen_hp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            } else if (mpRatio < hpRatio) {
                use_skill("regen_mp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.healLoop() }, getCooldownMS("use_hp"))
    }

    async lootLoop() {
        try {
            let limit = 10
            for (const chestID in parent.chests) {
                loot(chestID)
                if (--limit < 0) {
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.lootLoop() }, TIMEOUT)
    }

    async moveLoop() {
        try {
            if (!smart.moving) {
                let closestDistance = Number.MAX_VALUE
                let closest
                for (const entityId in parent.entities) {
                    const entity = parent.entities[entityId]
                    if (!entity.mtype) continue
                    if (entity.mtype != this.mainTarget) continue
                    const d = distance(parent.character, entity)
                    if (d < closestDistance) {
                        closestDistance = d
                        closest = entity
                    }
                }

                if (!closest) {
                    smart_move(this.mainTarget)
                } else if (closestDistance > parent.character.range) {
                    xmove(closest.real_x, closest.real_y)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.moveLoop() }, TIMEOUT)
    }

    async pontyLoop() {
        try {
            let foundPonty = false
            for (const npc of parent.npcs) {
                if (npc.id == "secondhands" && distance(parent.character, {
                    x: npc.position[0],
                    y: npc.position[1]
                }) < 350) {
                    foundPonty = true
                    break
                }
            }
            if (!foundPonty) {
                // We're not near Ponty, so don't buy from him.
                setTimeout(() => { this.pontyLoop() }, 250)
                return
            }

            // Set up the handler
            const goodItems: ItemName[] = ["crossbow", "t3bow", "quiver", "t2quiver", "xhelmet", "xpants", "xgloves", "xarmor", "xboots"]
            parent.socket.once("secondhands", (data: ItemInfo[]) => {
                for (const item of data) {
                    if (goodItems.includes(item.name)) {
                        parent.socket.emit("sbuy", { "rid": item.rid })
                    }
                }
            })

            // Attempt to buy stuff
            parent.socket.emit("secondhands")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.pontyLoop() }, 10000)
    }

    async sellLoop() {
        try {
            const items = getInventory()
            for (const item of items) {
                const gInfo = G.items[item.name]

                // Sell all materials
                if (gInfo.type == "material") {
                    sell(item.index, item.q)
                    continue
                }

                if (gInfo.type == "weapon" && gInfo.wtype != "bow" && gInfo.wtype != "crossbow") {
                    // Sell all weapons that aren't bows
                    sell(item.index)
                } else if (gInfo.type == "cosmetics" || gInfo.type == "jar" || gInfo.type == "key" || gInfo.type == "petlicence" || gInfo.type == "qubics" || gInfo.type == "shield" || gInfo.type == "source" || gInfo.type == "token") {
                    // Sell unusable items
                    sell(item.index)
                } else if (gInfo.e > 1) {
                    // Sell things that we need to exchange more than one of
                    sell(item.index)
                } else if (gInfo.type == "pscroll" && item.name != "dexscroll") {
                    // Sell scrolls that are not dex scrolls
                    sell(item.index)
                } else if (item.name == "offering" || item.name == "mpot0" || item.name == "hpot0") {
                    // Sell specific items
                    sell(item.index)
                } else if (gInfo.type == "gem" && !gInfo.e) {
                    // Sell unexchangable gems
                    sell(item.index)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.sellLoop() }, TIMEOUT)
    }

    // TODO: Upgrade all stat items with dex scrolls first
    async upgradeLoop() {
        try {
            if (parent.character.q.upgrade // Already upgrading something
                || parent.character.map == "bank") { // We can't do things in the bank
                setTimeout(async () => { this.upgradeLoop() }, TIMEOUT)
                return
            }

            let lowestLevel = Number.MAX_VALUE
            let lowestLevelItem: InventoryItemInfo
            const items = getInventory()
            for (const item of items) {
                const gInfo = G.items[item.name]
                if (!gInfo.upgrade) continue
                if (item.level < lowestLevel) {
                    lowestLevel = item.level
                    lowestLevelItem = item
                }
                if (lowestLevel == 0) break
            }

            if (lowestLevelItem) {
                if (G.items[lowestLevelItem.name].upgrade.stat && (!lowestLevelItem.stat_type || lowestLevelItem.stat_type != "dex")) {
                    // Upgrade with stat
                    const scroll = findItem("dexscroll")
                    if (scroll) upgrade(lowestLevelItem.index, scroll.index)
                } else {
                    // Upgrade with level up scroll
                    const scroll = findItem("scroll2")
                    if (scroll) upgrade(lowestLevelItem.index, scroll.index)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.upgradeLoop() }, TIMEOUT)
    }
}

const hardcore = new Hardcore()
export { hardcore }