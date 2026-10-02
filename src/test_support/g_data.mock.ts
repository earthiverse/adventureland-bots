import type { GData, ItemName, MonsterName, SkillName } from "alclient"

/**
 * High-fidelity, lightweight mock snapshot of AdventureLand GData.
 * Allows unit and integration tests to run 100% offline in sub-seconds.
 */
export const createMockGData = (): GData => {
    return ({
        achievements: {} as any,
        animations: {} as any,
        classes: {
            warrior: { base_slots: {}, damage_type: "physical", description: "Warrior" },
            mage: { base_slots: {}, damage_type: "magical", description: "Mage" },
            priest: { base_slots: {}, damage_type: "magical", description: "Priest" },
            ranger: { base_slots: {}, damage_type: "physical", description: "Ranger" },
            paladin: { base_slots: {}, damage_type: "physical", description: "Paladin" },
            rogue: { base_slots: {}, damage_type: "physical", description: "Rogue" },
            merchant: { base_slots: {}, damage_type: "physical", description: "Merchant" },
        } as any,
        conditions: {
            auth: { bad: false, name: "Authenticated" },
            fullguard: { bad: false, name: "Full Guard" },
            fullguardx: { bad: false, name: "Full Guard X" },
            holidayspirit: { bad: false, name: "Holiday Spirit" },
            anniversary_kiss: { bad: false, name: "Anniversary Kiss" },
            anniversary_visit: { bad: false, name: "Anniversary Visit" },
        } as any,
        craft: {} as any,
        dismantle: {} as any,
        drops: {} as any,
        events: {} as any,
        games: {} as any,
        geometry: {
            main: {
                default: [0, 0],
                max_x: 1000,
                max_y: 1000,
                min_x: -1000,
                min_y: -1000,
                plines: [],
                x_lines: [],
                y_lines: [],
            },
        } as any,
        images: {} as any,
        items: {
            // Potions
            hpot0: { g: 20, name: "HP Potion 0", type: "pot", gives: [["hp", 200]] },
            hpot1: { g: 100, name: "HP Potion 1", type: "pot", gives: [["hp", 400]] },
            mpot0: { g: 20, name: "MP Potion 0", type: "pot", gives: [["mp", 300]] },
            mpot1: { g: 100, name: "MP Potion 1", type: "pot", gives: [["mp", 500]] },

            // Scrolls
            scroll0: { g: 1000, grade: 0, name: "Scroll of Upgrade", type: "uscroll" },
            scroll1: { g: 40000, grade: 1, name: "Scroll of Upgrade II", type: "uscroll" },
            cscroll0: { g: 1000, grade: 0, name: "Scroll of Combination", type: "cscroll" },
            cscroll1: { g: 240000, grade: 1, name: "Scroll of Combination II", type: "cscroll" },
            offering: { g: 3200000, grade: 0, name: "Offering", type: "offering" },

            // Basic Weapons & Armor (grade 0)
            sword: { g: 1000, grade: 0, grades: [7, 9, 10, 11], name: "Short Sword", type: "weapon", upgrade: true, damage: 20, wtype: "sword" },
            pants: { g: 2000, grade: 0, grades: [7, 9, 10, 11], name: "Pants", type: "armor", upgrade: true, armor: 5 },
            coat: { g: 4000, grade: 0, grades: [7, 9, 10, 11], name: "Coat", type: "armor", upgrade: true, armor: 10 },
            shoes: { g: 1500, grade: 0, grades: [7, 9, 10, 11], name: "Shoes", type: "armor", upgrade: true, speed: 3 },
            gloves: { g: 1500, grade: 0, grades: [7, 9, 10, 11], name: "Gloves", type: "armor", upgrade: true, attack: 2 },

            // Accessories (compoundable)
            ringsj: { g: 8000, grade: 0, grades: [7, 9, 10, 11], name: "Stupendous Ring", type: "ring", compound: true, int: 2 },
            hpbelt: { g: 12000, grade: 0, grades: [7, 9, 10, 11], name: "Belt of HP", type: "belt", compound: true, hp: 80 },

            // Materials & Junk
            gslime: { g: 10, name: "Green Slime", type: "material" },
            leather: { g: 300, name: "Leather", type: "material" },
            seashell: { g: 5, name: "Seashell", type: "misc" },
        } as any,
        maps: {
            main: {
                name: "Main",
                key: "main",
                spawns: [[0, 0], [100, 200]],
                drop_list: ["hpot0", "mpot0"],
            },
            winterland: {
                name: "Winterland",
                key: "winterland",
                spawns: [[0, 0]],
            },
        } as any,
        monsters: {
            goo: {
                hp: 100,
                attack: 10,
                damage_type: "physical",
                range: 40,
                speed: 40,
                xp: 10,
                name: "Goo",
            },
            bee: {
                hp: 180,
                attack: 16,
                damage_type: "physical",
                range: 40,
                speed: 60,
                xp: 30,
                cooperative: true,
                name: "Bee",
            },
            boar: {
                hp: 1200,
                attack: 60,
                damage_type: "physical",
                range: 50,
                speed: 50,
                xp: 400,
                name: "Boar",
            },
            plantoid: {
                hp: 2400,
                attack: 90,
                damage_type: "magical",
                range: 160,
                speed: 30,
                xp: 900,
                name: "Plantoid",
            },
            xmage: {
                hp: 50000,
                attack: 300,
                damage_type: "magical",
                range: 120,
                speed: 40,
                reflection: 100,
                name: "XMage",
            },
            franky: {
                hp: 2000000,
                attack: 800,
                damage_type: "physical",
                range: 120,
                speed: 40,
                special: true,
                xp: 100000,
                name: "Franky",
            },
        } as any,
        multipliers: {
            buy_to_sell: 0.5,
            secondhands_mult: 2,
        } as any,
        npcs: {} as any,
        projectiles: {} as any,
        skills: {
            attack: { mp: 0, cooldown: 1000, range: 100, name: "Attack" },
            heal: { mp: 20, cooldown: 200, range: 160, name: "Heal" },
            cleave: { mp: 30, cooldown: 1200, range: 160, name: "Cleave" },
            burst: { mp: 100, cooldown: 6000, range: 200, name: "Burst" },
            use_potion: { mp: 0, cooldown: 2000, name: "Potion" },
        } as any,
        tilesets: {} as any,
        tokens: {} as any,
    } as unknown as GData)
}
