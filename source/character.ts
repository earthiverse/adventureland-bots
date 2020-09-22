import FastPriorityQueue from "fastpriorityqueue"
import { Entity, IPosition, ItemName, ItemInfo, SlotType, MonsterName, PositionReal, NPCName, SkillName, CharacterEntity, CharacterType, TradeSlotType } from "./definitions/adventureland"
import { findItems, getInventory, getRandomMonsterSpawn, getCooldownMS, isAvailable, calculateDamageRange, isInventoryFull, getPartyMemberTypes, getVisibleMonsterTypes, getEntities } from "./functions"
import { TargetPriorityList, InventoryItemInfo, ItemLevelInfo, PriorityEntity, MovementTarget, PartyInfo, PlayersInfo, NPCInfo, MonstersInfo } from "./definitions/bots"
import { dismantleItems, buyPots } from "./trade"
// import { AStarSmartMove } from "./astarsmartmove"
import { getPartyInfo, setPartyInfo, getPlayersInfo, setPlayersInfo, getNPCInfo, setNPCInfo, getMonstersInfo, setMonstersInfo } from "./info"
import { NGraphMove } from "./ngraphmove"

export abstract class Character {
    /** A list of monsters, priorities, and locations to farm. */
    public abstract targetPriority: TargetPriorityList

    /** The default target if there's nothing else to attack */
    protected abstract mainTarget: MonsterName

    // protected astar = new AStarSmartMove()
    protected nGraphMove: NGraphMove

    protected itemsToKeep: ItemName[] = [
        // General
        "computer", "tracker",
        // Boosters
        "goldbooster", "luckbooster", "xpbooster",
        // Healing
        "hpot1", "mpot1",
        // Consumables
        /* "candypop", "hotchocolate", */
        // Orbs
        "jacko", "lantern", "orbg", "test_orb"
    ]
    protected itemsToSell: ItemLevelInfo = {
        // Default clothing
        "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2
    }
    protected itemsToDismantle: ItemLevelInfo = {
    }
    protected itemsToExchange: Set<ItemName> = new Set([
        // General exchangables
        "5bucks", "gem0", "gem1",
        // Seashells for potions
        "seashell",
        // Leather for capes
        "leather",
        // Christmas
        "candycane", "mistletoe", "ornament",
        // Halloween
        "candy0", "candy1",
        // Chinese New Year's
        "redenvelopev3",
        // Easter
        "basketofeggs",
        // Boxes
        "armorbox", "bugbountybox", "gift0", "gift1", "mysterybox", "weaponbox", "xbox"
    ])
    protected itemsToBuy: Set<ItemName> = new Set([
        // Exchangables
        ...this.itemsToExchange,
        // Belts
        "dexbelt", "intbelt", "strbelt",
        // Rings
        "ctristone", "dexring", "intring", "ringofluck", "strring", "suckerpunch", "tristone",
        // Earrings
        "dexearring", "intearring", "lostearring", "strearring",
        // Amulets
        "amuletofm", "dexamulet", "intamulet", "snring", "stramulet", "t2dexamulet", "t2intamulet", "t2stramulet",
        // Orbs
        "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull",
        // Shields
        "t2quiver", "lantern", "mshield", "quiver", "sshield", "xshield",
        // Capes
        "angelwings", "bcape", "cape", "ecape", "stealthcape",
        // Shoes
        "eslippers", "hboots", "mrnboots", "mwboots", "shoes1", "wingedboots", "wshoes", "xboots",
        // Pants
        "hpants", "mrnpants", "mwpants", "pants1", "starkillers", "wbreeches", "xpants",
        // Armor
        "cdragon", "coat1", "harmor", "mcape", "mrnarmor", "mwarmor", "tshirt0", "tshirt1", "tshirt2", "tshirt3", "tshirt4", "tshirt6", "tshirt7", "tshirt8", "tshirt88", "tshirt9", "warpvest", "wattire", "xarmor",
        // Helmets
        "eears", "fury", "helmet1", "hhelmet", "mrnhat", "mwhelmet", "partyhat", "rednose", "wcap", "xhelmet",
        // Gloves
        "gloves1", "goldenpowerglove", "handofmidas", "hgloves", "mrngloves", "mwgloves", "poker", "powerglove", "wgloves", "xgloves",
        // Good weapons
        "basher", "bataxe", "bowofthedead", "candycanesword", "carrotsword", "crossbow", "dartgun", "firebow", "frostbow", "froststaff", "gbow", "harbringer", "hbow", "merry", "oozingterror", "ornamentstaff", "pmace", "t2bow", "t3bow", "wblade",
        // Things we can exchange / craft with
        "ascale", "bfur", "cscale", "electronics", "feather0", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", "networkcard", "platinumingot", "platinumnugget", "pleather", "snakefang",
        // Things to make xbox
        "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
        // Things to make easter basket
        "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
        // Essences
        "essenceofether", "essenceoffire", "essenceoffrost", "essenceoflife", "essenceofnature",
        // Potions & consumables
        "bunnyelixir", "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate",
        // High level scrolls
        "cscroll3", "scroll3", "scroll4", "forscroll", "luckscroll", "manastealscroll",
        // Misc. Things
        "bottleofxp", "bugbountybox", "computer", "monstertoken", "poison", "snakeoil"
    ])

    /** Set to true to stop movement */
    public holdPosition = false

    /** Set to true to stop attacks. We might still attack if the target is attacking us. */
    public holdAttack = false

    public movementTarget: MovementTarget

