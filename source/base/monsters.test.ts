import type { GMap } from "alclient"
import { isInstanceMonsterKilled } from "./monsters.js"

const tombMap = {
    monsters: [
        { count: 1, type: "gredpro" },
        { count: 1, type: "ggreenpro" },
        { count: 1, type: "gbluepro" },
        { count: 1, type: "gpurplepro" },
    ],
} as unknown as GMap

const cryptMap = {
    monsters: [
        { count: 1, type: "a1" },
        { count: 7, type: "vbat" },
    ],
} as unknown as GMap

const winterInstanceMap = {
    monsters: [
        { count: 1, type: "xmagefz" },
        { count: 0, type: "xmagefi" },
        { count: 0, type: "xmagen" },
        { count: 0, type: "xmagex" },
    ],
} as unknown as GMap

const spiderInstanceMap = {
    monsters: [
        { count: 3, type: "spider" },
        { count: 3, type: "spider" },
    ],
} as unknown as GMap

test("checks per-monster spawn count for tomb, crypt, and duplicate spawn entries", () => {
    expect(isInstanceMonsterKilled("tomb", "gbluepro", undefined, tombMap)).toBe(false)
    expect(isInstanceMonsterKilled("tomb", "gbluepro", { gredpro: 1 }, tombMap)).toBe(false)
    expect(isInstanceMonsterKilled("tomb", "gbluepro", { gbluepro: 1 }, tombMap)).toBe(true)

    expect(isInstanceMonsterKilled("crypt", "vbat", { vbat: 6 }, cryptMap)).toBe(false)
    expect(isInstanceMonsterKilled("crypt", "vbat", { vbat: 7 }, cryptMap)).toBe(true)

    expect(isInstanceMonsterKilled("spider_instance", "spider", { spider: 5 }, spiderInstanceMap)).toBe(false)
    expect(isInstanceMonsterKilled("spider_instance", "spider", { spider: 6 }, spiderInstanceMap)).toBe(true)
})

test("requires 1 kill per phase for respawn_as monsters with count 0", () => {
    expect(isInstanceMonsterKilled("winter_instance", "xmagefz", { xmagefz: 1 }, winterInstanceMap)).toBe(true)
    expect(isInstanceMonsterKilled("winter_instance", "xmagefi", { xmagefz: 1 }, winterInstanceMap)).toBe(false)
    expect(isInstanceMonsterKilled("winter_instance", "xmagefi", { xmagefi: 1, xmagefz: 1 }, winterInstanceMap)).toBe(
        true,
    )
})
