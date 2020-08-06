import { GData, MapName, IPosition } from "./definitions/adventureland"
import { Grids, Grid } from "./definitions/pathfinder"

const UNKNOWN = 1
const UNWALKABLE = 2
const WALKABLE = 3

const BASE = {
    h: 8,
    v: 7,
    vn: 2
}

export class Pathfinder {
    public static instance: Pathfinder

    private static grids: Grids = {}
    private G: GData

    private constructor(G: GData) {
        // Private to force singleton
        this.G = G
    }

    public static getInstance(G: GData): Pathfinder {
        if (!this.instance) {
            this.instance = new Pathfinder(G)
        }
        return this.instance
    }

    public canWalk(from: IPosition, to: IPosition): boolean {
        if (from.map != to.map) return false // We can't walk across maps
        if (!Pathfinder.grids[from.map]) this.generateGrid(from.map) // Generate the grid if we haven't yet

        const grid = Pathfinder.grids[from.map]

        const dx = Math.trunc(to.x) - Math.trunc(from.x), dy = Math.trunc(to.y) - Math.trunc(from.y)
        const nx = Math.abs(dx), ny = Math.abs(dy)
        const sign_x = dx > 0 ? 1 : -1, sign_y = dy > 0 ? 1 : -1

        let x = Math.trunc(from.x) - this.G.geometry[from.map].min_x, y = Math.trunc(from.y) - this.G.geometry[from.map].min_y
        for (let ix = 0, iy = 0; ix < nx || iy < ny;) {
            if ((0.5 + ix) / nx == (0.5 + iy) / ny) {
                x += sign_x
                y += sign_y
                ix++
                iy++
            } else if ((0.5 + ix) / nx < (0.5 + iy) / ny) {
                x += sign_x
                ix++
            } else {
                y += sign_y
                iy++
            }

            if (grid[y][x] !== WALKABLE) {
                return false
            }
        }
        return true
    }

    public generateGrid(map: MapName): Grid {
        const width = this.G.geometry[map].max_x - this.G.geometry[map].min_x
        const height = this.G.geometry[map].max_y - this.G.geometry[map].min_y

        const grid: Grid = Array(height)
        for (let y = 0; y < height; y++) {
            grid[y] = []
            for (let x = 0; x < width; x++) grid[y][x] = UNKNOWN
        }

        // Make the y_lines unwalkable
        for (const yLine of this.G.geometry[map].y_lines) {
            for (let y = Math.max(0, yLine[0] - this.G.geometry[map].min_y - BASE.vn); y < yLine[0] - this.G.geometry[map].min_y + BASE.v && y < height; y++) {
                for (let x = Math.max(0, yLine[1] - this.G.geometry[map].min_x - BASE.h); x < yLine[2] - this.G.geometry[map].min_x + BASE.h && x < width; x++) {
                    grid[y][x] = UNWALKABLE
                }
            }
        }

        // Make the x_lines unwalkable
        for (const xLine of this.G.geometry[map].x_lines) {
            for (let x = Math.max(0, xLine[0] - this.G.geometry[map].min_x - BASE.h); x < xLine[0] - this.G.geometry[map].min_x + BASE.h && x < width; x++) {
                for (let y = Math.max(0, xLine[1] - this.G.geometry[map].min_y - BASE.vn); y < xLine[2] - this.G.geometry[map].min_y + BASE.v && y < height; y++) {
                    grid[y][x] = UNWALKABLE
                }
            }
        }

        // Fill in the grid with walkable pixels
        for (const spawn of this.G.maps[map].spawns) {
            let x = Math.trunc(spawn[0]) - this.G.geometry[map].min_x
            let y = Math.trunc(spawn[1]) - this.G.geometry[map].min_y
            if (grid[y][x] === WALKABLE) continue // We've already flood filled this
            const stack = [[y, x]]
            while (stack.length) {
                [y, x] = stack.pop()
                let x1 = x
                while (x1 >= 0 && grid[y][x1] == UNKNOWN) x1--
                x1++
                let spanAbove = 0
                let spanBelow = 0
                while (x1 < width && grid[y][x1] == UNKNOWN) {
                    grid[y][x1] = WALKABLE
                    if (!spanAbove && y > 0 && grid[y - 1][x1] == UNKNOWN) {
                        stack.push([y - 1, x1])
                        spanAbove = 1
                    } else if (spanAbove && y > 0 && grid[y - 1][x1] != UNKNOWN) {
                        spanAbove = 0
                    }

                    if (!spanBelow && y < height - 1 && grid[y + 1][x1] == UNKNOWN) {
                        stack.push([y + 1, x1])
                        spanBelow = 1
                    } else if (spanBelow && y < height - 1 && grid[y + 1][x1] != UNKNOWN) {
                        spanBelow = 0
                    }
                    x1++
                }
            }
        }

        return grid
    }
}