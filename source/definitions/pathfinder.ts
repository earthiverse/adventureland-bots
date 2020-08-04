import { MapName } from "./adventureland"

export type Grid = number[][]
export type Grids = { [T in MapName]?: Grid }