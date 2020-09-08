import { ItemInfo, MonsterName, ItemName, IPosition, MapName, Entity, PositionReal, SkillName, BankPackType, CharacterType } from "./definitions/adventureland"
import { InventoryItemInfo, EmptyBankSlots, MonsterSpawnPosition } from "./definitions/bots"

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function isNPC(entity: Entity): boolean {
    return entity.npc ? true : false
}

export function isMonster(entity: Entity): boolean {
    return entity.type == "monster"
}

export function isPlayer(entity: Entity): boolean {
    return entity.type == "character" && !isNPC(entity)
}

export async function startKonami(): Promise<MonsterName> {
    const result = new Promise<MonsterName>((resolve) => {
        // TODO: Switch this to parent.socket.on() and remove it. There are many game_response events which could cause this one to get lost.
        parent.socket.once("game_response", (response: { response: string; monster: MonsterName }) => {
            resolve(response.monster)
        })
        parent.socket.emit("move", { "key": "up" })
        parent.socket.emit("move", { "key": "up" })
        parent.socket.emit("move", { "key": "down" })
        parent.socket.emit("move", { "key": "down" })
        parent.socket.emit("move", { "key": "left" })
        parent.socket.emit("move", { "key": "right" })
        parent.socket.emit("move", { "key": "left" })
        parent.socket.emit("move", { "key": "right" })
        parent.socket.emit("interaction", { "key": "B" })
        parent.socket.emit("interaction", { "key": "A" })
        parent.socket.emit("interaction", { "key": "enter" })
    })

    const timeout: Promise<MonsterName> = new Promise(function (resolve, reject) {
        setTimeout(reject, 5000)
    })

    return Promise.race([result, timeout])
}

/** Returns the inventory for the player, with all empty slots removed. */
export function getInventory(inventory = parent.character.items): InventoryItemInfo[] {
    const items: InventoryItemInfo[] = []
    for (let i = 0; i < inventory.length; i++) {
        if (!inventory[i]) continue // No item in this slot
        items.push({ ...inventory[i], index: i })
    }
    return items
}

export function findItem(name: ItemName): InventoryItemInfo {
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i]) continue // No item in this slot
        if (parent.character.items[i].name != name) continue // Item doesn't match.

        return { ...parent.character.items[i], index: i }
    }
}

// export function calculateValue(name: ItemName): number {
//     // From Archalias on 2020-05-30 in general on Discord
//     // https://discordapp.com/channels/238332476743745536/238332476743745536/716049637579948124
//     const baseChance = [
//         99.99,
//         98.19,
//         95.66,
//         70.92,
//         62.50,
//         42.52,
//         26.84,
//         18.26,
//         11.88,
//         4.8,
//         33.00,
//         20.00,
//     ]

//     return -1
// }

export function findItems(name: ItemName): InventoryItemInfo[] {
    const items: InventoryItemInfo[] = []
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i]) continue // No item in this slot
        if (parent.character.items[i].name != name) continue // Item doesn't match.

        items.push({ ...parent.character.items[i], index: i })
    }
    return items
}

export function findItemsWithLevel(name: ItemName, level: number): InventoryItemInfo[] {
    const items: InventoryItemInfo[] = []
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i]) continue // No item in this slot
        if (parent.character.items[i].name != name) continue // Item doesn't match.
        if (parent.character.items[i].level != level) continue // Level doesn't match

        items.push({ ...parent.character.items[i], index: i })
    }
    return items
}

/** The first element is the minimum damage we could do. The second element is the maximum damage we could do. */
export function calculateDamageRange(attacker: Entity, defender: Entity): [number, number] {
    let baseDamage: number = attacker.attack
    // TODO: Are these guaranteed to be on IEntity? If they are we don't need to check and set them to zero.
    if (!attacker.apiercing) attacker.apiercing = 0
    if (!attacker.rpiercing) attacker.rpiercing = 0
    if (!defender.armor) defender.armor = 0
    if (!attacker.damage_type && attacker.slots.mainhand) attacker.damage_type = G.items[attacker.slots.mainhand.name].damage

    if (defender["1hp"]) {
        return [1, 1]
    }

    if (attacker.damage_type == "physical") {
        // Armor
        baseDamage *= damage_multiplier(defender.armor - attacker.apiercing)
    } else if (attacker.damage_type == "magical") {
        // Resistance
        baseDamage *= damage_multiplier(defender.resistance - attacker.rpiercing)
    }

    return [baseDamage * 0.9, baseDamage * 1.1]
}

/** Returns true if we're walking towards an entity. Used for checking if we can attack higher level enemies while we're moving somewhere */
// TODO: Finish this function, it's currently broken, don't use it.
export function areWalkingTowards(entity: Entity): boolean {
    if (!parent.character.moving) return false
    if (parent.character.vx < 0 && parent.character.real_x - entity.real_x > 0) return true
}

