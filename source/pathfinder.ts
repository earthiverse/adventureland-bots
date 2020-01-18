import { IPosition, MonsterType, IPositionReal, MapName } from "./definitions/adventureland"
import { AStarSmartMove } from "./astarsmartmove"

export class Pathfinder {
    public movementTarget: MonsterType;
    public astar = new AStarSmartMove()

    public saferMove(to: IPosition) {
        if (smart.moving || this.astar.isMoving()) return; // Already moving somewhere
        if (distance(parent.character, to) < 10) return; // Already nearby
        if (!to.map) to.map = parent.character.map

        // Check if we can just walk in a straight line to reach the spot
        if (parent.character.map == to.map && can_move_to(to.x, to.y)) {
            move(to.x, to.y)
            return
        }

        this.astar.astar_smart_move({
            map: to.map,
            x: to.x,
            y: to.y
        })
    }
}