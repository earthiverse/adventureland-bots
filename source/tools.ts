import { MapName } from "./definitions/adventureland"

export class Tools {
    /**
     * Returns the distance between two positions.
     * @param a Position 1
     * @param b Position 2
     */
    public static distance(a: { x: number, y: number, map?: MapName }, b: { x: number, y: number, map?: MapName }): number {
        if ((a.map && b.map) && (a.map !== b.map)) return Number.MAX_VALUE

        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
    }
}