/** Also works for NPCs! */
export function canSeePlayer(name: string): boolean {
    return parent.entities[name] ? true : false
}

/** Returns the amount of ms we have to wait to use this skill */
export function getCooldownMS(skill: SkillName, ignorePing = false): number {
    if (parent.next_skill && parent.next_skill[skill]) {
        const ms = parent.next_skill[skill].getTime() - Date.now()
        if (ignorePing) {
            return ms + 1
        } else {
            return ms < parent.character.ping ? parent.character.ping : ms + 1
        }
    } else {
        return parent.character.ping
    }
}

/** Returns the expected amount of time to kill a given monster */
export function estimatedTimeToKill(attacker: Entity, defender: Entity): number {
    const damage = calculateDamageRange(attacker, defender)[0]
    let evasionMultiplier = 1
    if (defender.evasion && attacker.damage_type == "physical") {
        evasionMultiplier -= defender.evasion * 0.01
    }
    const attacksPerSecond = attacker.frequency
    const numberOfAttacks = Math.ceil(evasionMultiplier * defender.hp / damage)

    return numberOfAttacks / attacksPerSecond
}

export function getExchangableItems(inventory?: ItemInfo[]): InventoryItemInfo[] {
    const items: InventoryItemInfo[] = []

    for (const item of getInventory(inventory)) {
        if (G.items[item.name].e) items.push(item)
    }

    return items
}

export function isInventoryFull(store: ItemInfo[] = parent.character.items): boolean {
    for (let i = 0; i < store.length; i++) {
        if (!store[i]) return false
    }
    return true
}

export function getPartyMemberTypes(): Set<CharacterType> {
    const types = new Set<CharacterType>()
    for (const name of parent.party_list) {
        types.add(parent.party[name].type)
    }
    return types
}

export function getEmptySlots(store: ItemInfo[] = parent.character.items): number[] {
    const slots: number[] = []
    for (let i = 0; i < store.length; i++) {
        if (!store[i]) slots.push(i)
    }
    return slots
}

/**
 * Gets a list of empty bank slot positions. Only returns empty slots for the current map.
 */
export function getEmptyBankSlots(): EmptyBankSlots[] {
    if (!["bank", "bank_b", "bank_u"].includes(parent.character.map)) return // We can only find out what bank slots we have if we're on the bank map.

    const emptySlots: EmptyBankSlots[] = []

    for (const store in bank_packs) {
        if (store == "gold") continue
        if (bank_packs[store as BankPackType][0] != parent.character.map) continue
        for (let i = 0; i < 42; i++) {
            const item = parent.character.bank[store as BankPackType][i]
            if (!item) emptySlots.push({ pack: store as Exclude<BankPackType, "gold">, "index": i })
        }
    }

    return emptySlots
}

export function isAvailable(skill: SkillName): boolean {
    // Check if we have the required level to use this skill
    const skillLevel = G.skills[skill].level
    if (skillLevel && skillLevel > parent.character.level) return false

    // Check if we have a status effect preventing us from using this skill
    if (parent.character.stoned) return false
    if (parent.character.rip) return false

    // Check if we have the required weapon to use this skill
    const skillWeaponTypes = G.skills[skill].wtype
    if (skillWeaponTypes && !skillWeaponTypes.includes(G.items[parent.character.slots.mainhand.name].wtype)) return false

    // Check if we have the required items to use this skill
    if (G.skills[skill].slot) {
        for (const requiredItem of G.skills[skill].slot) {
            if (!locate_item(requiredItem[1])) {
                if (!parent.character.slots[requiredItem[0]]) return false // Nothing equipped in the slot we need
                if (parent.character.slots[requiredItem[0]].name != requiredItem[1]) return false // Something else is equipped in the slot we need
            }
        }
    }

    // Check if we have the required class to use this skill
    if (G.skills[skill].class) {
        let skillClass = false
        for (const classType of G.skills[skill].class) {
            if (classType == parent.character.ctype) {
                skillClass = true
                break
            }
        }
        if (!skillClass) return false
    }

    // Check we have enough MP to use this skill
    let mp = 0
    if (G.skills[skill].mp) {
        mp = G.skills[skill].mp
    } else if (["attack", "heal"].includes(skill)) {
        mp = parent.character.mp_cost
    }
    if (parent.character.mp < mp) return false

    // Check if the skill is on cooldown
    // if (!parent.next_skill) return false // TODO: I don't think that this is possible?
    if (parent.next_skill[skill] === undefined) return true
    const skillShare = G.skills[skill].share
    if (skillShare) return parent.next_skill[skillShare] ? (Date.now() >= parent.next_skill[skillShare].getTime()) : true
    return Date.now() >= parent.next_skill[skill].getTime()
}

