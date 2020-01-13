import { IPositionReal } from "./adventureland";

export type FromMap = { [T in string]: SmartMoveNode }
export type ScoreMap = { [T in string]: number }
export type VisitedMap = { [T in string]: boolean }

export type SmartMoveNode = IPositionReal & {
    priority?: number
    from?: SmartMoveNode

    // Transporter information
    transport?: boolean
    s?: number

    // Town information
    town?: boolean
}