    protected async mainLoop(): Promise<void> {
        try {
            if (parent.character.ctype != "merchant") {
                this.equipBetterItems()
                this.getMonsterhuntQuest()
                await buyPots()
            }

            if (!parent.party_list.includes(parent.character.id) && parent.character.id !== "earthiverse") {
                send_party_request("earthiverse")
            }

            this.getNewYearTreeBuff()
            dismantleItems(this.itemsToDismantle)

            // Elixir check
            if (parent.character.slots.elixir == null) {
                const items = findItems("candypop")
                if (items.length) {
                    equip(items[0].index)
                }
            }

            // Merchant giveaway check
            for (const entity of getEntities({ isCtype: "merchant", isWithinDistance: 400 })) {
                for (const slot in entity.slots) {
                    const info = entity.slots[slot as TradeSlotType]
                    if (!info) continue // Empty slot
                    if (!info.giveaway) continue // Not a giveaway
                    if (info.list.includes(parent.character.id)) continue // We haven't joined the giveaway yet
                    parent.socket.emit("join_giveaway", { slot: slot, id: entity.id, rid: info.rid })
                }
            }

            // Things for sale check
            for (const entity of getEntities({ isCtype: "merchant", isWithinDistance: 400 })) {
                for (const slot in entity.slots) {
                    const info = entity.slots[slot as TradeSlotType]
                    if (!info) continue // Empty slot
                    if (info.giveaway) continue // It's a giveaway, it's not for sale
                    if (info.b) continue // Item isn't for sale, they're buying it
                    if (!info.rid) continue // Item isn't for sale
                    if (!this.itemsToBuy.has(info.name)) continue // We don't want to buy it
                    if (info.price > G.items[info.name].g * 2) continue // We don't want to automatically buy things that are really expensive
                    if (parent.character.gold < info.price) continue // We don't have enough money
                    if (info.q) {
                        // They're stackable, buy as many as we can
                        const quantityToBuy = Math.min(info.q, Math.trunc(parent.character.gold / info.price))
                        parent.socket.emit("trade_buy", { slot: slot, id: entity.id, rid: info.rid, q: quantityToBuy })
                    } else {
                        // They're not stackable, buy the one
                        parent.socket.emit("trade_buy", { slot: slot, id: entity.id, rid: info.rid, q: 1 })
                    }
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.mainLoop() }, Math.max(250, parent.character.ping))
    }

    public async run(): Promise<void> {
        this.lootLoop()
        await this.infoSetup()
        this.infoLoop()
        this.healLoop()
        this.scareLoop()
        await this.moveSetup()
        this.moveLoop()
        this.mainLoop()
        this.attackLoop()
    }

    protected async lootLoop(): Promise<void> {
        try {
            const party: PartyInfo = getPartyInfo()

            for (const chestID in parent.chests) {
                const data = parent.chests[chestID]

                if (distance(parent.character, data) > 800) continue // Chests over a 800 radius have a penalty as per @Wizard in #feedback (Discord) on 11/26/2019

                let shouldLoot = true
                for (const id of parent.party_list) {
                    if (id == parent.character.id) continue // Skip ourself

                    const partyMember = parent.entities[id]
                    if (!partyMember) continue
                    if (distance(partyMember, data) > 800) continue
                    if (!party[id]) continue

                    if (["chest3", "chest4"].includes(data.skin)) {
                        if (parent.character.goldm >= party[id].goldm) continue
                    } else {
                        if (parent.character.luckm >= party[id].luckm) continue
                    }

                    shouldLoot = false
                    break
                }

                if (shouldLoot) {
                    parent.socket.emit("open_chest", { id: chestID })
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { this.lootLoop() }, Math.min(...parent.pings) * 2)
    }

    protected async infoSetup(): Promise<void> {
        // Setup death timers for special monsters
        game.on("hit", (data: { target: string, kill?: boolean }) => {
            if (!data.kill) return // We only care if the entity dies
            const entity = parent.entities[data.target]

            if (entity && entity.mtype
                && ["fvampire", "greenjr", "jr", "mvampire"].includes(entity.mtype)
                && G.monsters[entity.mtype].respawn && G.monsters[entity.mtype].respawn > 0) {
                // For >200 second respawn monsters, the variance is from 0.6 to 2.2 of their base time
                // https://discordapp.com/channels/238332476743745536/238332476743745536/729997473484898327
                const wait = (G.monsters[entity.mtype].respawn * 2.2) * 1000

                // DEBUG
                console.info(`Setting respawn timer for ${entity.mtype} for ${wait}ms`)

                setTimeout(async () => {
                    // Create a fake entity to appear when the respawn is up
                    const info = getMonstersInfo()
                    info[entity.mtype] = {
                        id: "-1",
                        lastSeen: new Date(),
                        map: entity.map,
                        x: entity.real_x,
                        y: entity.real_y
                    }
                    setMonstersInfo(info)
                }, wait)
            }
        })
    }

    /**
     * Stores information
     */
    protected async infoLoop(): Promise<void> {
        // Add info about ourselves
        const party: PartyInfo = getPartyInfo()
        party[parent.character.name] = {
            "lastSeen": new Date(),
            "shouldSwitchServer": this.shouldSwitchServer(),
            "monsterHuntTargets": this.getMonsterHuntTargets(),
            "items": getInventory(),
            "attack": parent.character.attack,
            "frequency": parent.character.frequency,
            "goldm": parent.character.goldm,
            "last_ms": parent.character.last_ms,
            "luckm": parent.character.luckm,
            "map": parent.character.map,
            "x": parent.character.real_x,
            "y": parent.character.real_y,
            "s": parent.character.s
        }
        setPartyInfo(party)

        // Add info about other players we see
        const players: PlayersInfo = getPlayersInfo()
        let changed = false
        for (const player of getEntities({ isPlayer: true, isPartyMember: false }) as CharacterEntity[]) {
            players[player.id] = {
                "lastSeen": new Date(),
                "rip": player.rip,
                "map": player.map,
                "x": player.real_x,
                "y": player.real_y,
                "s": player.s,
                "ctype": player.ctype
            }
            changed = true
        }
        if (changed) setPlayersInfo(players)

        // Add info about NPCs
        const npcs: NPCInfo = getNPCInfo()
        changed = false
        for (const npc of ["Angel", "Kane"] as NPCName[]) {
            if (!parent.entities[npc]) continue
            npcs[npc] = {
                "lastSeen": new Date(),
                "map": parent.entities[npc].map,
                "x": parent.entities[npc].real_x,
                "y": parent.entities[npc].real_y
            }
            changed = true
        }
        if (changed) setNPCInfo(npcs)

        // Add info about Monsters
        const monsters = getMonstersInfo()
        changed = false
        for (const entity of getEntities({ isMonster: true, isRIP: false })) {
            if (!(["fvampire", "goldenbat", "greenjr", "jr", "mvampire", "phoenix", "pinkgoo", "snowman", "tinyp", "wabbit"]).includes(entity.mtype)) continue
            monsters[entity.mtype] = {
                "lastSeen": new Date(),
                "id": entity.id,
                "x": entity.real_x,
                "y": entity.real_y,
                "map": entity.map
            }
            changed = true
        }
        if (changed) setMonstersInfo(monsters)

        setTimeout(async () => { this.infoLoop() }, 2000)
    }

    public getMonsterHuntTargets(): MonsterName[] {
        const hunts: {
            target: MonsterName
            priority: number
            timeLeft: number
        }[] = []

        const party: PartyInfo = getPartyInfo()
        for (const memberName of parent.party_list.length > 0 ? parent.party_list : [parent.character.id]) {
            // NOTE: TODO: Gonna check if not checking parent.entities improves the lagginess when we are between monster hunts.
            // const member = parent.entities[memberName] ? parent.entities[memberName] : this.info.party[memberName]
            const member = party[memberName]
            if (!member) continue // No information yet
            if (!member.s.monsterhunt || member.s.monsterhunt.c == 0) continue // Character doesn't have a monster hunt, or it's (almost) finished
            const target = member.s.monsterhunt.id
            if (!this.targetPriority[target]) continue // Not in our target priority

            // Check if we can co-op
            const coop = this.targetPriority[target].coop
            if (coop) {
                const availableTypes = getPartyMemberTypes()
                const missingTypes = coop.filter(x => !availableTypes.has(x))
                if (missingTypes.length) continue
            }

            let priority = 0
            if (["fvampire", "goldenbat", "greenjr", "jr", "mvampire", "phoenix", "pinkgoo", "snowman", "tinyp", "wabbit"].includes(target)) {
                priority = 1
            }

            const timeLeft = member.s.monsterhunt.ms - (Date.now() - member.last_ms.getTime())

            hunts.push({
                target: target,
                priority: priority,
                timeLeft: timeLeft,
            })
        }

        hunts.sort((a, b) => {
            // 1. Priority
            if (a.priority !== b.priority) return b.priority - a.priority

            // 2. Time left
            return a.timeLeft - b.timeLeft
        })

        return hunts.reduce((a, v) => {
            a.push(v.target)
            return a
        }, [])
    }

    public shouldSwitchServer(): boolean {
        if (parent.character.ctype == "merchant") return true // Merchants don't get to decide

        if (!parent.character.s.monsterhunt) return false // We don't have a monster hunt
        if (parent.character.s.monsterhunt.c == 0) return false // We have a monster hunt to turn in
        if (this.getMonsterHuntTargets().length) return false // There's a monster hunt we could do

        // Doable event monster
        for (const monster in parent.S) {
            if (monster == "grinch") continue // The grinch is too strong.
            if (parent.S[monster as MonsterName].hp / parent.S[monster as MonsterName].max_hp > 0.9) continue // Still at a high HP
            if (!parent.S[monster as MonsterName].live) continue
            if (this.targetPriority[monster as MonsterName]) return false // We can do an event monster!
        }

        // // +1000% luck and gold
        // let kane = parent.entities["Kane"] ? parent.entities["Kane"] : this.info.npcs.Kane
        // let angel = parent.entities["Angel"] ? parent.entities["Angel"] : this.info.npcs.Angel
        // if (kane && angel && distance(kane, angel) < 300) {
        //     let kaneSpawns = getNearbyMonsterSpawns(kane, 300);
        //     let angelSpawns = getNearbyMonsterSpawns(angel, 300);

        //     for (let kSpawn of kaneSpawns) {
        //         for (let aSpawn of angelSpawns) {
        //             if (kSpawn.x == aSpawn.x && kSpawn.y == aSpawn.y) {
        //                 // We can stack +1000% luck and gold.
        //                 return false;
        //             }
        //         }
        //     }
        // }

        return true
    }

    protected async attackLoop(): Promise<void> {
        try {
            const targets = this.getTargets(1)
            if (targets.length && this.wantToAttack(targets[0])) {
                await attack(targets[0])
                reduce_cooldown("attack", Math.min(...parent.pings))
            }
        } catch (error) {
            if (error.reason == "cooldown") {
                setTimeout(async () => { this.attackLoop() }, Math.min(...parent.pings) - error.remaining)
                return
            } else if (!["not_found", "disabled"].includes(error.reason)) {
                console.error(error)
            }
            setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack"))
            return
        }
        setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack", true))
    }

    protected async scareLoop(): Promise<void> {
        try {
            const targets = getEntities({ isAttackingUs: true, isMonster: true, isRIP: false })
            let wantToScare = false
            if (targets.length >= 3) {
                // We have 3 or more monsters attacking us
                wantToScare = true
            } else if (targets.length && parent.character.s.burned) {
                // Scare monsters away if we are burned
                wantToScare = true
            } else if (targets.length && !this.targetPriority[targets[0].mtype]) {
                // A monster we don't want to attack is targeting us
                wantToScare = true
            } else if (parent.character.c.town // We're teleporting to town (attacks will disrupt it)
                && (targets.length > 1 // We have things attacking us
                    || (targets.length == 1
                        && distance(targets[0], parent.character) - targets[0].range - (targets[0].speed * 2) /* The enemy can move to attack us before we can teleport away */))) {
                wantToScare = true
            } else {
                for (const target of targets) {
                    if (distance(target, parent.character) > target.range) continue // They're out of range
                    if (calculateDamageRange(target, parent.character)[1] * 6 * target.frequency <= parent.character.hp) continue // We can tank a few of their shots

                    wantToScare = true
                    break
                }
                if (targets.length > 1) {
                    for (const target of targets) {
                        if (this.targetPriority[target.mtype].attackOnlySingleTarget) {
                            // We have more than one target, but we have a monster we only want to attack as a single target
                            wantToScare = true
                            break
                        }
                    }
                }
            }

            if (wantToScare) {
                if (parent.character.slots.orb.name !== "jacko") {
                    // Equip the orb, then scare
                    const jackos = findItems("jacko")
                    if (jackos.length) {
                        equip(jackos[0].index) // Equip the jacko
                        await use_skill("scare") // Scare the monsters away
                        reduce_cooldown("scare", Math.min(...parent.pings))
                    }
                } else if (isAvailable("scare")) {
                    await use_skill("scare")
                    reduce_cooldown("scare", Math.min(...parent.pings))
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.scareLoop() }, getCooldownMS("scare"))
    }

    protected getMovementLocation(mtype: MonsterName): PositionReal {
        if (!this.targetPriority[mtype]) return // Not a target we want to move to
        if (this.targetPriority[mtype].farmingPosition && this.targetPriority[mtype].holdPositionFarm) return this.targetPriority[mtype].farmingPosition // We have a specific position to farm these monsters
        if (getVisibleMonsterTypes().has(mtype)) return // There's one nearby, we don't need to move
        if (this.targetPriority[mtype].farmingPosition) {
            if (distance(parent.character, this.targetPriority[mtype].farmingPosition) < parent.character.range) {
                return // We're nearby killing other things while we wait for whatever it is to respawn
            } else {
                return this.targetPriority[mtype].farmingPosition // We're not nearby, let's go to the farming position
            }
        }
        if (parent.S[mtype]) {
            if (!parent.S[mtype].live) return // Not live
            return parent.S[mtype] // Special monster
        }

        const randomSpawn = getRandomMonsterSpawn(mtype)
        if (randomSpawn) return randomSpawn
    }

    protected getMovementTarget(): MovementTarget {
        if (parent.character.rip) {
            set_message("RIP")
            return
        }

        //// Movement targets
        // Finish Monster Hunt -- Visit the monsterhunter and turn it in
        if (parent.character.s.monsterhunt && parent.character.s.monsterhunt.c == 0) {
            set_message("Finish MH")
            return { target: "monsterhunter", position: G.maps.main.ref.monsterhunter, range: 300 }
        }

        // Rare Monsters -- Move to monster
        for (const entity of getEntities({ isMonster: true, isRIP: false })) {
            if (!["fvampire", "goldenbat", "greenjr", "jr", "mvampire", "phoenix", "pinkgoo", "snowman", "tinyp", "wabbit"].includes(entity.mtype)) continue
            if (!this.targetPriority[entity.mtype]) continue // Not a target
            set_message(entity.mtype)
            return { target: entity.mtype, position: entity, range: parent.character.range }
        }

        // Special Monsters -- Move to monster
        const party = getPartyInfo()
        const monsters = getMonstersInfo()
        for (const mtype in monsters) {
            if (!this.targetPriority[mtype as MonsterName]) continue // Not a target we can do

            const info = monsters[mtype as MonsterName]

            const coop = this.targetPriority[mtype as MonsterName].coop
            if (coop) {
                // Check if other members are available to fight it
                const memberTypes = getPartyMemberTypes()
                const notReady = coop.filter(x => !memberTypes.has(x))
                if (notReady.length > 0) {
                    continue // We don't have everyone we need to fight, so we're not going to fight it.
                }
            }

            // Update info if we can see it
            const entityInfo = parent.entities[info.id]
            if (entityInfo) {
                info.x = entityInfo.real_x
                info.y = entityInfo.real_y
            }

            if (distance(parent.character, info) < parent.character.range * 2 && !entityInfo) {
                // We got close to it, but we can't see it...
                delete monsters[mtype as MonsterName]
                setMonstersInfo(monsters)
            } else {
                set_message(`SP ${mtype}`)
                if (this.targetPriority[mtype as MonsterName].farmingPosition && this.targetPriority[mtype as MonsterName].holdPositionFarm) {
                    return { target: mtype as MonsterName, position: this.targetPriority[mtype as MonsterName].farmingPosition, range: parent.character.range }
                } else {
                    return { target: mtype as MonsterName, position: info, range: parent.character.range }
                }
            }
        }

        // Christmas Tree Bonus -- Visit the tree if it's up and we don't have it
        if (G.maps.main.ref.newyear_tree && !parent.character.s.holidayspirit) {
            set_message("Xmas Tree")
            return { target: "newyear_tree", position: G.maps.main.ref.newyear_tree, range: 300 }
        }

        // Full Inventory -- Dump on merchant
        if (isInventoryFull()) {
            set_message("Full!")
            return { target: "merchant", position: { map: "main", "x": 60, "y": -325 }, range: 300 }
        }

        // Event Monsters -- Move to monster
        for (const mtype in parent.S) {
            if (!parent.S[mtype as MonsterName].live) continue // Not alive
            if (!this.targetPriority[mtype as MonsterName]) continue // Not a target
            set_message(mtype)
            return { target: mtype as MonsterName, position: parent.S[mtype as MonsterName], range: parent.character.range }
        }

        // Monster Hunts -- Move to monster
        const monsterHuntTargets: MonsterName[] = this.getMonsterHuntTargets()
        for (const potentialTarget of monsterHuntTargets) {
            const coop = this.targetPriority[potentialTarget].coop
            if (coop) {
                // Check if other members are fighting it, too
                const readyMembers = new Set<CharacterType>()
                for (const memberName of parent.party_list) {
                    if (!party[memberName] || !party[memberName].monsterHuntTargets) continue
                    if (party[memberName].monsterHuntTargets[0] != potentialTarget) continue

                    readyMembers.add(parent.party[memberName].type)
                }
                const notReady = coop.filter(x => !readyMembers.has(x))
                if (notReady.length == 0) {
                    set_message(`MH ${potentialTarget}`)
                    return { target: potentialTarget, position: this.getMovementLocation(potentialTarget) }
                }
            } else {
                set_message(`MH ${potentialTarget}`)
                return { target: potentialTarget, position: this.getMovementLocation(potentialTarget) }
            }
        }

        const nodes = []
        this.nGraphMove.graph.forEachNode((node) => {
            nodes.push(node.id, node.data)
        })

        // Monster Hunts -- New monster hunt
        if (!parent.character.s.monsterhunt) {
            set_message("New MH")
            return { target: "monsterhunter", position: G.maps.main.ref.monsterhunter, range: 300 }
        }

        // TODO: Kane and Angel

        if (this.mainTarget) {
            set_message(this.mainTarget)
            return { target: this.mainTarget, position: this.getMovementLocation(this.mainTarget) }
        }
    }

    protected async moveSetup(): Promise<void> {
        try {
            // Prepare the pathfinder
            const before = Date.now()
            this.nGraphMove = await NGraphMove.getInstance()
            console.info(`Took ${Date.now() - before}ms to prepare pathfinding.`)

            // Event to scramble characters if we take stacked damage
            character.on("stacked", () => {
                // DEBUG
                console.info(`Scrambling ${parent.character.id} because we're stacked!`)

                const x = -25 + Math.round(50 * Math.random())
                const y = -25 + Math.round(50 * Math.random())
                move(parent.character.real_x + x, parent.character.real_y + y)
            })
        } catch (e) {
            console.error(e)
        }
    }

    protected moveLoop(): void {
        try {
            if (this.holdPosition || smart.moving) {
                setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                return
            }

            // Move to our target (this is to get us in the general vicinity, we will do finer movements within that later)
            const lastMovementTarget = this.movementTarget
            this.movementTarget = this.getMovementTarget()
            if (this.movementTarget && this.movementTarget.position) {
                if (!lastMovementTarget
                    || this.movementTarget.target != lastMovementTarget.target) {
                    // New movement target
                    // this.astar.stop()
                    this.nGraphMove.stop()
                    // this.astar.smartMove(this.movementTarget.position, this.movementTarget.range)
                    this.nGraphMove.move(this.movementTarget.position, this.movementTarget.range)
                    setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                    return
                }

                // if (!this.astar.isMoving()) {
                if (!this.nGraphMove.isMoving()) {
                    // Same monster, new movement target
                    // this.astar.smartMove(this.movementTarget.position, this.movementTarget.range)
                    this.nGraphMove.move(this.movementTarget.position, this.movementTarget.range)
                    setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                    return
                }
            }

            // Stop on sight
            const targets = this.getTargets(1)
            if (targets.length
                && targets[0].mtype == this.movementTarget.target
                && this.targetPriority[targets[0].mtype] && !this.targetPriority[targets[0].mtype].holdPositionFarm) {
                // this.astar.stop()
                this.nGraphMove.stop()
            }
            const targeted = get_targeted_monster()
            if (targeted && targeted.rip) {
                change_target(null, true)
                // this.astar.stop()
                this.nGraphMove.stop()
            }

            // Don't do anything if we're moving around
            // if (this.astar.isMoving()) {
            if (this.nGraphMove.isMoving()) {
                // TODO: DEBUG -- We get stuck a lot lately, so we'll just stop the nGraphMove every 60s, since restarting movement is really fast anyways...
                if (Date.now() - this.nGraphMove.searchStartTime > 60000) {
                    this.nGraphMove.stop()
                }
                setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                return
            }

            // Don't do anything if we're holding position for this monster
            if (this.targetPriority[this.movementTarget.target as MonsterName] && this.targetPriority[this.movementTarget.target as MonsterName].holdPositionFarm) {
                setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                return
            }

            // const monsterTypes = Object.keys(this.targetPriority) as MonsterType[]
            // const inEnemyAttackRange2 = getEntities({ isRIP: false, canAttackUsWithoutMoving: true, isMonsterType: monsterTypes })
            // const inAggroRange2 = getEntities({ isRIP: false, isWithinDistance: 50, isMonsterType: monsterTypes })
            // const inAttackRange2 = getEntities({ isRIP: false, isWithinDistance: parent.character.range, isMonsterType: monsterTypes })
            // const inAttackRangeHighPriority2 = getEntities({ isRIP: false, isWithinDistance: parent.character.range, isMonsterType: [this.movementTarget.target as MonsterType] })
            // const inExtendedAttackRange2 = getEntities({ isRIP: false, isWithinDistance: parent.character.range * 2, isMonsterType: monsterTypes })
            // const inExtendedAttackRangeHighPriority2 = getEntities({ isRIP: false, isWithinDistance: parent.character.range * 2, isMonsterType: [this.movementTarget.target as MonsterType] })
            // const visible2 = getEntities({ isRIP: false, isMonsterType: monsterTypes })
            // const visibleHighPriority2 = getEntities({ isRIP: false, isMonsterType: [this.movementTarget.target as MonsterType] })

            // Get all enemies
            const inEnemyAttackRange: Entity[] = []
            const inAggroRange: Entity[] = []
            const inAttackRange: Entity[] = []
            const inAttackRangeHighPriority: PositionReal[] = []
            const inExtendedAttackRange: PositionReal[] = []
            const inExtendedAttackRangeHighPriority: PositionReal[] = []
            const visible: PositionReal[] = []
            const visibleHighPriority: PositionReal[] = []
            for (const id in parent.entities) {
                const entity = parent.entities[id]
                if (entity.rip) continue // It's dead
                if (!this.targetPriority[entity.mtype]) continue // It's not on our target list
                const d = distance(parent.character, entity)
                const enemyRange = Math.max(entity.range + entity.speed, 50)

                if (enemyRange < parent.character.range // Enemy range is less than our range
                    && d < enemyRange // We are within the enemy range
                ) {
                    if (entity.hp > calculateDamageRange(parent.character, entity)[0] || this.targetPriority[entity.mtype].holdAttackInEntityRange || entity.target == parent.character.name) {
                        inEnemyAttackRange.push(entity) // We can run away from it
                    }
                }

                if (!entity.target && d < 50) {
                    inAggroRange.push(entity)
                }

                if (d < parent.character.range) {
                    inAttackRange.push(entity) // We don't have to move to attack these targets
                    if (this.movementTarget.target == entity.mtype) inAttackRangeHighPriority.push(entity)
                } else if (d < parent.character.range * 2) {
                    inExtendedAttackRange.push(entity) // We can move to these targets while still attacking our current target
                    if (this.movementTarget.target == entity.mtype) inExtendedAttackRangeHighPriority.push(entity)
                }

                visible.push(entity) // We can see these targets nearby
                if (this.movementTarget.target == entity.mtype) visibleHighPriority.push(entity)
            }

            // Get out of enemy range
            if (inEnemyAttackRange.length) {
                const average: IPosition = {
                    x: 0,
                    y: 0
                }
                let maxRange = 0
                for (const v of inEnemyAttackRange) {
                    average.x += v.real_x
                    average.y += v.real_y
                    if (v.range + v.speed > maxRange) {
                        maxRange = v.range + v.speed
                    }
                }
                average.x /= inEnemyAttackRange.length
                average.y /= inEnemyAttackRange.length

                const angle: number = Math.atan2(parent.character.real_y - average.y, parent.character.real_x - average.x)
                const moveDistance: number = Math.min(parent.character.range, maxRange * 1.5)
                const calculateEscape = (angle: number, moveDistance: number): IPosition => {
                    const x = Math.cos(angle) * moveDistance
                    const y = Math.sin(angle) * moveDistance
                    return { x: parent.character.real_x + x, y: parent.character.real_y + y }
                }
                let escapePosition = calculateEscape(angle, moveDistance)
                let angleChange = 0
                //while (!this.nGraphMove.canMove({ map: parent.character.map, x: parent.character.real_x, y: parent.character.real_y }, { map: parent.character.map, x: escapePosition.x, y: escapePosition.y }) && angleChange < 180) {
                while (!can_move_to(escapePosition.x, escapePosition.y) && angleChange < 180) {
                    if (angleChange <= 0) {
                        angleChange = (-angleChange) + 1
                    } else {
                        angleChange = -angleChange
                    }
                    escapePosition = calculateEscape(angle + (angleChange * Math.PI / 180), moveDistance)
                }

                move(escapePosition.x, escapePosition.y)
                setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                return
            }

            // TODO: 2. move out of the way of enemies in aggro range ()

            // 3. Don't move if there's a monster we can attack from our current position
            if (inAttackRangeHighPriority.length) {
                setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                return
            }

            // TODO: 4. Optimize movement. Start moving towards a 2nd monster while we are killing the 1st monster.

            // 5. Move to our target monster
            if (visibleHighPriority.length) {
                let closest: PositionReal
                let d = Number.MAX_VALUE
                for (const v of visibleHighPriority) {
                    const vD = distance(parent.character, v)
                    if (vD < d) {
                        d = vD
                        closest = v
                    }
                }
                // this.astar.smartMove(closest, parent.character.range)
                this.nGraphMove.move(closest, parent.character.range)
                setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                return
            }

            // 6. Move to any monster
            if (visible.length) {
                let closest: PositionReal
                let d = Number.MAX_VALUE
                for (const v of visible) {
                    const vD = distance(parent.character, v)
                    if (vD < d) {
                        d = vD
                        closest = v
                    }
                }
                // this.astar.smartMove(closest, parent.character.range)
                this.nGraphMove.move(closest, parent.character.range)
                setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
                return
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.moveLoop() }, Math.max(400, parent.character.ping))
    }

    protected async healLoop(): Promise<void> {
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
                await use_skill("use_hp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            } else if (mpRatio != 1
                && (!useMpPot
                    || (useMpPot.name == "mpot0" && (parent.character.mp <= parent.character.max_mp - 300 || parent.character.mp < 50))
                    || (useMpPot.name == "mpot1" && (parent.character.mp <= parent.character.max_mp - 500 || parent.character.mp < 50)))) {
                await use_skill("use_mp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            } else if (hpRatio < mpRatio) {
                await use_skill("regen_hp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            } else if (mpRatio < hpRatio) {
                await use_skill("regen_mp")
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.healLoop() }, getCooldownMS("use_hp"))
    }


    public getNewYearTreeBuff(): void {
        if (!G.maps.main.ref.newyear_tree) return // Event is not live.
        if (parent.character.s.holidayspirit) return // We already have the buff.
        if (distance(parent.character, G.maps.main.ref.newyear_tree) > 400) return // Too far away

        parent.socket.emit("interaction", { type: "newyear_tree" })
    }

    public getMonsterhuntQuest(): void {
        if (distance(parent.character, G.maps.main.ref.monsterhunter) > 400) return // Too far away
        if (!parent.character.s.monsterhunt) {
            // No quest, get a new one
            parent.socket.emit("monsterhunt")
        } else if (parent.character.s.monsterhunt.c == 0) {
            // We've finished a quest
            parent.socket.emit("monsterhunt")
        }
    }

    public parseCM(characterName: string, data: any): void {
        if (!parent.party_list.includes(characterName) && parent.character.name != characterName
            && !["earthiverse", "earthMag", "earthMag2"].includes(characterName) /* Hardcode party members */
            && !(data.message == "monster") /* NOTE: Special code to let Aria send Phoenix position CMs to my characters */) {
            // Ignore messages from players not in our party
            game_log("Blocked CM from " + characterName)
            return
        }

        if (data.message == "info") {
            const party: PartyInfo = getPartyInfo()
            party[characterName] = data.info
            setPartyInfo(party)
        } else if (data.message == "monster") {
            /**
            let monster = get_targeted_monster()
            show_json(monster)
            send_cm("earthPri", {
                "message": "monster",
                "id": monster.mtype,
                "info": {
                    "id": monster.id,
                    "map": monster.map,
                    "x": monster.real_x,
                    "y": monster.real_y
                }
            })
             */
            const monsters = getMonstersInfo()
            monsters[data.id as MonsterName] = data.info
            setMonstersInfo(monsters)
        } else if (data.message == "npc") {
            const npcs: NPCInfo = getNPCInfo()
            npcs[data.id as NPCName] = data.info
            setNPCInfo(npcs)
        } else if (data.message == "player") {
            const players: PlayersInfo = getPlayersInfo()
            players[data.id] = data.info
            setPlayersInfo(players)
        } else if (data.message == "chests") {
            for (const chestID in data.chests) {
                if (!parent.chests[chestID]) parent.chests[chestID] = data.chests[chestID]
            }
        }
    }

    /** Looks for equipment in our inventory, and if it's more applicable to the current situation, equip it */
    public equipBetterItems(): void {
        try {
            const items = getInventory()

            // Equip the items we want for this monster
            if (this.movementTarget.target && this.targetPriority[this.movementTarget.target as MonsterName]) {
                for (const idealItem of this.targetPriority[this.movementTarget.target as MonsterName].equip || []) {
                    let hasItem = false
                    for (const slot in parent.character.slots) {
                        const slotInfo = parent.character.slots[slot as SlotType]
                        if (!slotInfo) continue
                        if (slotInfo.name == idealItem) {
                            hasItem = true
                            break
                        }
                    }
                    if (!hasItem) {
                        for (const item of items) {
                            if (item.name == idealItem) {
                                // If we're going to equip a 2 hand weapon, make sure nothing is in our offhand
                                if (G.classes[parent.character.ctype].doublehand[G.items[idealItem].wtype]) unequip("offhand")

                                equip(item.index)
                                break
                            }
                        }
                    }
                }
            }

            // Equip the most ideal items
            for (const slot in parent.character.slots) {
                let slotItem: ItemInfo = parent.character.slots[slot as SlotType]
                let betterItem: InventoryItemInfo
                if (!slotItem) continue // Nothing equipped in that slot
                for (const item of items) {
                    if (item.name != slotItem.name) continue // Not the same item
                    if (!item.level || item.level <= slotItem.level) continue // Not better than the currently equipped item

                    // We found something better
                    slotItem = item
                    betterItem = item // Overwrite the slot info, and keep looking
                }

                // Equip our better item
                if (betterItem) equip(betterItem.index, slot as SlotType)
            }
        } catch (error) {
            console.error(error)
        }
    }

    // public getMovementTarget(): { message: string; target: PositionReal } {

    //     // Move to a monster hunt
    //     if (monsterHuntTargets.length) {
    //         let potentialTarget = monsterHuntTargets[0]

    //         // Frog check, because they're super easy to complete with mages or priests
    //         if (monsterHuntTargets.includes("frog")
    //             && G.items[parent.character.slots.mainhand.name].damage == "magical"
    //             && this.targetPriority["frog"]) {
    //             potentialTarget = "frog"
    //         }

    //         this.movementTarget = potentialTarget

    //         // Check if other party members are doing it
    //         if (this.targetPriority[potentialTarget].coop) {
    //             let havePartyMembers = true
    //             for (const type of this.targetPriority[potentialTarget].coop) {
    //                 if (type == parent.character.ctype) continue // it's us!

    //                 let found = false
    //                 for (const member of parent.party_list) {
    //                     if (type == parent.party[member].type && this.info.party[member].monsterHuntTarget == potentialTarget) {
    //                         found = true
    //                         break
    //                     }
    //                 }
    //                 if (!found) {
    //                     havePartyMembers = false
    //                     break
    //                 }
    //             }

    //             if (!havePartyMembers) {
    //                 if (this.targetPriority[this.mainTarget].farmingPosition) {
    //                     return { message: this.mainTarget, target: this.targetPriority[this.mainTarget].farmingPosition }
    //                 } else {
    //                     return { message: this.mainTarget, target: getRandomMonsterSpawn(this.mainTarget) }
    //                 }
    //             }
    //         }

    //         const enemies: Entity[] = []
    //         for (const id in parent.entities) {
    //             const entity = parent.entities[id]
    //             if (entity.mtype != potentialTarget) continue
    //             if (distance(parent.character, entity) > parent.character.range) continue
    //             enemies.push(entity)
    //         }

    //         if (this.targetPriority[potentialTarget].farmingPosition && this.targetPriority[potentialTarget].holdPositionFarm) {
    //             // We want to hold position at a certain location
    //             return { message: "MH " + potentialTarget, target: this.targetPriority[potentialTarget].farmingPosition }
    //         } else if (enemies.length) {
    //             // We have an enemy in our sights
    //             return { message: "MH " + potentialTarget, target: null }
    //         } else if (this.targetPriority[potentialTarget].farmingPosition) {
    //             // We don't have an enemy, but we have a farming position we'd like to go to
    //             return { message: "MH " + potentialTarget, target: this.targetPriority[potentialTarget].farmingPosition }
    //         } else {
    //             // We don't have a farming position, go to any random spawn
    //             return { message: "MH " + potentialTarget, target: getRandomMonsterSpawn(potentialTarget) }
    //         }
    //     }


    //     // TODO: Add a check to see if we are actually near monsters with these functions.
    //     // Check if we can farm with +1000% luck (and maybe +1000% gold, too!)
    //     const kane = parent.entities.Kane ? parent.entities.Kane : this.info.npcs.Kane
    //     const angel = parent.entities.Angel ? parent.entities.Angel : this.info.npcs.Angel
    //     const targets = this.getTargets(1)
    //     if (kane && angel) {
    //         // See if they're both near a single monster spawn
    //         const kSpawns = getNearbyMonsterSpawns(kane, 250)
    //         const aSpawns = getNearbyMonsterSpawns(angel, 250)
    //         if (parent.character.s.citizen0aura && parent.character.s.citizen4aura && targets.length) {
    //             this.movementTarget = undefined
    //             return { message: "2x1000%", target: null }
    //         }
    //         for (const kSpawn of kSpawns) {
    //             if (["hen", "rooster"].includes(kSpawn.monster)) continue // Ignore chickens
    //             if (!this.targetPriority[kSpawn.monster]) continue // Ignore things not in our priority list
    //             for (const aSpawn of aSpawns) {
    //                 if (kSpawn.x == aSpawn.x && kSpawn.y == aSpawn.y) {
    //                     return { message: "2x1000%", target: kane }
    //                 }
    //             }
    //         }

    //         // See if Kane is near a monster spawn
    //         if (parent.character.s.citizen0aura && targets.length) {
    //             this.movementTarget = undefined
    //             return { message: "1000% luck", target: null }
    //         }
    //         if (kSpawns.length
    //             && !["hen", "rooster"].includes(kSpawns[0].monster) // Ignore chickens
    //             && this.targetPriority[kSpawns[0].monster]) { // Ignore things not in our priority list
    //             this.movementTarget = kSpawns[0].monster
    //             // TODO: Check for citizens aura, if we don't have it, move to the person we don't have
    //             return { message: "1000% luck", target: kane }
    //         }

    //         // See if Angel is near a monster spawn
    //         if (parent.character.s.citizen4aura && targets.length) {
    //             this.movementTarget = undefined
    //             return { message: "1000% gold", target: null }
    //         }
    //         if (aSpawns.length
    //             && !["hen", "rooster"].includes(aSpawns[0].monster) // Ignore chickens
    //             && this.targetPriority[aSpawns[0].monster]) { // Ignore things not in our priority list
    //             this.movementTarget = aSpawns[0].monster
    //             // TODO: Check for citizens aura, if we don't have it, move to the person we don't have
    //             return { message: "1000% gold", target: angel }
    //         }
    //     }

    //     // Check for our main target
    //     this.movementTarget = this.mainTarget
    //     for (const id in parent.entities) {
    //         const entity = parent.entities[id]
    //         if (entity.mtype == this.mainTarget) {
    //             // There's one nearby
    //             return { message: this.mainTarget, target: null }
    //         }
    //     }
    //     if (this.targetPriority[this.mainTarget].farmingPosition) {
    //         return { message: this.mainTarget, target: this.targetPriority[this.mainTarget].farmingPosition }
    //     } else {
    //         return { message: this.mainTarget, target: getRandomMonsterSpawn(this.mainTarget) }
    //     }

    // }

    public getTargets(numTargets = 1, distanceCheck = parent.character.range): Entity[] {
        const targets: Entity[] = []

        // Find out what targets are already claimed by our party members
        const members = parent.party_list
        const claimedTargets: Set<string> = new Set<string>()
        if (members.length > 0) {
            for (const id in parent.entities) {
                if (members.includes(id) && id !== parent.character.id) {
                    const target = parent.entities[id].target
                    if (target) claimedTargets.add(target)
                }
            }
        }

        const potentialTargets = new FastPriorityQueue<PriorityEntity>((x, y) => x.priority > y.priority)
        for (const id in parent.entities) {
            const potentialTarget = parent.entities[id]

            if (potentialTarget.rip) continue // It's dead
            if (parent.party_list.includes(id)) continue // It's a member of our party
            if (!is_pvp() && potentialTarget.type !== "monster") continue // Not interested in non-monsters unless it's PvP
            if (!this.targetPriority[potentialTarget.mtype] && potentialTarget.target !== parent.character.id) continue // Not a monster we care about, and it's not attacking us
            if (!potentialTarget.cooperative && potentialTarget.target && !(parent.party_list.includes(potentialTarget.target) || potentialTarget.target == parent.character.id)) continue // It's attacking a different player, we can't get credit for it, or loot from it
            if (this.targetPriority[potentialTarget.mtype].attackOnlyWhenAttackingTeammate && !parent.party_list.includes(potentialTarget.target)) continue

            // Set the priority based on our targetPriority
            let priority = this.targetPriority[potentialTarget.mtype] ? this.targetPriority[potentialTarget.mtype].priority : 0

            // Adjust priority based on distance
            const d = distance(parent.character, potentialTarget)
            if (d > distanceCheck) continue // It's out of range
            priority -= d

            // Adjust priority if a party member is already attacking it
            if (claimedTargets.has(id)) {
                if (this.targetPriority[potentialTarget.mtype] && this.targetPriority[potentialTarget.mtype].coop) priority += parent.character.range
                if (potentialTarget.hp <= calculateDamageRange(parent.character, potentialTarget)[0]) priority -= parent.character.range
            }

            // Adjust priority if it will burn to death
            if (potentialTarget.s && potentialTarget.s.burned) {
                // Reduce the amount of time by a bit to account for some error
                const burnTime = (potentialTarget.s.burned.ms - 500 - potentialTarget.s.burned.ms % 1000) / 1000
                const burnDamage = burnTime * potentialTarget.s.burned.intensity
                if (burnDamage > potentialTarget.hp) priority -= 5000
            }

            // Increase priority if it's our "main target"
            if (potentialTarget.mtype == this.mainTarget) priority += 250

            // Increase priority if it's our movement target
            if (this.movementTarget && potentialTarget.mtype == this.movementTarget.target) priority += 1000

            // Increase priority if the entity is targeting us
            if (potentialTarget.target == parent.character.name) priority += 2000

            // We want to target cooperative monsters to multiply the amount of loot we get, so kill the one with the lowest HP first.
            if (potentialTarget.cooperative) priority += 1000 * (potentialTarget.max_hp - potentialTarget.hp) / potentialTarget.max_hp

            const priorityEntity: PriorityEntity = { id: potentialTarget.id, priority: priority }
            potentialTargets.add(priorityEntity)
        }

        while (targets.length < numTargets && potentialTargets.size > 0) {
            const entity = parent.entities[potentialTargets.poll().id]
            if (entity) targets.push(entity)
        }
        if (targets.length > 0) change_target(targets[0], true)
        return targets
    }

    public wantToAttack(e: Entity, s: SkillName = "attack"): boolean {
        if (!isAvailable(s)) return false

        if (parent.character.c.town) return false // Teleporting to town

        let range = G.skills[s].range ? G.skills[s].range : parent.character.range
        const distanceToEntity = distance(parent.character, e)
        if (G.skills[s].range_multiplier) range *= G.skills[s].range_multiplier
        if (distanceToEntity > range) return false // Too far away

        const mp = G.skills[s].mp ? G.skills[s].mp : parent.character.mp_cost
        if (parent.character.mp < mp) return false // Insufficient MP

        if (s != "attack" && e.immune) return false // We can't damage it with non-attacks
        if (s != "attack" && e["1hp"]) return false // We only do one damage, don't use special attacks

        if (!is_pvp() && e.type == "monster" && !this.targetPriority[e.mtype]) return false // Holding attacks against things not in our priority list
        if (!e.cooperative && e.target && !(parent.party_list.includes(e.target) || e.target == parent.character.id)) return false // It's attacking a different player, we can't get credit for it, or loot from it

        if (this.targetPriority[e.mtype].attackOnlySingleTarget) {
            for (const id in parent.entities) {
                const e2 = parent.entities[id]
                if (e2.id == e.id) continue // Same entity as the one we're comparing
                if (e2.target == parent.character.id) return false // We don't want to attack more than one thing
            }
        }

        if (!e.target) {
            // Hold attack
            if (this.holdAttack) return false // Holding all attacks
            if ((smart.moving /*|| this.astar.isMoving()*/ || this.nGraphMove.isMoving()) && (this.movementTarget && this.movementTarget.target && this.movementTarget.target != e.mtype) && this.targetPriority[e.mtype].holdAttackWhileMoving) return false // Holding attacks while moving
            if (this.targetPriority[e.mtype].holdAttackInEntityRange && distanceToEntity <= e.range) return false // Holding attacks in range

            // Only attack if attacking teammate
            if (this.targetPriority[e.mtype].attackOnlyWhenAttackingTeammate) return false

            // Only attack if immobile
            if (this.targetPriority[e.mtype].attackOnlyWhenImmobile && e.s && !(e.s.stunned)) return false

            // Don't attack if we have it as a coop target, but we don't have everyone there.
            if (this.targetPriority[e.mtype].coop) {
                const availableTypes = [parent.character.ctype]
                for (const member of parent.party_list) {
                    const e = parent.entities[member]
                    if (!e) continue
                    if (e.rip) continue // Don't add dead players
                    if (e.ctype == "priest" && distance(parent.character, e) > e.range) continue // We're not within range if we want healing
                    availableTypes.push(e.ctype as CharacterType)
                }
                for (const type of this.targetPriority[e.mtype].coop) {
                    if (!availableTypes.includes(type)) return false
                }
            }

            // We are burned
            if (parent.character.s.burned) return false

            // Low HP
            if (calculateDamageRange(e, parent.character)[1] * 5 * e.frequency > parent.character.hp
                && (this.targetPriority[e.mtype].holdAttackInEntityRange || distanceToEntity <= e.range)) return false
        }

        return true
    }
}