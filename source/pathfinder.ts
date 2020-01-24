import { IPosition, MonsterType, IPositionReal, MapName } from "./definitions/adventureland"
import { AStarSmartMove } from "./astarsmartmove"

export class Pathfinder {
    public movementTarget: MonsterType;
    public astar = new AStarSmartMove()

    public saferMove(to: IPositionReal) {
        if (smart.moving || this.astar.isMoving()) return // Already moving somewhere
        if (distance(parent.character, to) < 10) return // Already nearby

        // Check if we can just walk in a straight line to reach the spot
        if (parent.character.map == to.map && to.real_x && to.real_y && can_move_to(to.real_x, to.real_y)) {
            move(to.real_x, to.real_y)
            return
        }

        this.astar.astar_smart_move(to as IPositionReal)
    }
}