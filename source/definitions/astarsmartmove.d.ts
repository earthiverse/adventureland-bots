import { PositionReal, MapName } from "./adventureland"

export type FromMap = Map<string, SmartMoveNode>
export type ScoreMap = Map<string, number>
export type VisitedMap = Set<string>

export type SmartMoveNode = PositionReal & {
    // Transporter information
    transportMap?: MapName;
    transportType?: "door" | "teleport";
    transportS?: number;

    // Town information
    town?: boolean;
}