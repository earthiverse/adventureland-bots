import FastPriorityQueue from "fastpriorityqueue"
import { Entity, IPosition, ItemName, ItemInfo, SlotType, MonsterType, PositionReal, NPCName, SkillName, CharacterEntity, CharacterType, TradeSlotType } from "./definitions/adventureland"
import { sendMassCM, findItems, getInventory, getRandomMonsterSpawn, getCooldownMS, isAvailable, calculateDamageRange, isInventoryFull, getPartyMemberTypes, getVisibleMonsterTypes, sleep, getEntities } from "./functions"
import { TargetPriorityList, OtherInfo, InventoryItemInfo, ItemLevelInfo, PriorityEntity, MovementTarget } from "./definitions/bots"
import { dismantleItems, buyPots } from "./trade"
import { AStarSmartMove } from "./astarsmartmove"

export abstract class Character {
    /** A list of monsters, priorities, and locations to farm. */
    public abstract targetPriority: TargetPriorityList

    /** The default target if there's nothing else to attack */
    protected abstract mainTarget: MonsterType

    protected astar = new AStarSmartMove()

    protected itemsToKeep: ItemName[] = [
        // General
        "computer", "tracker",
        // Boosters
        "goldbooster", "luckbooster", "xpbooster",
        // Healing
        "hpot1", "mpot1", "hotchocolate", "candypop",
        // Used to avoid monster hits
        "jacko", "lantern"
    ]
    protected itemsToSell: ItemLevelInfo = {
        // Default clothing
        "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
        // Common & useless stuff
        "cclaw": 2, "hpamulet": 1, "hpbelt": 1, "maceofthedead": 2, "ringsj": 1, "slimestaff": 2, "spear": 2, "throwingstars": 2, "vitearring": 1, "vitring": 1,
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
        "armorbox", "weaponbox", "xbox"
    ])
    protected itemsToBuy: Set<ItemName> = new Set([
        // Exchangables
        ...this.itemsToExchange,
        // Belts
        "dexbelt", "intbelt", "strbelt",
        // Rings
        "ctristone", "dexring", "intring", "ringofluck", "strring", "suckerpunch", "tristone",
        // Earrings
        /*"dexearring", "intearring", "lostearring", "strearring",*/
        // Amulets
        /*"dexamulet", "intamulet", "stramulet",*/ "t2dexamulet", "t2intamulet", "t2stramulet",
        // Orbs
        "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull",
        // Shields
        "t2quiver", "lantern", "mshield", /*"quiver", I'd like a +10 quiver if possible*/ "xshield",
        // Capes
        "angelwings", "bcape", "cape", "ecape", "stealthcape",
        // Shoes
        /*"eslippers",*/ "mrnboots", "mwboots", "xboots",
        // Pants
        "mrnpants", "mwpants", "starkillers", "xpants",
        // Armor
        "cdragon", "mrnarmor", "mwarmor", "xarmor",
        // Helmets
        "eears", "fury", "mrnhat", "mwhelmet", "partyhat", "rednose", "xhelmet",
        // Gloves
        "goldenpowerglove", "handofmidas", "mrngloves", "mwgloves", "poker", "powerglove", "xgloves",
        // Good weapons
        "basher", "bowofthedead", "candycanesword", "dartgun", "firebow", "gbow", "harbringer", "hbow", "merry", "oozingterror", "ornamentstaff", "pmace", "t2bow", "t3bow",
        // Things we can exchange / craft with
        "ascale", "bfur", "cscale", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", "networkcard", "platinumingot", "platinumnugget", "pleather", "snakefang",
        // Things to make xbox
        "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
        // Things to make easter basket
        "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
        // Essences
        "essenceofether", "essenceoffire", "essenceoffrost", "essenceoflife", "essenceofnature",
        // Potions & consumables
        "bunnyelixir", "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate",
        // Misc. Things
        "bottleofxp", "bugbountybox", "monstertoken", "poison"
    ])

    /** Set to true to stop movement */
    public holdPosition = false

    /** Set to true to stop attacks. We might still attack if the target is attacking us. */
    public holdAttack = false

    public movementTarget: MovementTarget

    /** Information about the state of the game that is useful to us */
    protected info: OtherInfo = {
        party: {},
        npcs: {},
        players: {},
        monsters: {}
    }

    protected async mainLoop(): Promise<void> {
        try {
            if (parent.character.ctype != "merchant") {
                this.equipBetterItems()
                this.getMonsterhuntQuest()
                await buyPots()
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
                    if (info.b) continue // Item isn't for sale, they're buying it
                    if (!info.rid) continue // Item isn't for sale
                    if (!this.itemsToBuy.has(info.name)) continue // We don't want to buy it
                    if (info.price > G.items[info.name].g * 2) continue // We don't want to automatically buy things that are really expensive
                    if (parent.character.gold < info.price) continue // We don't have enough money
                    if (info.q) {
                        // They're stackable, buy as many as we can
                        const quantityToBuy = Math.min(info.q, Math.floor(parent.character.gold / info.price))
                        parent.socket.emit("trade_buy", { slot: slot, id: entity.id, rid: info.rid, q: quantityToBuy })
                    } else {
                        // They're not stackable, buy the one
                        parent.socket.emit("trade_buy", { slot: slot, id: entity.id, rid: info.rid, q: 1 })
                    }
                }
            }

            this.loot()
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.mainLoop() }, Math.max(250, parent.character.ping))
    }

    public run(): void {
        this.healLoop()
        this.attackLoop()
        this.scareLoop()
        this.moveLoop()
        this.sendInfoLoop()
        this.mainLoop()
    }

    /**
     * Sends a bunch of CMs to players in our party list telling them information like what quest we have, what items we have, etc.
     *
     * @protected
     * @memberof Character
     */
    protected sendInfoLoop(): void {
        try {
            let message: any

            // Chests
            // let chests: { [T in string]: ChestInfo } = {}
            // for (const chestID in parent.chests) {
            //     chests[chestID] = {
            //         alpha: parent.chests[chestID].alpha,
            //         x: parent.chests[chestID].x,
            //         y: parent.chests[chestID].y,
            //         map: parent.chests[chestID].map
            //     }
            // }
            // message= {
            //     "message": "chests",
            //     "chests": chests
            // }
            // sendMassCM(parent.party_list, message)
            // this.parse_cm(parent.character.name, message)

            // Information about us
            message = {
                "message": "info",
                "info": {
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
            }
            sendMassCM(parent.party_list, message)
            this.parseCM(parent.character.name, message)

            // Other players
            for (const player of getEntities({ isPlayer: true }) as CharacterEntity[]) {
                message = {
                    "message": "player",
                    "id": player.id,
                    "info": {
                        "lastSeen": new Date(),
                        "rip": player.rip,
                        "map": player.map,
                        "x": player.real_x,
                        "y": player.real_y,
                        "s": player.s,
                        "ctype": player.ctype
                    }
                }

                sendMassCM(parent.party_list, message)
                this.parseCM(parent.character.name, message)
            }

            // Important NPCs
            for (const npc of ["Angel", "Kane"]) {
                if (!parent.entities[npc]) continue
                message = {
                    "message": "npc",
                    "id": npc,
                    "info": {
                        "lastSeen": new Date(),
                        "map": parent.entities[npc].map,
                        "x": parent.entities[npc].real_x,
                        "y": parent.entities[npc].real_y
                    }
                }
                if (parent.entities[npc]) {
                    sendMassCM(parent.party_list, message)
                    this.parseCM(parent.character.name, message)
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.sendInfoLoop() }, 5000)
    }

    public getMonsterHuntTargets(): MonsterType[] {
        const types: MonsterType[] = []
        let leastTimeRemaining = Number.MAX_VALUE
        for (const memberName of parent.party_list) {
            // NOTE: TODO: Gonna check if not checking parent.entities improves the lagginess when we are between monster hunts.
            // const member = parent.entities[memberName] ? parent.entities[memberName] : this.info.party[memberName]
            const member = this.info.party[memberName]
            if (!member) continue // No information yet
            if (!member.s.monsterhunt || member.s.monsterhunt.c == 0) continue // Character doesn't have a monster hunt, or it's (almost) finished
            if (!this.targetPriority[member.s.monsterhunt.id]) continue // Not in our target priority

            // Check if we can co-op
            const coop = this.targetPriority[member.s.monsterhunt.id].coop
            if (coop) {
                const availableTypes = getPartyMemberTypes()
                const missingTypes = coop.filter(x => !availableTypes.has(x))
                if (missingTypes.length) continue
            }

            // TODO: Check if we can do enough damage to complete the monster hunt in the given time

            // Sort by time left.
            // TODO: Improve prioritization. For example, frogs are easy, so do them first
            const timeLeft = member.s.monsterhunt.ms - (Date.now() - new Date(member.last_ms).getTime())
            if (timeLeft < leastTimeRemaining) {
                leastTimeRemaining = timeLeft
                types.unshift(member.s.monsterhunt.id)
            } else {
                types.push(member.s.monsterhunt.id)
            }
        }

        return types
    }

    public shouldSwitchServer(): boolean {
        if (parent.character.ctype == "merchant") return true // Merchants don't get to decide

        if (!parent.character.s.monsterhunt) return false // We don't have a monster hunt
        if (parent.character.s.monsterhunt.c == 0) return false // We have a monster hunt to turn in
        if (this.getMonsterHuntTargets().length) return false // There's a monster hunt we could do

        // Doable event monster
        for (const monster in parent.S) {
            if (monster == "grinch") continue // The grinch is too strong.
            if (parent.S[monster as MonsterType].hp / parent.S[monster as MonsterType].max_hp > 0.9) continue // Still at a high HP
            if (!parent.S[monster as MonsterType].live) continue
            if (this.targetPriority[monster as MonsterType]) return false // We can do an event monster!
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

    protected loot(): void {
        let i = 0
        for (const chestID in parent.chests) {
            const chest = parent.chests[chestID]
            if (distance(parent.character, chest) > 800) continue // Chests over a 800 radius have a penalty as per @Wizard in #feedback (Discord) on 11/26/2019

            let shouldLoot = true
            for (const id of parent.party_list) {
                if (id == parent.character.id) continue // Skip ourself

                const partyMember = parent.entities[id]
                if (!partyMember) continue
                if (distance(partyMember, chest) > 800) continue
                if (!this.info.party[id]) continue

                if (["chest3", "chest4"].includes(chest.skin)) {
                    if (parent.character.goldm >= this.info.party[id].goldm) continue
                }
                else {
                    if (parent.character.luckm >= this.info.party[id].luckm) continue
                }

                shouldLoot = false
                break
            }

            if (shouldLoot) {
                parent.socket.emit("open_chest", { id: chestID })
                if (++i > 10) break // Only open 10 chests at a time to help with server call costs
            }
        }
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
                setTimeout(() => { this.attackLoop() }, Math.min(...parent.pings) - error.remaining)
                return
            } else if (!["not_found", "disabled"].includes(error.reason)) {
                console.error(error)
            }
            setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
            return
        }
        setTimeout(() => { this.attackLoop() }, getCooldownMS("attack", true))
    }

    protected scareLoop(): void {
        try {
            const targets = getEntities({ isAttackingUs: true, isMonster: true, isRIP: false })
            let wantToScare = false
            if (targets.length >= 3) {
                wantToScare = true
            } else if (targets.length && !this.targetPriority[targets[0].mtype]) {
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
                    // if (this.targets[target.mtype]) continue

                    wantToScare = true
                    break
                }
            }
            if (!isAvailable("scare") // On cooldown
                || !wantToScare) { // Can't be easily killed
                setTimeout(() => { this.scareLoop() }, getCooldownMS("scare"))
                return
            }


            if (parent.character.slots.orb.name == "jacko") {
                // We have a jacko equipped
                use_skill("scare")
                reduce_cooldown("scare", Math.min(...parent.pings))
            } else {
                // Check if we have a jacko in our inventory
                const items = findItems("jacko")
                if (items.length) {
                    const jackoI = items[0].index
                    equip(jackoI) // Equip the jacko
                    use_skill("scare") // Scare the monsters away
                    reduce_cooldown("scare", Math.min(...parent.pings))
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.scareLoop() }, getCooldownMS("scare"))
    }

    protected getMovementLocation(mtype: MonsterType): PositionReal {
        if (!this.targetPriority[mtype]) return // Not a target we want to move to
        if (this.targetPriority[mtype].farmingPosition && this.targetPriority[mtype].holdPositionFarm) return this.targetPriority[mtype].farmingPosition // We have a specific position to farm these monsters
        if (getVisibleMonsterTypes().has(mtype)) return // There's one nearby, we don't need to move
        if (this.targetPriority[mtype].farmingPosition) {
            if (distance(parent.character, this.targetPriority[mtype].farmingPosition) < 300) {
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
            if (entity.mtype != "goldenbat" && entity.mtype != "phoenix") continue
            if (!this.targetPriority[entity.mtype]) continue // Not a target
            set_message(entity.mtype)
            return { target: entity.mtype, position: entity, range: parent.character.range }
        }

        // Special Monsters -- Move to monster
        for (const mtype in this.info.monsters) {
            if (!this.targetPriority[mtype as MonsterType]) continue // Not a target we can do
            const info = this.info.monsters[mtype as MonsterType]

            // Update info if we can see it
            const entityInfo = parent.entities[info.id]
            if (entityInfo) {
                info.x = entityInfo.real_x
                info.y = entityInfo.real_y
            }

            if (distance(parent.character, info) < 100 && !entityInfo) {
                delete this.info.monsters[mtype as MonsterType]
            } else {
                set_message(`SP ${mtype}`)
                return { target: mtype as MonsterType, position: info, range: 0 }
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
            if (!parent.S[mtype as MonsterType].live) continue // Not alive
            if (!this.targetPriority[mtype as MonsterType]) continue // Not a target
            set_message(mtype)
            return { target: mtype as MonsterType, position: parent.S[mtype as MonsterType], range: parent.character.range }
        }

        // Monster Hunts -- Move to monster
        const monsterHuntTargets: MonsterType[] = this.getMonsterHuntTargets()
        if (monsterHuntTargets.length) {
            const potentialTarget = monsterHuntTargets[0]

            const coop = this.targetPriority[potentialTarget].coop
            if (coop) {
                // Check if other members are fighting it, too
                const readyMembers = new Set<CharacterType>()
                for (const memberName of parent.party_list) {
                    if (!this.info.party[memberName] || !this.info.party[memberName].monsterHuntTargets) continue
                    if (this.info.party[memberName].monsterHuntTargets[0] != potentialTarget) continue

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

    protected moveLoop(): void {
        try {
            if (this.holdPosition || smart.moving) {
                setTimeout(() => { this.moveLoop() }, parent.character.ping)
                return
            }

            // Move to our target (this is to get us in the general vicinity, we will do finer movements within that later)
            const lastMovementTarget = this.movementTarget
            this.movementTarget = this.getMovementTarget()
            if (this.movementTarget && this.movementTarget.position) {
                if (!lastMovementTarget
                    || this.movementTarget.target != lastMovementTarget.target
                    || (lastMovementTarget.position && this.movementTarget.position.map != lastMovementTarget.position.map) /* Will this always be the case? Right now there are only snakes that spawn on more than one map, and we have them covered by setting a hunt position */) {
                    // New movement target
                    this.astar.stop()
                    this.astar.smartMove(this.movementTarget.position, this.movementTarget.range)
                    setTimeout(() => { this.moveLoop() }, parent.character.ping)
                    return
                }

                if (!this.astar.isMoving()) {
                    // Same monster, new movement target
                    this.astar.smartMove(this.movementTarget.position, this.movementTarget.range)
                    setTimeout(() => { this.moveLoop() }, parent.character.ping)
                    return
                }
            }

            // Stop on sight
            const targets = this.getTargets(1)
            if (targets.length
                && targets[0].mtype == this.movementTarget.target
                && this.targetPriority[targets[0].mtype] && !this.targetPriority[targets[0].mtype].holdPositionFarm) {
                this.astar.stop()
            }

            // Don't do anything if we're moving around
            if (this.astar.isMoving()) {
                setTimeout(() => { this.moveLoop() }, parent.character.ping)
                return
            }

            // Don't do anything if we're holding position for this monster
            if (this.targetPriority[this.movementTarget.target as MonsterType] && this.targetPriority[this.movementTarget.target as MonsterType].holdPositionFarm) {
                setTimeout(() => { this.moveLoop() }, parent.character.ping)
                return
            }

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
                if (entity.rip) continue
                if (!this.targetPriority[entity.mtype]) continue
                const d = distance(parent.character, entity)
                const enemyRange = Math.max(entity.range + entity.speed, 50)

                if (enemyRange < parent.character.range // Enemy range is less than our range
                    && d < enemyRange // We are within the enemy range
                ) {
                    if (entity.hp > calculateDamageRange(parent.character, entity)[0] || entity.target == parent.character.name) {
                        inEnemyAttackRange.push(entity) // We can run away from it
                    }
                }

                if (!entity.target && d < 50) {
                    inAggroRange.push(entity)
                }

                if (d < parent.character.range) {
                    inAttackRange.push(entity) // We don't have to move to attack these targets
                    if (this.movementTarget.target == entity.mtype) inAttackRangeHighPriority.push(entity)
                }

                if (d < parent.character.range * 2) {
                    inExtendedAttackRange.push(entity) // We can move to these targets while still attacking our current target
                    if (this.movementTarget.target == entity.mtype) inExtendedAttackRangeHighPriority.push(entity)
                }

                visible.push(entity) // We can see these targets nearby
                if (this.movementTarget.target == entity.mtype) visibleHighPriority.push(entity)
            }

            // Move to monster
            if (inAttackRangeHighPriority.length == 0 && visibleHighPriority.length > 0) {
                let closest: PositionReal
                let d = Number.MAX_VALUE
                for (const v of visibleHighPriority) {
                    const vD = distance(parent.character, v)
                    if (vD < d) {
                        d = vD
                        closest = v
                    }
                }
                this.astar.smartMove(closest, parent.character.range)
                setTimeout(() => { this.moveLoop() }, parent.character.ping)
                return
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

                const d = distance(parent.character, average)
                const angle: number = Math.atan2(parent.character.real_y - average.y, parent.character.real_x - average.x)
                const moveDistance: number = Math.min(parent.character.range, maxRange * 1.5)
                const calculateEscape = (angle: number, moveDistance: number): IPosition => {
                    const x = Math.cos(angle) * moveDistance
                    const y = Math.sin(angle) * moveDistance
                    return { x: parent.character.real_x + x, y: parent.character.real_y + y }
                }
                let escapePosition = calculateEscape(angle, moveDistance)
                let angleChange = 0
                while (!can_move_to(escapePosition.x, escapePosition.y) && angleChange < 180) {
                    if (angleChange <= 0) {
                        angleChange = (-angleChange) + 1
                    } else {
                        angleChange = -angleChange
                    }
                    escapePosition = calculateEscape(angle + (angleChange * Math.PI / 180), moveDistance)
                }

                move(escapePosition.x, escapePosition.y)
                setTimeout(() => { this.moveLoop() }, parent.character.ping)
                return
            }

            // We aren't near any monsters, let's go to one
            if (inAttackRange.length == 0 && inExtendedAttackRange.length == 0 && visible.length != 0) {
                let closest: PositionReal
                let d = Number.MAX_VALUE
                for (const v of visible) {
                    const vD = distance(parent.character, v)
                    if (vD < d) {
                        d = vD
                        closest = v
                    }
                }
                this.astar.smartMove(closest, parent.character.range)
                setTimeout(() => { this.moveLoop() }, parent.character.ping)
                return
            }

            if (inAttackRange.length == 0 && inExtendedAttackRange.length > 0) {
                let closest: PositionReal
                let d = Number.MAX_VALUE
                for (const v of inExtendedAttackRange) {
                    const vD = distance(parent.character, v)
                    if (vD < d) {
                        d = vD
                        closest = v
                    }
                }
                this.astar.smartMove(closest, parent.character.range)
                setTimeout(() => { this.moveLoop() }, parent.character.ping)
                return
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.moveLoop() }, parent.character.ping)
    }

    protected async healLoop(): Promise<void> {
        try {
            if (parent.character.rip) {
                // Respawn if we're dead
                respawn()
                setTimeout(() => { this.healLoop() }, getCooldownMS("use_town"))
                return
            } else if (!isAvailable("use_hp")) {
                setTimeout(() => { this.healLoop() }, getCooldownMS("use_hp"))
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
                parent.socket.emit("use", { item: "hp" })
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            } else if (mpRatio < hpRatio) {
                parent.socket.emit("use", { item: "mp" })
                reduce_cooldown("use_hp", Math.min(...parent.pings))
                reduce_cooldown("use_mp", Math.min(...parent.pings))
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.healLoop() }, getCooldownMS("use_hp"))
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
            this.info.party[characterName] = data.info
        } else if (data.message == "monster") {
            this.info.monsters[data.id as MonsterType] = data.info
        } else if (data.message == "npc") {
            this.info.npcs[data.id as NPCName] = data.info
        } else if (data.message == "player") {
            this.info.players[data.id] = data.info
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
            if (this.movementTarget.target && this.targetPriority[this.movementTarget.target as MonsterType]) {
                for (const idealItem of this.targetPriority[this.movementTarget.target as MonsterType].equip || []) {
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
        for (const id in parent.entities) {
            if (members.includes(id)) {
                const target = parent.entities[id].target
                if (target) claimedTargets.add(target)
            }
        }

        const potentialTargets = new FastPriorityQueue<PriorityEntity>((x, y) => x.priority > y.priority)
        for (const id in parent.entities) {
            const potentialTarget = parent.entities[id]

            if (potentialTarget.rip) continue // It's dead
            if (parent.party_list.includes(id)) continue // It's a member of our party
            if (!is_pvp() && potentialTarget.type != "monster") continue // Not interested in non-monsters unless it's PvP
            if (is_pvp() && parent.party_list.includes(id)) continue
            if (!this.targetPriority[potentialTarget.mtype] && potentialTarget.target != parent.character.name) continue // Not a monster we care about, and it's not attacking us

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

        if (!e.target) {
            // Hold attack
            if (this.holdAttack) return false // Holding all attacks
            if ((smart.moving || this.astar.isMoving()) && this.targetPriority[e.mtype].holdAttackWhileMoving) return false // Holding attacks while moving
            if (this.targetPriority[e.mtype].holdAttackInEntityRange && distanceToEntity <= e.range) return false // Holding attacks in range

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

            // Low HP
            if (calculateDamageRange(e, parent.character)[1] * 5 * e.frequency > parent.character.hp && distanceToEntity <= e.range) return false
        }

        return true
    }
}