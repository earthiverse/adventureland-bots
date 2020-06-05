import { MapName } from "./adventureland"

export type Grid = number[][]
export type Grids = { [T in MapName]?: Grid }

export type NodeData = {
    map: MapName,
    x: number,
    y: number
}

export type LinkData = {
    type: "transport"
    spawn: number
} | {
    type: "town"
}

export type PathData = [NodeData, NodeData, LinkData][]