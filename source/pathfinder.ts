import { ALPosition, MonsterName } from "./definitions/adventureland";
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
    public movementTarget: MonsterName | string;

    constructor(factor: number = 8, padding = [10, 8, 7, 8]) {
        this.factor = factor;
        this.padding = padding;
    }

    public saferMoveMonster(c: Character, to: MonsterName) {
        if (smart.moving) return; // Already moving somewhere

        this.movementTarget = to;

        // // TODO: Find monster spawn so we can use our own pathfinding
        // let monsterSpawn;
        // for (let ms of G.maps[parent.character.map].monsters) {
        //     if (ms.type == to) {
        //         monsterSpawn = ms;
        //         break;
        //     }
        // }

        if (c.newTargetPriority[to] && c.newTargetPriority[to].map && c.newTargetPriority[to].x && c.newTargetPriority[to].y) {
            let p: ALPosition = {
                map: c.newTargetPriority[to].map,
                x: c.newTargetPriority[to].x,
                y: c.newTargetPriority[to].y
            }
            if (distance(parent.character, p) < 50) return; // Already here
            // if (p.map == parent.character.map) {
            //     let movements = this.findMovements(parent.character, p)
            //     if(movements) c.movementQueue = movements;
            // } else {
            smart_move(p)
            // }
            // } else if (monsterSpawn) {
            // if (distance(parent.character, smart) < 50) return; // Already here
        } else {
            if (distance(parent.character, smart) < 50) return; // Already here
            smart_move(to);
        }
    }

    public saferMovePlace(c: Character, to: string) {
        if (smart.moving) return; // Already moving somewhere

        this.movementTarget = to;

        smart_move(to);
    }

    public findMovements(from: ALPosition, to: ALPosition): ALPosition[] {
        if (from.map && to.map && from.map != to.map) {
            game_log("Cross map pathfinding is not yet supported!");
            return;
        }
        if (!from.map) from.map = parent.character.map; // Use the map on the character
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

        let alPath: ALPosition[] = [];

        let pathfinderFromX = Math.floor((-G.geometry[mapName].min_x + from.x) / this.factor)
        let pathfinderFromY = Math.floor((-G.geometry[mapName].min_y + from.y) / this.factor)
        for (let i = 1; i < 6; i++) {
            if (grid.isWalkableAt(pathfinderFromX, pathfinderFromY)) {
                break;
            } else if (grid.isWalkableAt(pathfinderFromX + i, pathfinderFromY)) {
                pathfinderFromX += i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderFromX * this.factor), y: G.geometry[mapName].min_y + (pathfinderFromY * this.factor) })
                break;
            } else if (grid.isWalkableAt(pathfinderFromX, pathfinderFromY + i)) {
                pathfinderFromY += i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderFromX * this.factor), y: G.geometry[mapName].min_y + (pathfinderFromY * this.factor) })
                break;
            } else if (grid.isWalkableAt(pathfinderFromX - i, pathfinderFromY)) {
                pathfinderFromX -= i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderFromX * this.factor), y: G.geometry[mapName].min_y + (pathfinderFromY * this.factor) })
                break;
            } else if (grid.isWalkableAt(pathfinderFromX, pathfinderFromY + i)) {
                pathfinderFromY -= i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderFromX * this.factor), y: G.geometry[mapName].min_y + (pathfinderFromY * this.factor) })
                break;
            }
        }
        let pathfinderToX = Math.floor((-G.geometry[mapName].min_x + to.x) / this.factor)
        let pathfinderToY = Math.floor((-G.geometry[mapName].min_y + to.y) / this.factor)
        for (let i = 1; i < 6; i++) {
            if (grid.isWalkableAt(pathfinderToX, pathfinderFromY)) {
                break;
            } else if (grid.isWalkableAt(pathfinderToX + i, pathfinderToY)) {
                pathfinderToX += i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderToX * this.factor), y: G.geometry[mapName].min_y + (pathfinderToY * this.factor) })
                break;
            } else if (grid.isWalkableAt(pathfinderToX, pathfinderToY + i)) {
                pathfinderToY += i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderToX * this.factor), y: G.geometry[mapName].min_y + (pathfinderToY * this.factor) })
                break;
            } else if (grid.isWalkableAt(pathfinderToX - i, pathfinderToY)) {
                pathfinderToX -= i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderToX * this.factor), y: G.geometry[mapName].min_y + (pathfinderToY * this.factor) })
                break;
            } else if (grid.isWalkableAt(pathfinderToX, pathfinderToY - i)) {
                pathfinderToY -= i;
                alPath.push({ x: G.geometry[mapName].min_x + (pathfinderToX * this.factor), y: G.geometry[mapName].min_y + (pathfinderToY * this.factor) })
                break;
            }
        }

        let path = finder.findPath(pathfinderFromX, pathfinderFromY, pathfinderToX, pathfinderToY, grid);
        let newPath: any[] = PF.Util.smoothenPath(grid, path);
        if (!newPath) return; // Failed finding a path...

        // Remove the first position that indicates where we started from
        newPath.shift();

        for (let path of newPath)
            alPath.push({ x: G.geometry[mapName].min_x + (path[0] * this.factor), y: G.geometry[mapName].min_y + (path[1] * this.factor) })

        return alPath;
    }

    public findNextMovement(from: ALPosition, to: ALPosition): ALPosition {
        let path = this.findMovements(from, to);
        if (path)
            return path[0];
    }

    public prepareMap(mapName: string) {
        if (this.grids[mapName]) return; // Already generated
        
        let geometry = G.geometry[mapName]

        let width = geometry.max_x - geometry.min_x;
        let height = geometry.max_y - geometry.min_y;

        let grid = new PF.Grid(Math.ceil(width / this.factor), Math.ceil(height / this.factor));

        // Add the vertical as walls
        geometry.x_lines.forEach((line) => {
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
        })

        // Add the horizontal lines as walls
        geometry.y_lines.forEach((line) => {
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
        })

        this.grids[mapName] = grid;
    }
}