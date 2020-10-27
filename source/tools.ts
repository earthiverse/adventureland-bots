import { ItemInfo, ItemName, MapName } from "./definitions/adventureland"
import { ActionData, CharacterData, EntityData } from "./definitions/adventureland-server"
import { Game } from "./Game.js"

export class Tools {
    /**
     * Returns the *minimum* gold required to obtain the given item.
     * @param item 
     */
    // TODO: Add option to add 
    public static async calculateCost(item: ItemInfo): Promise<number> {
        const G = await Game.getGData()
        const gInfo = G.items[item.name]

        // Base cost
        let cost = gInfo.g

        // Cost to upgrade using lowest level scroll
        if (gInfo.compound) {
            for (let i = 0; i < item.level; i++) {
                cost *= 3 // Three of the current level items are required
                let scrollLevel = 0
                for (const grade of gInfo.grades) {
                    if (item.level < grade) {
                        const scrollInfo = G.items[`cscroll${scrollLevel}` as ItemName]
                        cost += scrollInfo.g
                        break
                    }
                    scrollLevel++
                }
            }
        } else if (gInfo.upgrade) {
            for (let i = 0; i < item.level; i++) {
                let scrollLevel = 0
                for (const grade of gInfo.grades) {
                    if (item.level < grade) {
                        const scrollInfo = G.items[`scroll${scrollLevel}` as ItemName]
                        cost += scrollInfo.g
                        break
                    }
                    scrollLevel++
                }
            }
        }

        return cost
    }

    /**
     * The first element is the minimum damage the attacker could do. The second element is the maximum damage the attacker could do.
     * @param attacker 
     * @param defender 
     */
    public static calculateDamageRange(attacker: EntityData | CharacterData, defender: EntityData | CharacterData): [number, number] {
        /**
         * From Adventureland's common_functions.js
         * @param a The difference between armor and armor piercing, or resistance and resistance piercing.
         */
        function damage_multiplier(a) {
            return Math.min(1.32, Math.max(.05, 1 - (.001 * Math.max(0, Math.min(100, a)) + .001 * Math.max(0, Math.min(100, a - 100)) + .00095 * Math.max(0, Math.min(100, a - 200)) + .0009 * Math.max(0, Math.min(100, a - 300)) + .00082 * Math.max(0, Math.min(100, a - 400)) + .0007 * Math.max(0, Math.min(100, a - 500)) + .0006 * Math.max(0, Math.min(100, a - 600)) + .0005 * Math.max(0, Math.min(100, a - 700)) + .0004 * Math.max(0, a - 800)) + .001 * Math.max(0, Math.min(50, 0 - a)) + .00075 * Math.max(0, Math.min(50, -50 - a)) + .0005 * Math.max(0, Math.min(50, -100 - a)) + .00025 * Math.max(0, -150 - a)))
        }

        if (defender["1hp"]) {
            return [1, 1]
        }

        let baseDamage: number = attacker.attack

        if ((attacker as CharacterData).ctype == "priest") baseDamage *= 0.4 // Priests only do 40% damage

        if (attacker.damage_type == "physical") baseDamage *= damage_multiplier(defender.armor - attacker.apiercing)
        else if (attacker.damage_type == "magical") baseDamage *= damage_multiplier(defender.resistance - attacker.rpiercing)
        return [baseDamage * 0.9, baseDamage * 1.1]
    }

    public static async calculateItemGrade(item: ItemInfo): Promise<number> {
        const G = await Game.getGData()
        const gInfo = G.items[item.name]
        if (!gInfo.grades) return
        let level = 0
        for (const grade of gInfo.grades) {
            if (item.level < grade) break
            level++
        }
        return level
    }

    /**
     * Returns the distance between two positions.
     * @param a Position 1
     * @param b Position 2
     */
    public static distance(a: { x: number, y: number, map?: MapName }, b: { x: number, y: number, map?: MapName }): number {
        if ((a.map && b.map) && (a.map !== b.map)) return Number.MAX_VALUE

        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
    }

    /**
     * Returns true if it's a guaranteed kill
     */
    public static async isGuaranteedKill(character: CharacterData, entity: EntityData): Promise<boolean> {
        if (entity["1hp"]) {
            if (entity.hp == 1) return true
            else return false
        }

        // Check if it can heal
        const G = await Game.getGData()
        const gInfo = G.monsters[entity.type]
        if (gInfo.abilities && gInfo.abilities.self_healing) return false

        if (character.damage_type == "magical" && entity.reflection !== undefined) return false
        if (character.damage_type == "physical" && entity.evasion !== undefined) return false

        return Tools.calculateDamageRange(character, entity)[0] > entity.hp
    }

    /**
     * Returns true if the entity will burn to death without taking any additional damage
     * TODO: Check if the entity has healing abilities
     * @param entity The entity to check
     */
    public static willBurnToDeath(entity: EntityData): boolean {
        if (entity.s.burned) {
            const burnTime = Math.max(0, (entity.s.burned.ms - 500)) / 1000
            const burnDamage = burnTime * entity.s.burned.intensity
            if (burnDamage > entity.hp) return true
        }
        return false
    }

    /**
     * Returns true if the entity will die to the already incoming projectiles
     * @param entity 
     * @param projectiles 
     */
    public static willDieToProjectiles(entity: EntityData, projectiles: Map<string, ActionData>): boolean {
        let incomingProjectileDamage = 0
        for (const projectile of projectiles.values()) {
            if (projectile.target == entity.id) incomingProjectileDamage += projectile.damage * 0.9
            if (incomingProjectileDamage > entity.hp) return true
        }
        return false
    }
}