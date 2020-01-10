import { IPosition, MonsterType, IPositionReal, MapName } from "./definitions/adventureland";
import { Character } from "./character";
let PF = require("pathfinding")

export class Pathfinder {
    /**
     * A number that determines the scale of the grid to the actual map
     */
    private factor: number;
    /**
     * Number(s) that indicate how much padding to give to walls.
     */
    private padding: number[];
    private grids: any = {};
    public movementTarget: MonsterType;

    //constructor(factor: number = 8, padding = [10, 8, 7, 8]) {
    constructor(factor: number = 8, padding = [11, 9, 8, 9]) {
        this.factor = factor;
        this.padding = padding;
    }

    public saferMove(to: IPosition) {
        if (smart.moving) return; // Already moving somewhere
        if (distance(parent.character, to) < 10) return; // Already nearby
        if (!to.map) to.map = parent.character.map // Add a map if we don't have one

        // Try to use our own pathfinding if we are on the same map
        if (parent.character.map == to.map) {
            // Check if we can just walk in a straight line to reach the spot
            if (can_move_to(to.x, to.y)) {
                move(to.x, to.y)
                return;
            }

            // Pathfind
            let movements = this.findMovements(parent.character, to as IPositionReal)
            if (movements) {
                // Move to the second last point.
                // If it's a monster, we'll start kiting it. 
                // If it's a place, this function will be called again, and we'll just walk in a straight line to the final point
                smart.plot = movements.slice(0, movements.length - 1)
                smart.found = true
                smart.moving = true
                smart.searching = false
                smart.start_x = parent.character.real_x
                smart.start_y = parent.character.real_y
                smart.x = movements[movements.length - 1].x
                smart.y = movements[movements.length - 1].y
                smart.map = to.map
                return;
            }
        }

        smart.use_town = true
        smart_move(to);
    }

