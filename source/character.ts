import FastPriorityQueue from "fastpriorityqueue"
import { Entity, IPosition, ItemName, ItemInfo, SlotType, MonsterType, PositionReal, NPCName, SkillName, CharacterEntity } from "./definitions/adventureland"
import { Pathfinder } from "./pathfinder"
import { sendMassCM, findItems, getInventory, getRandomMonsterSpawn, getAttackingEntities, getCooldownMS, isAvailable, getNearbyMonsterSpawns, calculateDamageRange } from "./functions"
import { TargetPriorityList, OtherInfo, MyItemInfo, ItemLevelInfo, PriorityEntity } from "./definitions/bots"
import { dismantleItems, buyPots } from "./trade"

export abstract class Character {
    /** A list of monsters, priorities, and locations to farm. */
    public abstract targetPriority: TargetPriorityList

    /** The default target if there's nothing else to attack */
    protected abstract mainTarget: MonsterType

    protected itemsToKeep: ItemName[] = [
        // General
        "computer", "tracker",
        // Boosters
        "goldbooster", "luckbooster", "xpbooster",
        // Healing
        "hpot1", "mpot1", "hotchocolate",
        // Used to avoid monster hits
        "jacko"
    ]
    protected itemsToSell: ItemLevelInfo = {
        // Default clothing
        "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
        // Common & useless stuff
        "cclaw": 2, "hpamulet": 1, "hpbelt": 1, "maceofthedead": 2, "ringsj": 1, "slimestaff": 2, "spear": 2, "throwingstars": 2, "vitearring": 1, "vitring": 1,
    }
    protected itemsToDismantle: ItemLevelInfo = {
        // Fire stuff
        "fireblade": 0, "firestaff": 0
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
        "dexearring", "intearring", "lostearring", "strearring",
        // Amulets
        "dexamulet", "intamulet", /*"stramulet",*/ "t2dexamulet", "t2intamulet", "t2stramulet",
        // Orbs
        "jacko", "talkingskull",
        // Shields
        "t2quiver", "mshield", "quiver" /* I'd like a +10 quiver if possible */, "xshield",
        // Capes
        "angelwings", "bcape", "cape", "ecape", "stealthcape",
        // Shoes
        "eslippers", "mrnboots", "mwboots", "xboots",
        // Pants
        "mrnpants", "mwpants", "starkillers", "xpants",
        // Armor
        "cdragon", "mrnarmor", "mwarmor", "xarmor",
        // Helmets
        "eears", "fury", "mrnhat", "mwhelmet", "partyhat", "rednose", "xhelmet",
        // Gloves
        "goldenpowerglove", "handofmidas", "mrngloves", "mwgloves", "poker", "powerglove", "xgloves",
        // Good weapons
        "basher", "bowofthedead", "candycanesword", "cupid", "dartgun", "firebow", "gbow", "harbringer", "hbow", "merry", "oozingterror", "ornamentstaff", "pmace", "t2bow",
        // Things we can exchange / craft with
        "ascale", "bfur", "cscale", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", "networkcard", "platinumingot", "platinumnugget", "pleather", "snakefang",
        // Things to make xbox
        "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
        // Things to make easter basket
        "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
        // Essences
        "essenceofether", "essenceoffire", "essenceoffrost", "essenceoflife", "essenceofnature",
        // Boosters
        "goldbooster", "luckbooster", "xpbooster",
        // Potions & consumables
        "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate",
        // Misc. Things
        "bottleofxp", "bugbountybox", "monstertoken", "poison"
    ])

    /** Set to true to stop movement */
    public holdPosition = false

    /** Set to true to stop attacks. We might still attack if the target is attacking us. */
    public holdAttack = false

    public pathfinder: Pathfinder = new Pathfinder()
    public movementTarget: MonsterType

    /** Information about the state of the game that is useful to us */
    protected info: OtherInfo = {
        party: {},
        npcs: {},
        players: {}
    }

    protected async mainLoop(): Promise<void> {
        try {
            if (parent.character.ctype != "merchant") {
                this.equipBetterItems()
                this.getMonsterhuntQuest()
                await buyPots()
            }

            this.getNewYearTreeBuff()
            dismantleItems()

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
                    "monsterHuntTarget": this.movementTarget,
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
            for (const id in parent.entities) {
                if (parent.entities[id].type != "character") continue
                if (parent.entities[id].npc) continue

                const player = parent.entities[id] as CharacterEntity
                message = {
                    "message": "player",
                    "id": id,
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

    public shouldSwitchServer(): boolean {
        if (parent.character.ctype == "merchant") return true // Merchant's go with the flow, man.

        // Monster Hunts
        if (!parent.character.s.monsterhunt) return false // We can potentially get a monster hunt, don't switch
        if (this.targetPriority[parent.character.s.monsterhunt.id]) return false // We can do our monster hunt
        for (const id of parent.party_list) {
            const member = parent.entities[id] ? parent.entities[id] : this.info.party[id]
            if (!member || !member.s || !member.s.monsterhunt) continue
            if (!this.targetPriority[member.s.monsterhunt.id]) continue

            let canCoop = true
            if (this.targetPriority[member.s.monsterhunt.id].coop) {
                const availableTypes = []
                for (const member of parent.party_list) {
                    availableTypes.push(parent.party[member].type)
                }
                for (const type of this.targetPriority[member.s.monsterhunt.id].coop) {
                    if (!availableTypes.includes(type)) {
                        canCoop = false
                        break // We're missing a character type
                    }
                }
            }
            if (!canCoop) continue

            return false // We can do a party member's monster hunt
        }

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

        // // NOTE: While we're farming poisios and spiders, don't switch servers
        // return false;

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
            if (targets.length && this.wantToAttack(targets[0]))
                await attack(targets[0])
        } catch (error) {
            if (!["cooldown", "not_found", "disabled"].includes(error.reason))
                console.error(error)
        }
        setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
    }

    protected scareLoop(): void {
        try {
            const targets = getAttackingEntities()
            let wantToScare = false
            if (targets.length >= 3) {
                wantToScare = true
            } else if (targets.length && !this.targetPriority[targets[0].mtype]) {
                wantToScare = true
            } else if (targets.length && parent.character.c.town) {
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
            } else {
                // Check if we have a jacko in our inventory
                const items = findItems("jacko")
                if (items.length) {
                    const jackoI = items[0].index
                    equip(jackoI) // Equip the jacko
                    use_skill("scare") // Scare the monsters away
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.scareLoop() }, getCooldownMS("scare"))
    }

    protected last: { message: string; target: PositionReal } = { message: "start", target: parent.character };
    protected moveLoop(): void {
        try {
            if (this.holdPosition || parent.character.c.town) {
                setTimeout(() => { this.moveLoop() }, Math.max(250, parent.character.ping))
                return
            }

            const movementTarget = this.getMovementTarget()
            if (movementTarget) {
                // Stop if our target changes
                if (this.last.message != movementTarget.message) {
                    set_message(movementTarget.message.slice(0, 11))
                    this.pathfinder.stop()
                }

                this.last = movementTarget

                if (movementTarget.target) {
                    // game_log("pathfinder -- smart")
                    this.pathfinder.saferMove(movementTarget.target)
                }
            }

            const targets = this.getTargets(1)
            if (smart.moving || this.pathfinder.isMoving()) {
                if (targets.length > 0 /* We have a target in range */
                    && this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].stopOnSight /* We stop on sight of that target */
                    && this.movementTarget == targets[0].mtype /* We're moving to that target */
                    && distance(parent.character, targets[0]) < parent.character.range /* We're in range of that target */) {
                    stop()
                    this.pathfinder.stop()
                }
            } else {
                // Default movements
                if (["ranger", "mage", "priest", "rogue"].includes(parent.character.ctype)) {
                    this.avoidAggroMonsters()
                }

                this.avoidStacking()

                this.avoidAttackingMonsters()

                if (["ranger", "mage", "warrior", "priest"].includes(parent.character.ctype)) {
                    this.moveToMonster()
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.moveLoop() }, Math.max(250, parent.character.ping)) // TODO: queue up next movement based on time it will take to walk there
    }

    protected healLoop(): void {
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
            } else if (mpRatio != 1
                && (!useMpPot
                    || (useMpPot.name == "mpot0" && (parent.character.mp <= parent.character.max_mp - 300 || parent.character.mp < 50))
                    || (useMpPot.name == "mpot1" && (parent.character.mp <= parent.character.max_mp - 500 || parent.character.mp < 50)))) {
                use_skill("use_mp")
            }

            setTimeout(() => { this.healLoop() }, Math.max(250, getCooldownMS("use_hp")))
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.healLoop() }, Math.max(250, getCooldownMS("use_hp")))
        }
    }

    /** Checks if there are players on top of us, and moves so that they aren't. Players take damage from attacks to any other character close by. */
    // TODO: Think about combining this function with avoidAggroMonsters for performance reasons
    protected avoidStacking(): void {
        let d = 0

        let closeMonster = false
        for (const id in parent.entities) {
            const entity = parent.entities[id]
            if (entity.type != "monster") continue // Not a monster
            if (!entity.target) continue // No target on the entity

            d = 25 + entity.range - distance(parent.character, entity)
            if (d > 0) {
                closeMonster = true
                break
            }
        }
        if (!closeMonster) return // No monsters are nearby to attack us

        let closeEntity
        for (const id in parent.entities) {
            const entity = parent.entities[id]
            if (entity.type != "character") continue // Not a character

            d = 25 - distance(parent.character, entity)
            if (d > 0) {
                // There's someone close!
                closeEntity = entity
                break
            }
        }
        if (!closeEntity) return

        const angle = Math.atan2(parent.character.real_y - closeEntity.real_y, parent.character.real_x - closeEntity.real_x)
        const x = Math.cos(angle) * d
        const y = Math.sin(angle) * d
        const escapePosition: IPosition = { x: parent.character.real_x + x, y: parent.character.real_y + y }

        if (can_move_to(escapePosition.x, escapePosition.y)) {
            // game_log("moving -- avoidStacking")
            move(escapePosition.x, escapePosition.y)
        }
    }

    protected avoidAggroMonsters(): void {
        let closeEntity: Entity = null
        let moveDistance = 0
        for (const id in parent.entities) {
            const entity = parent.entities[id]
            if (entity.type != "monster") continue // Not a monster
            if (entity.aggro == 0) continue // Not an aggressive monster
            if (entity.target && entity.target != parent.character.name) continue // Targeting someone else
            if (calculateDamageRange(entity, parent.character)[1] * 3 * entity.frequency < 400) continue // We can outheal the damage from this monster, don't bother moving
            if (this.targetPriority[entity.mtype] && this.targetPriority[entity.mtype].holdPositionFarm) continue // Don't move if we're farming them

            const d = Math.max(60, entity.speed * 1.5) - distance(parent.character, entity)
            if (d < 0) continue // Far away

            if (d > moveDistance) {
                closeEntity = entity
                moveDistance = d
                break
            }
        }

        if (!closeEntity) return // No close monsters

        const angle = Math.atan2(parent.character.real_y - closeEntity.real_y, parent.character.real_x - closeEntity.real_x)
        const x = Math.cos(angle) * moveDistance
        const y = Math.sin(angle) * moveDistance
        const escapePosition: IPosition = { x: parent.character.real_x + x, y: parent.character.real_y + y }

        if (can_move_to(escapePosition.x, escapePosition.y)) {
            // game_log("moving -- avoidaggro")
            move(escapePosition.x, escapePosition.y)
        }
    }

    // TODO: If we are being attacked by 2 different monsters, one with long range, one with short range,
    // if the short range monster is closer, we might not move back enough from the long range monster
    protected avoidAttackingMonsters(): void {
        // Find all monsters attacking us
        const attackingEntities: Entity[] = getAttackingEntities()
        const currentTarget = get_targeted_monster()
        if (currentTarget) {
            attackingEntities.push(currentTarget)
        }

        if (!attackingEntities) return // There aren't any monsters attacking us

        // Find the closest monster of those attacking us
        let minDistance = 9999
        let target: Entity = null
        for (const entity of attackingEntities) {
            if (calculateDamageRange(entity, parent.character)[1] * 3 * entity.frequency < 400) continue // We can outheal the damage 
            const d = distance(parent.character, entity)
            if (entity.speed > parent.character.speed) continue // We can't outrun it, don't try
            if (entity.range > parent.character.range) continue // We can't outrange it, don't try
            if (minDistance < d) continue // There's another target that's closer
            if (this.targetPriority[entity.mtype] && this.targetPriority[entity.mtype].holdPositionFarm) continue // Don't move if we're farming them
            if (d > (entity.range + (entity.speed + parent.character.speed) * Math.max(parent.character.ping * 0.001, 0.5))) continue // We're still far enough away to not get attacked

            minDistance = d
            target = entity
            break
        }
        if (!target) return // We're far enough away not to get attacked, or it's impossible to do so

        // Move away from the closest monster
        const angle: number = Math.atan2(parent.character.real_y - target.real_y, parent.character.real_x - target.real_x)
        const moveDistance: number = target.range + target.speed - (minDistance / 2)
        function calculateEscape(angle: number, moveDistance: number): IPosition {
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

        // game_log("moving -- avoid attacking")
        move(escapePosition.x, escapePosition.y)
    }

    public moveToMonster(): void {
        const targets = this.getTargets(1)
        if (targets.length == 0 // There aren't any targets to move to
            || (this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].holdPositionFarm) // We don't want to move to these monsters
            || distance(parent.character, targets[0]) <= parent.character.range) // We have a target, and it's in range.
            return

        if (can_move_to(targets[0].real_x, targets[0].real_y)) {
            const moveDistance = distance(parent.character, targets[0]) - parent.character.range + (targets[0].speed * 0.5)
            const angle: number = Math.atan2(targets[0].real_y - parent.character.real_y, targets[0].real_x - parent.character.real_x)
            const x = Math.cos(angle) * moveDistance
            const y = Math.sin(angle) * moveDistance

            // Move normally to target
            // game_log("moveToMonster -- normal")
            move(parent.character.real_x + x, parent.character.real_y + y)
        } else {
            // game_log("moveToMonster -- smart")
            this.pathfinder.saferMove(targets[0])
        }
    }

    public getNewYearTreeBuff(): void {
        if (!G.maps.main.ref.newyear_tree) return // Event is not live.
        if (parent.character.s.holidayspirit) return // We already have the buff.
        if (distance(parent.character, G.maps.main.ref.newyear_tree) > 250) return // Too far away

        parent.socket.emit("interaction", { type: "newyear_tree" })
    }

    public getMonsterhuntQuest(): void {
        const monsterhunter: IPosition = { map: "main", x: 126, y: -413 }
        if (distance(parent.character, monsterhunter) > 250) return // Too far away
        if (!parent.character.s.monsterhunt) {
            // No quest, get a new one
            parent.socket.emit("monsterhunt")
        } else if (parent.character.s.monsterhunt.c == 0) {
            // We've finished a quest
            parent.socket.emit("monsterhunt")
        }
    }

    public parseCM(characterName: string, data: any): void {
        if (!parent.party_list.includes(characterName) && parent.character.name != characterName) {
            // Ignore messages from players not in our party
            game_log("Blocked CM from " + characterName)
            return
        }

        if (data.message == "info") {
            this.info.party[characterName] = data.info
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
        const items = getInventory()

        for (const slot in parent.character.slots) {
            let slotItem: ItemInfo = parent.character.slots[slot as SlotType]
            let betterItem: MyItemInfo
            if (!slotItem) continue // Nothing equipped in that slot
            for (const item of items) {
                if (item.name != slotItem.name) continue // Not the same item
                if (item.level <= slotItem.level) continue // Not better than the currently equipped item

                // We found something better
                slotItem = item
                betterItem = item // Overwrite the slot info, and keep looking
            }

            // Equip our better item
            if (betterItem) equip(betterItem.index, slot as SlotType)
        }
    }

    public getMovementTarget(): { message: string; target: PositionReal } {
        // Check for golden bat
        for (const id in parent.entities) {
            const entity = parent.entities[id]
            if (entity.mtype == "goldenbat" || entity.mtype == "phoenix") {
                this.movementTarget = entity.mtype
                // NOTE: We automatically pathfind on our own with moveToMonster()
                return { message: entity.mtype, target: null }
            }
        }

        // Finish monster hunt
        if (parent.character.s.monsterhunt && parent.character.s.monsterhunt.c == 0) {
            this.movementTarget = undefined
            return { message: "Finish MH", target: G.maps.main.ref.monsterhunter }
        }

        // Check for Christmas Tree
        if (G.maps.main.ref.newyear_tree && !parent.character.s.holidayspirit) {
            this.movementTarget = null
            return { message: "Xmas Tree", target: G.maps.main.ref.newyear_tree }
        }

        // Check if our inventory is full
        let full = true
        for (let i = 0; i < 42; i++) {
            if (!parent.character.items[i]) {
                full = false
                break
            }
        }
        if (full) {
            // This is where our merchant usually hangs out
            this.movementTarget = undefined
            return { message: "Full!", target: { map: "main", "x": 60, "y": -325 } }
        }

        // Check for event monsters
        for (const mtype in parent.S) {
            if (mtype == "grinch") continue // The grinch is too strong.
            if (!parent.S[mtype as MonsterType].live) continue
            if (this.targetPriority[mtype as MonsterType]) {
                this.movementTarget = mtype as MonsterType
                for (const id in parent.entities) {
                    const entity = parent.entities[id]
                    if (entity.mtype == mtype) {
                        // There's one nearby
                        return { message: mtype, target: null }
                    }
                }
                return { message: mtype, target: parent.S[mtype as MonsterType] }
            }
        }

        // // NOTE: Because snowmen spawn way too often, let's just camp out there and try to get some rings while we're at it.
        // for (let id in parent.entities) {
        //     let entity = parent.entities[id]
        //     if (entity.mtype == "arcticbee") return { message: "Cold Bois", target: null }
        // }
        // return { message: "Cold Bois", target: getRandomMonsterSpawnPosition("arcticbee") }

        // See if there's a nearby monster hunt (avoid moving as much as possible)
        const monsterHuntTargets: MonsterType[] = []
        let lastms = Number.MAX_VALUE
        for (const memberName of parent.party_list) {
            const member = parent.entities[memberName] ? parent.entities[memberName] : this.info.party[memberName]
            if (!member) continue // No information yet
            if (!member.s.monsterhunt || member.s.monsterhunt.c == 0) continue // They don't have a monster hunt, or are turning it in
            if (!this.targetPriority[member.s.monsterhunt.id]) continue // We can't do it

            // Check if we have the right party members for it.
            let canCoop = true
            if (this.targetPriority[member.s.monsterhunt.id].coop) {
                const availableTypes = []
                for (const member of parent.party_list) {
                    availableTypes.push(parent.party[member].type)
                }
                for (const type of this.targetPriority[member.s.monsterhunt.id].coop) {
                    if (!availableTypes.includes(type)) {
                        canCoop = false
                        break // We're missing a character type
                    }
                }
            }
            if (!canCoop) continue

            // Check if it's impossible for us to complete it in the amount of time given
            let partyDamageRate = 0
            const damageToDeal = G.monsters[member.s.monsterhunt.id].hp * member.s.monsterhunt.c
            const timeLeft = member.s.monsterhunt.ms - (Date.now() - new Date(member.last_ms).getTime())
            for (const id of parent.party_list) {
                if (!this.info.party[id]) continue
                partyDamageRate += this.info.party[id].attack * this.info.party[id].frequency * 0.9
            }
            if (damageToDeal / partyDamageRate > timeLeft / 1000) continue

            // weakly sort based on time left. we want to do the monster hunt with the least time left

            if (timeLeft < lastms) {
                lastms = timeLeft
                monsterHuntTargets.unshift(member.s.monsterhunt.id)
            } else {
                monsterHuntTargets.push(member.s.monsterhunt.id)
            }

        }

        // Move to a monster hunt
        if (monsterHuntTargets.length) {
            let potentialTarget = monsterHuntTargets[0]

            // Frog check, because they're super easy to complete with mages or priests
            if (monsterHuntTargets.includes("frog")
                && G.items[parent.character.slots.mainhand.name].damage == "magical"
                && this.targetPriority["frog"]) {
                potentialTarget = "frog"
            }

            this.movementTarget = potentialTarget

            // Check if other party members are doing it
            if (this.targetPriority[potentialTarget].coop) {
                let havePartyMembers = true
                for (const type of this.targetPriority[potentialTarget].coop) {
                    if (type == parent.character.ctype) continue // it's us!

                    let found = false
                    for (const member of parent.party_list) {
                        if (type == parent.party[member].type && this.info.party[member].monsterHuntTarget == potentialTarget) {
                            found = true
                            break
                        }
                    }
                    if (!found) {
                        havePartyMembers = false
                        break
                    }
                }

                if (!havePartyMembers) {
                    if (this.targetPriority[this.mainTarget].farmingPosition) {
                        return { message: this.mainTarget, target: this.targetPriority[this.mainTarget].farmingPosition }
                    } else {
                        return { message: this.mainTarget, target: getRandomMonsterSpawn(this.mainTarget) }
                    }
                }
            }

            const enemies = this.getTargets(1)
            if (this.targetPriority[potentialTarget].farmingPosition && this.targetPriority[potentialTarget].holdPositionFarm) {
                // We want to hold position at a certain location
                return { message: "MH " + potentialTarget, target: this.targetPriority[potentialTarget].farmingPosition }
            } else if (enemies.length && enemies[0].mtype == potentialTarget) {
                // We have an enemy in our sights
                return { message: "MH " + potentialTarget, target: null }
            } else if (this.targetPriority[potentialTarget].farmingPosition) {
                // We don't have an enemy, but we have a farming position we'd like to go to
                return { message: "MH " + potentialTarget, target: this.targetPriority[potentialTarget].farmingPosition }
            } else {
                // We don't have a farming position, go to any random spawn
                return { message: "MH " + potentialTarget, target: getRandomMonsterSpawn(potentialTarget) }
            }
        }

        // New monster hunt
        if (!parent.character.s.monsterhunt) {
            this.movementTarget = undefined
            return { message: "New MH", target: G.maps.main.ref.monsterhunter }
        }

        // TODO: Add a check to see if we are actually near monsters with these functions.
        // Check if we can farm with +1000% luck (and maybe +1000% gold, too!)
        const kane = parent.entities.Kane ? parent.entities.Kane : this.info.npcs.Kane
        const angel = parent.entities.Angel ? parent.entities.Angel : this.info.npcs.Angel
        const targets = this.getTargets(1)
        if (kane && angel) {
            // See if they're both near a single monster spawn
            const kSpawns = getNearbyMonsterSpawns(kane, 250)
            const aSpawns = getNearbyMonsterSpawns(angel, 250)
            if (parent.character.s.citizen0aura && parent.character.s.citizen4aura && targets.length) {
                this.movementTarget = null
                return { message: "2x1000%", target: null }
            }
            for (const kSpawn of kSpawns) {
                if (["hen", "rooster"].includes(kSpawn.monster)) continue // Ignore chickens
                if (!this.targetPriority[kSpawn.monster]) continue // Ignore things not in our priority list
                for (const aSpawn of aSpawns) {
                    if (kSpawn.x == aSpawn.x && kSpawn.y == aSpawn.y) {
                        return { message: "2x1000%", target: kane }
                    }
                }
            }

            // See if Kane is near a monster spawn
            if (parent.character.s.citizen0aura && targets.length) {
                this.movementTarget = null
                return { message: "1000% luck", target: null }
            }
            if (kSpawns.length
                && !["hen", "rooster"].includes(kSpawns[0].monster) // Ignore chickens
                && this.targetPriority[kSpawns[0].monster]) { // Ignore things not in our priority list
                this.movementTarget = kSpawns[0].monster
                // TODO: Check for citizens aura, if we don't have it, move to the person we don't have
                return { message: "1000% luck", target: kane }
            }

            // See if Angel is near a monster spawn
            if (parent.character.s.citizen4aura && targets.length) {
                this.movementTarget = null
                return { message: "1000% gold", target: null }
            }
            if (aSpawns.length
                && !["hen", "rooster"].includes(aSpawns[0].monster) // Ignore chickens
                && this.targetPriority[aSpawns[0].monster]) { // Ignore things not in our priority list
                this.movementTarget = aSpawns[0].monster
                // TODO: Check for citizens aura, if we don't have it, move to the person we don't have
                return { message: "1000% gold", target: angel }
            }
        }

        // Check for our main target
        this.movementTarget = this.mainTarget
        for (const id in parent.entities) {
            const entity = parent.entities[id]
            if (entity.mtype == this.mainTarget) {
                // There's one nearby
                return { message: this.mainTarget, target: null }
            }
        }
        if (this.targetPriority[this.mainTarget].farmingPosition) {
            return { message: this.mainTarget, target: this.targetPriority[this.mainTarget].farmingPosition }
        } else {
            return { message: this.mainTarget, target: getRandomMonsterSpawn(this.mainTarget) }
        }

    }

    public getTargets(numTargets = 1): Entity[] {
        const targets: Entity[] = []

        // Find out what targets are already claimed by our party members
        const members = parent.party_list
        const claimedTargets: string[] = []
        for (const id in parent.entities) {
            if (members.includes(id)) {
                const target = parent.entities[id].target
                if (target) claimedTargets.push(target)
            }
        }

        const potentialTargets = new FastPriorityQueue<PriorityEntity>((x, y) => x.priority > y.priority)
        for (const id in parent.entities) {
            const potentialTarget = parent.entities[id]

            const d = distance(parent.character, potentialTarget)
            if (!this.targetPriority[potentialTarget.mtype] && potentialTarget.target != parent.character.name) continue // Not a monster we care about, and it's not attacking us
            if (potentialTarget.type != "monster") // Not a monster
                if (!is_pvp() && potentialTarget.type == "character") continue // Not PVP

            // Set a priority based on the index of the entity 
            let priority = 0
            if (this.targetPriority[potentialTarget.mtype]) priority = this.targetPriority[potentialTarget.mtype].priority

            // Adjust priority if a party member is already attacking it
            if (claimedTargets.includes(id)) {
                if (this.targetPriority[potentialTarget.mtype] && this.targetPriority[potentialTarget.mtype].coop) priority += 10000
                if (potentialTarget.hp <= calculateDamageRange(parent.character, potentialTarget)[0]) priority -= parent.character.range
            }

            // Increase priority if it's our "main target"
            if (potentialTarget.mtype == this.mainTarget) priority += 10

            // Increase priority if it's our movement target
            if (potentialTarget.mtype == this.movementTarget) priority += parent.character.range * 2

            // Increase priority if the entity is targeting us
            if (potentialTarget.target == parent.character.name) priority += parent.character.range * 2

            // Adjust priority based on distance
            priority -= d

            // We want to target cooperative monsters to multiply the amount of loot we get, so kill the one with the lowest HP first.
            if (potentialTarget.cooperative) priority += 2000 * (potentialTarget.max_hp - potentialTarget.hp) / potentialTarget.max_hp

            const priorityEntity: PriorityEntity = { ...potentialTarget, priority: priority }
            potentialTargets.add(priorityEntity)
        }

        if (potentialTargets.size == 0) {
            // No potential targets
            return targets
        }

        while (targets.length < numTargets && potentialTargets.size > 0) {
            targets.push(potentialTargets.poll())
        }
        if (targets.length > 0)
            change_target(targets[0], true)
        return targets
    }

    public wantToAttack(e: Entity, s: SkillName = "attack"): boolean {
        if (parent.character.stoned) return false // We are stoned, we can't attack
        if (G.skills[s].level && G.skills[s].level > parent.character.level) return false // Not a high enough level to use this skill
        if (!isAvailable(s)) return false // On cooldown
        if (parent.character.c.town) return false // Teleporting to town

        let range = G.skills[s].range ? G.skills[s].range : parent.character.range
        const distanceToEntity = distance(parent.character, e)
        if (G.skills[s].range_multiplier) range *= G.skills[s].range_multiplier
        if (distanceToEntity > range) return false // Too far away

        const mp = G.skills[s].mp ? G.skills[s].mp : parent.character.mp_cost
        if (parent.character.mp < mp) return false // Insufficient MP

        if (s != "attack" && e.immune) return false // We can't damage it with non-attacks
        if (s != "attack" && e["1hp"]) return false // We only do one damage, don't use special attacks

        if (!this.targetPriority[e.mtype]) return false // Holding attacks against things not in our priority list

        if (!e.target) {
            // Hold attack
            if (this.holdAttack) return false // Holding all attacks
            if ((smart.moving || this.pathfinder.isMoving()) && this.targetPriority[e.mtype].holdAttackWhileMoving) return false // Holding attacks while moving
            if (this.targetPriority[e.mtype].holdAttackInEntityRange && distanceToEntity <= e.range) return false // Holding attacks in range

            // Don't attack if we have it as a coop target, but we don't have everyone there.
            if (this.targetPriority[e.mtype].coop) {
                const availableTypes = [parent.character.ctype]
                for (const member of parent.party_list) {
                    const e = parent.entities[member]
                    if (!e) continue
                    if (e.rip) continue // Don't add dead players
                    if (e.ctype == "priest" && distance(parent.character, e) > e.range) continue // We're not within range if we want healing
                    availableTypes.push(e.ctype)
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