export function getEntities(
    { canAttackUsWithoutMoving, canKillInOneHit, canMoveTo, isAttacking, isAttackingParty, isAttackingUs, isCtype, isMonster, isMonsterType, isMoving, isNPC, isPartyMember, isPlayer, isRIP, isWithinDistance }: {
        canAttackUsWithoutMoving?: boolean;
        canKillInOneHit?: boolean;
        canMoveTo?: boolean;
        isAttacking?: boolean;
        isAttackingParty?: boolean;
        isAttackingUs?: boolean;
        isCtype?: CharacterType;
        isMonster?: boolean;
        /** If provided a list of MonsterTypes, it will return entities only matching those types */
        isMonsterType?: MonsterName[];
        isMoving?: boolean;
        isNPC?: boolean;
        isPartyMember?: boolean;
        isPlayer?: boolean;
        isRIP?: boolean;
        isWithinDistance?: number;
    }): Entity[] {
    const entities: Entity[] = []

    const isPVP = is_pvp()

    for (const id in parent.entities) {
        const entity = parent.entities[id]
        const d = distance(parent.character, entity)

        // Can attack us without moving
        if (canAttackUsWithoutMoving === true && entity.range > d) continue // The distance between us and it is greater than their attack range
        if (canAttackUsWithoutMoving === false && entity.range <= d) continue // They can't attack us

        // Can we kill it in one hit
        if (canKillInOneHit === true && calculateDamageRange(parent.character, entity)[0] > entity.hp) continue
        if (canKillInOneHit === false && calculateDamageRange(parent.character, entity)[0] <= entity.hp) continue

        // Can move to
        if (canMoveTo === true && !can_move_to(entity.real_x, entity.real_y)) continue
        if (canMoveTo === false && can_move_to(entity.real_x, entity.real_y)) continue

        // Attacking
        if (isAttacking === true && entity.type == "monster" && !entity.target) continue // No target == not attacking anything
        if (isAttacking === false && entity.type == "monster" && entity.target) continue // Has target == attacking something
        if (isAttacking === true && entity.type == "character" && !entity.target) continue // NOTE: This isn't guaranteed to be set if a player is attacking something, because they don't need to set_target in order to attack.

        // Attacking someone in our party
        if (isAttackingParty === true && entity.type == "monster" && !parent.party_list.includes(entity.target)) continue // Not attacking a party member
        if (isAttackingParty === false && entity.type == "monster" && parent.party_list.includes(entity.target)) continue // Attacking a party member
        if (isAttackingParty === true && entity.type == "character" && !isPVP) continue // Not PVP == can't attack us
        if (isAttackingParty === true && entity.type == "character" && parent.party_list.includes(id)) continue // Can't (shouldn't?) attack us, they're in our party
        if (isAttackingParty === true && parent.character.name == "Wizard") continue // Assume Wizard won't attack us
        // TODO: See if there's a way we can tell if a player is attacking in PVP. Until then, assume they are.

        // Attacking us
        if (isAttackingUs === true && entity.type == "monster" && entity.target != parent.character.name) continue // Not targeting us
        if (isAttackingUs === false && entity.type == "monster" && entity.target == parent.character.name) continue // Is targeting us
        if (isAttackingUs === true && entity.type == "character" && !isPVP) continue // Not PVP == can't attack us
        if (isAttackingUs === true && entity.type == "character" && parent.party_list.includes(id)) continue // Can't (shouldn't?) attack us, they're in our party
        if (isAttackingUs === true && parent.character.name == "Wizard") continue // Assume Wizard won't attack us

        // TODO: See if there's a way we can tell if a player is attacking in PVP. Until then, assume they are.

        // Is of character type
        if (isCtype !== undefined && !entity.ctype) continue
        if (isCtype !== undefined && entity.ctype != isCtype) continue

        // Is Monster
        if (isMonster === true && entity.type != "monster") continue
        if (isMonster === false && entity.type == "monster") continue

        // Is Monster Type
        if (isMonsterType !== undefined && !entity.mtype) continue
        if (isMonsterType !== undefined && !isMonsterType.includes(entity.mtype)) continue

        // Is Moving
        if (isMoving === true && !entity.moving) continue
        if (isMoving === false && entity.moving) continue

        // Is NPC
        if (isNPC === true && entity.type != "character") continue
        if (isNPC === true && entity.type == "character" && !entity.npc) continue

        // Is party member
        if (isPartyMember === true && !parent.party_list.includes(id)) continue
        if (isPartyMember === false && parent.party_list.includes(id)) continue

        // Is Player
        if (isPlayer === true && entity.type != "character") continue
        if (isPlayer === true && entity.npc) continue

        // Is dead
        if (isRIP === true && !entity.rip) continue
        if (isRIP === false && entity.rip) continue

        // Within Distance
        if (isWithinDistance !== undefined && d > isWithinDistance) continue // Further than said distance

        entities.push(entity)
    }
    return entities
}