    public findMovements(from: IPositionReal, to: IPositionReal): IPositionReal[] {
        if (from.map && to.map && from.map != to.map) {
            game_log("Cross map pathfinding is not yet supported!");
            return;
        }
        let mapName = from.map;

        if (from.real_x) from.x = from.real_x
        if (from.real_y) from.y = from.real_y
        if (to.real_x) to.x = to.real_x
        if (to.real_y) to.y = to.real_y

        if (!this.grids[mapName]) this.prepareMap(mapName); // Prepare the map if we haven't prepared it yet.
        let grid = this.grids[mapName].clone();

        let finder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles
        });

        let alPath: IPositionReal[] = [];

        // If we're too close to a wall our pathfinding fails. This next section finds us the closest walkable space so we can start searching from there
        let [pathfinderFromX, pathfinderFromY] = this.realToCell(from.x, from.y, mapName)
        if (!grid.isWalkableAt(pathfinderFromX, pathfinderFromY)) {
            let dx = 1
            let dy = 0
            let segment_length = 1
            let segment_passed = 0;
            for (let k = 0; k < 100 /* check 100 grid spots */; k++) {
                if (grid.isWalkableAt(pathfinderFromX, pathfinderFromY)) {
                    alPath.push(this.cellToReal(pathfinderFromX, pathfinderFromY, parent.character.map))
                    break;
                }

                // Make a step
                pathfinderFromX += dx;
                pathfinderFromY += dy;
                segment_passed += 1;
                if (segment_passed == segment_length) {
                    // Done with current segment
                    segment_passed = 0

                    // Rotate directions
                    let buffer = dx
                    dx = -dy
                    dy = buffer;

                    // Increase segment length if necessary
                    if (dy == 0) {
                        segment_length += 1;
                    }
                }
            }
        }

        let [pathfinderToX, pathfinderToY] = this.realToCell(to.x, to.y, mapName)
        if (!grid.isWalkableAt(pathfinderToX, pathfinderToY)) {
            let dx = 1
            let dy = 0
            let segment_length = 1
            let segment_passed = 0;
            for (let k = 0; k < 100 /* check 100 grid spots */; k++) {
                alPath.push(this.cellToReal(pathfinderToX, pathfinderToY, parent.character.map))
                break;
            }

            // Make a step
            pathfinderToX += dx;
            pathfinderToY += dy;
            segment_passed += 1;
            if (segment_passed == segment_length) {
                // Done with current segment
                segment_passed = 0

                // Rotate directions
                let buffer = dx
                dx = -dy
                dy = buffer;

                // Increase segment length if necessary
                if (dy == 0) {
                    segment_length += 1;
                }
            }
        }

        let path = finder.findPath(pathfinderFromX, pathfinderFromY, pathfinderToX, pathfinderToY, grid);
        if (path.length)
            try {
                let newPath: any[] = PF.Util.smoothenPath(grid, path);

                // Remove the first position that indicates where we started from
                newPath.shift();

                for (let path of newPath)
                    alPath.push(this.cellToReal(path[0], path[1], parent.character.map))

                return alPath;
            } catch (error) {
                console.error(error)
                return
            }
    }

    public findNextMovement(from: IPositionReal, to: IPositionReal): IPositionReal {
        let path = this.findMovements(from, to);
        if (path.length)
            return path[0];
    }

    public cellToReal(x: number, y: number, map: MapName): IPositionReal {
        return { "map": map, x: G.geometry[map].min_x + (x * this.factor), y: G.geometry[map].min_y + (y * this.factor) }
    }

    public realToCell(x: number, y: number, map: MapName): [number, number] {
        return [Math.round((-G.geometry[map].min_x + x) / this.factor), Math.round((-G.geometry[map].min_y + y) / this.factor)]
    }

    public prepareMap(mapName: MapName) {
        if (this.grids[mapName]) return; // Already generated

        let geometry = G.geometry[mapName]
        let mapInfo = G.maps[mapName]

        let width = geometry.max_x - geometry.min_x;
        let height = geometry.max_y - geometry.min_y;

        let grid = new PF.Grid(Math.ceil(width / this.factor), Math.ceil(height / this.factor));

        // Add the vertical as walls
        for (let line of geometry.x_lines) {
            let x_start = -geometry.min_x + line[0] - this.padding[3]; // left
            if (x_start < 0) x_start = 0
            let x_end = -geometry.min_x + line[0] + this.padding[1]; // right
            if (x_end > width) x_end = width
            let y_start = -geometry.min_y + (line[1] > line[2] ? line[2] : line[1]) - this.padding[2]; // bottom
            if (y_start < 0) y_start = 0
            let y_end = -geometry.min_y + (line[1] > line[2] ? line[1] : line[2]) + this.padding[0]; // top
            if (y_end > height) y_end = height

            for (let x = Math.floor(x_start / this.factor); x < Math.ceil(x_end / this.factor); x++) {
                for (let y = Math.floor(y_start / this.factor); y < Math.ceil(y_end / this.factor); y++) {
                    grid.setWalkableAt(x, y, false)
                }
            }
        }

        // Add the horizontal lines as walls
        for (let line of geometry.y_lines) {
            let x_start = -geometry.min_x + (line[1] > line[2] ? line[2] : line[1]) - this.padding[3]; // left
            if (x_start < 0) x_start = 0
            let x_end = -geometry.min_x + (line[1] > line[2] ? line[1] : line[2]) + this.padding[1]; // right
            if (x_end > width) x_end = width
            let y_start = -geometry.min_y + line[0] - this.padding[2]; // bottom
            if (y_start < 0) y_start = 0
            let y_end = -geometry.min_y + line[0] + this.padding[0]; // top
            if (y_end > height) y_end = height

            for (let x = Math.floor(x_start / this.factor); x < Math.ceil(x_end / this.factor); x++) {
                for (let y = Math.floor(y_start / this.factor); y < Math.ceil(y_end / this.factor); y++) {
                    grid.setWalkableAt(x, y, false)
                }
            }
        }

        // // Find all spawns
        // const zeros = (m: number, n: number) => [...Array(m)].map(() => Array(n).fill(false));
        // let walkableAt = zeros(width, height)
        // let unvisitedNodes: any[] = []
        // let visitedNodes: any[] = []
        // for (let spawn of mapInfo.spawns) {
        //     let [x, y] = this.realToCell(spawn[0], spawn[1], mapName)

        //     let node = grid.getNodeAt(x, y)
        //     if (grid.isWalkableAt(node.x, node.y)) unvisitedNodes.push(node)
        // }

        // let currentNode = unvisitedNodes[0]
        // while (currentNode) {
        //     let neighbors = grid.getNeighbors(currentNode, PF.DiagonalMovement.OnlyWhenNoObstacles)
        //     for (let neighbor of neighbors) {
        //         if (!visitedNodes.includes(neighbor)) {
        //             if (!unvisitedNodes.includes(neighbor)) {
        //                 unvisitedNodes.push(neighbor)
        //             }
        //         }
        //     }

        //     walkableAt[currentNode.x][currentNode.y] = true
        //     visitedNodes.push(currentNode)
        //     unvisitedNodes.shift()
        //     currentNode = unvisitedNodes[0]
        // }

        // for (let x = 0; x < width; x++) {
        //     for (let y = 0; y < height; y++) {
        //         if (!walkableAt[x][y]) {
        //             grid.setWalkableAt(x, y, false)
        //         }
        //     }
        // }


        this.grids[mapName] = grid;
    }

    public drawCircles() {
        clear_drawings()

        if (!this.grids[parent.character.map]) this.prepareMap(parent.character.map); // Prepare the map if we haven't prepared it yet.
        let grid = this.grids[parent.character.map].clone()

        for (let x = 0; x < grid.width; x++) {
            for (let y = 0; y < grid.height; y++) {
                if (!grid.isWalkableAt(x, y))
                    draw_circle(x, y, this.factor / 2, 1, 0x00FF00);
            }
        }
    }
}