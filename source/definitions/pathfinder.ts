import { MapName } from "./adventureland"

export type Grid = number[][]
export type Grids = { [T in MapName]?: Grid }

export type NodeData = {
    map: MapName,
    x: number,
    y: number
}

export type LinkData =
    /**
     * Used to travel through doors
     */
    {
        type: "transport"
        map: MapName
        spawn: number
    }
    /**
     * Used to travel to the spawn point of the map
     */
    | {
        type: "town"
    } |
    /**
     * Used by mages to blink to certain locations
     */
    {
        type: "blink"

    } |
    /**
     * Used when leaving cyberland (TODO: Or jail?)
     */
    {
        type: "leave"
    }
    /**
     * Normal movement
     */
    | {
        type: "move"
        x: number
        y: number
    }