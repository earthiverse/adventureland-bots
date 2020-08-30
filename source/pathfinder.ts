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

    /**
     * Checks if we can walk from `from` to `to`.
     * @param from The starting position (where we start walking from)
     * @param to The ending position (where we walk to)
     */
    public canWalk(from: IPosition, to: IPosition): boolean {
        if (from.map != to.map) return false // We can't walk across maps

        const grid = this.generateGrid(from.map)

        let ystep, xstep // the step on y and x axis
        let error // the error accumulated during the incremenet
        let errorprev // *vision the previous value of the error variable
        let y = Math.trunc(from.y) - this.G.geometry[from.map].min_y, x = Math.trunc(from.x) - this.G.geometry[from.map].min_x // the line points
        let dx = Math.trunc(to.x) - Math.trunc(from.x)
        let dy = Math.trunc(to.y) - Math.trunc(from.y)

        if (grid[y][x] !== WALKABLE) return false

        if (dy < 0) {
            ystep = -1
            dy = -dy
        } else {
            ystep = 1
        }
        if (dx < 0) {
            xstep = -1
            dx = -dx
        } else {
            xstep = 1
        }
        const ddy = 2 * dy
        const ddx = 2 * dx

        if (ddx >= ddy) { // first octant (0 <= slope <= 1)
            // compulsory initialization (even for errorprev, needed when dx==dy)
            errorprev = error = dx  // start in the middle of the square
            for (let i = 0; i < dx; i++) {  // do not use the first point (already done)
                x += xstep
                error += ddy
                if (error > ddx) {  // increment y if AFTER the middle ( > )
                    y += ystep
                    error -= ddx
                    // three cases (octant == right->right-top for directions below):
                    if (error + errorprev < ddx) {  // bottom square also
                        if (grid[y - ystep][x] != WALKABLE) return false
                    } else if (error + errorprev > ddx) {  // left square also
                        if (grid[y][x - xstep] != WALKABLE) return false
                    } else {  // corner: bottom and left squares also
                        if (grid[y - ystep][x] != WALKABLE) return false
                        if (grid[y][x - xstep] != WALKABLE) return false
                    }
                }
                if (grid[y][x] !== WALKABLE) return false
                errorprev = error
            }
        } else {  // the same as above
            errorprev = error = dy
            for (let i = 0; i < dy; i++) {
                y += ystep
                error += ddx
                if (error > ddy) {
                    x += xstep
                    error -= ddy
                    if (error + errorprev < ddy) {
                        if (grid[y][x - xstep] != WALKABLE) return false
                    } else if (error + errorprev > ddy) {
                        if (grid[y - ystep][x] != WALKABLE) return false
                    } else {
                        if (grid[y][x - xstep] != WALKABLE) return false
                        if (grid[y - ystep][x] != WALKABLE) return false
                    }
                }
                if (grid[y][x] !== WALKABLE) return false
                errorprev = error
            }
        }

        return true
    }

    /**
     * Generates a grid of walkable pixels that we use for pathfinding.
     * @param map The map to generate the grid for
     */
    public generateGrid(map: MapName): Grid {
        // Return the grid we've prepared if we have it.
        if (Pathfinder.grids[map]) return Pathfinder.grids[map]

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

        // Add to our grids
        Pathfinder.grids[map] = grid

        return grid
    }

    /**
     * If we were to walk from `from` to `to`, and `to` was unreachable, get the furthest `to` we can walk to.
     * Adapted from http://eugen.dedu.free.fr/projects/bresenham/
     * @param from 
     * @param to 
     */
    public getSafeWalkTo(from: IPosition, to: IPosition): IPosition {
        if (from.map != to.map) throw new Error("We can't walk across maps.")

        const grid = this.generateGrid(from.map)

        let ystep, xstep // the step on y and x axis
        let error // the error accumulated during the incremenet
        let errorprev // *vision the previous value of the error variable
        let y = Math.trunc(from.y) - this.G.geometry[from.map].min_y, x = Math.trunc(from.x) - this.G.geometry[from.map].min_x // the line points
        let dx = Math.trunc(to.x) - Math.trunc(from.x)
        let dy = Math.trunc(to.y) - Math.trunc(from.y)

        if (grid[y][x] !== WALKABLE) throw new Error("We shouldn't be able to be where we currently are.")

        if (dy < 0) {
            ystep = -1
            dy = -dy
        } else {
            ystep = 1
        }
        if (dx < 0) {
            xstep = -1
            dx = -dx
        } else {
            xstep = 1
        }
        const ddy = 2 * dy
        const ddx = 2 * dx

        if (ddx >= ddy) { // first octant (0 <= slope <= 1)
            // compulsory initialization (even for errorprev, needed when dx==dy)
            errorprev = error = dx  // start in the middle of the square
            for (let i = 0; i < dx; i++) {  // do not use the first point (already done)
                x += xstep
                error += ddy
                if (error > ddx) {  // increment y if AFTER the middle ( > )
                    y += ystep
                    error -= ddx
                    // three cases (octant == right->right-top for directions below):
                    if (error + errorprev < ddx) {  // bottom square also
                        if (grid[y - ystep][x] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                    } else if (error + errorprev > ddx) {  // left square also
                        if (grid[y][x - xstep] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                    } else {  // corner: bottom and left squares also
                        if (grid[y - ystep][x] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                        if (grid[y][x - xstep] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                    }
                }
                if (grid[y][x] !== WALKABLE) return { map: from.map, x: x - xstep, y: y }
                errorprev = error
            }
        } else {  // the same as above
            errorprev = error = dy
            for (let i = 0; i < dy; i++) {
                y += ystep
                error += ddx
                if (error > ddy) {
                    x += xstep
                    error -= ddy
                    if (error + errorprev < ddy) {
                        if (grid[y][x - xstep] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                    } else if (error + errorprev > ddy) {
                        if (grid[y - ystep][x] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                    } else {
                        if (grid[y][x - xstep] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                        if (grid[y - ystep][x] != WALKABLE) return { map: from.map, x: x - xstep, y: y - ystep }
                    }
                }
                if (grid[y][x] !== WALKABLE) return { map: from.map, x: x, y: y - ystep }
                errorprev = error
            }
        }

        return to
    }
}