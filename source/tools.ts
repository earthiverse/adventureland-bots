import { MapName } from "./definitions/adventureland"

export class Tools {
    public static distance(a: { x: number, y: number, map?: MapName }, b: { x: number, y: number, map?: MapName }): number {
        if (a.map && b.map) {
            if (a.map != b.map) return Number.MAX_VALUE
        }
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
    }
}