export function getVisibleMonsterTypes(): Set<MonsterName> {
    const monsterTypes = new Set<MonsterName>()
    for (const id in parent.entities) {
        const entity = parent.entities[id]
        if (entity.mtype) monsterTypes.add(entity.mtype)
    }
    return monsterTypes
}

export function sendMassCM(names: string[], data: any): void {
    for (const name of names) {
        send_cm(name, data)
    }
}

export function getMonsterSpawns(type: MonsterName): PositionReal[] {
    const spawnLocations: PositionReal[] = []
    for (const id in G.maps) {
        const map = G.maps[id as MapName]
        if (map.instance) continue
        for (const monster of map.monsters || []) {
            if (monster.type != type) continue
            if (monster.boundary) {
                spawnLocations.push({ "map": id as MapName, "x": (monster.boundary[0] + monster.boundary[2]) / 2, "y": (monster.boundary[1] + monster.boundary[3]) / 2 })
            } else if (monster.boundaries) {
                for (const boundary of monster.boundaries) {
                    spawnLocations.push({ "map": boundary[0], "x": (boundary[1] + boundary[3]) / 2, "y": (boundary[2] + boundary[4]) / 2 })
                }
            }
        }
    }

    return spawnLocations
}

export function getRandomMonsterSpawn(type: MonsterName): PositionReal {
    const monsterSpawns = getMonsterSpawns(type)
    return monsterSpawns[Math.trunc(Math.random() * monsterSpawns.length)]
}

export function getClosestMonsterSpawn(type: MonsterName): PositionReal {
    const monsterSpawns = getMonsterSpawns(type)
    let closestSpawnDistance = Number.MAX_VALUE
    let closestSpawn
    for (const spawn of monsterSpawns) {
        const d = distance(parent.character, spawn)
        if (d < closestSpawnDistance) {
            closestSpawnDistance = d
            closestSpawn = spawn
        }
    }

    return closestSpawn
}

// TODO: Change this to a custom typed object instead of an array
export function getNearbyMonsterSpawns(position: IPosition, radius = 1000): MonsterSpawnPosition[] {
    const locations: MonsterSpawnPosition[] = []
    const map = G.maps[position.map]
    if (map.instance) return
    for (const monster of map.monsters || []) {
        if (monster.boundary) {
            const location = { "map": position.map as MapName, "x": (monster.boundary[0] + monster.boundary[2]) / 2, "y": (monster.boundary[1] + monster.boundary[3]) / 2 }
            if (distance(position, location) < radius) locations.push({ ...location, monster: monster.type })
            else if (position.x >= monster.boundary[0] && position.x <= monster.boundary[2] && position.y >= monster.boundary[1] && position.y <= monster.boundary[3]) locations.push({ ...location, monster: monster.type })
        } else if (monster.boundaries) {
            for (const boundary of monster.boundaries) {
                if (boundary[0] != position.map) continue
                const location = { "map": position.map, "x": (boundary[1] + boundary[3]) / 2, "y": (boundary[2] + boundary[4]) / 2 }
                if (distance(position, location) < radius) locations.push({ ...location, monster: monster.type })
                else if (position.x >= boundary[1] && position.x <= boundary[3] && position.y >= boundary[2] && position.y <= boundary[4]) locations.push({ ...location, monster: monster.type })
            }
        }
    }

    // Sort them so the closest one is first.
    locations.sort((a, b) => {
        return distance(position, a) > distance(position, b) ? 1 : -1
    })

    return locations
}

/** Only works for items sold by NPCs */
// TODO: Improve to find the NPC that sells the item
export async function buyIfNone(itemName: ItemName, targetLevel = 9, targetQuantity = 2): Promise<void> {
    if (!findItem("computer")) {
        let foundNPCBuyer = false
        if (!G.maps[parent.character.map].npcs) return
        for (const npc of G.maps[parent.character.map].npcs) {
            if (G.npcs[npc.id].role != "merchant") continue
            if (distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundNPCBuyer = true
                break
            }
        }
        if (!foundNPCBuyer) return // Can't buy things, nobody is near.
    }

    let items = findItemsWithLevel(itemName, targetLevel)
    if (items.length >= targetQuantity) return // We have enough

    items = findItems(itemName)
    if (items.length < targetQuantity) return buy_with_gold(itemName, targetQuantity - items.length) // Buy more if we don't have any to upgrade
}
