import { PositionReal } from "./definitions/adventureland"
import { AStarSmartMove } from "./astarsmartmove"

export class Pathfinder {
    private astar = new AStarSmartMove()

    public stop(): void {
        stop()
        this.astar.stop()
    }

    public isMoving(): boolean {
        return this.astar.isMoving()
    }

    public saferMove(to: PositionReal): void {
        if (smart.moving || this.astar.isMoving()) return // Already moving somewhere
        if (distance(parent.character, to) < 10) return // Already nearby

        // Check if we can just walk in a straight line to reach the spot
        if (parent.character.map == to.map && to.real_x && to.real_y && can_move_to(to.real_x, to.real_y)) {
            move(to.real_x, to.real_y)
            return
        } else if (parent.character.map == to.map && to.real_x == undefined && to.real_y == undefined && can_move_to(to.x, to.y)) {
            move(to.x, to.y)
            return
        }

        this.astar.smartMove(to as PositionReal)
    }
}