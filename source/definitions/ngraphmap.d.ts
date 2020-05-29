import { MapName, IPosition } from "./adventureland"

export type Grid = number[][]
export type Grids = { [T in MapName]?: Grid }

export type NodeData = IPosition & {
    map: MapName
}

export type LinkData = {
    type: "walk"
} | {
    type: "transport"
    spawn: number
}