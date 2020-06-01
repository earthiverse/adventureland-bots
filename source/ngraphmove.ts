import createGraph, { NodeId } from "ngraph.graph"
import path from "ngraph.path"
import { PositionReal, MapName } from "./definitions/adventureland"
import { Grids, Grid, NodeData, LinkData } from "./definitions/ngraphmap"

// Variables for the grid
const UNKNOWN = 1
const UNWALKABLE = 2
const WALKABLE = 3

// Other variables
const FIRST_MAP: MapName = "main"
const SLEEP_FOR_MS = 50

export class NGraphMove {
    private grids: Grids = {}
    private graph = createGraph()
    private pathfinder = path.aStar(this.graph)

    /**
     * Checks if you can move from the `from` position to the `to` position.
     * This function doesn't support movement across maps!
     * @param from Position to start moving from
     * @param to Position to move to
     */
    public canMove(from: NodeData, to: NodeData): boolean {
        if (from.map != to.map) throw new Error("Don't use this function across maps.")
        const grid = this.grids[from.map]
        const dx = to.x - from.x - G.geometry[from.map].min_x, dy = to.y - from.y - G.geometry[from.map].min_y
        const nx = Math.abs(dx), ny = Math.abs(dy)
        const sign_x = dx > 0 ? 1 : -1, sign_y = dy > 0 ? 1 : -1

        let x = from.x - G.geometry[from.map].min_x, y = from.y - G.geometry[from.map].min_y
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

    private async addToGraph(map: MapName): Promise<unknown> {
        if (this.grids[map]) return // We already have information about this map

        const mapWidth = G.geometry[map].max_x - G.geometry[map].min_x
        const mapHeight = G.geometry[map].max_y - G.geometry[map].min_y

        // 1: Create the grid
        const grid: Grid = Array(mapHeight)
        for (let y = 0; y < mapHeight; y++) {
            grid[y] = Array(mapWidth).fill(UNKNOWN)
        }

        // 2: Prepare the grid. The grid is a 2d array which says which "pixels" are walkable, and which ones aren't.
        // 2A: Make the y_lines unwalkable
        for (const yLine of G.geometry[map].y_lines) {
            for (let y = yLine[0] - G.geometry[map].min_y - parent.character.base.v; y < yLine[0] - G.geometry[map].min_y + parent.character.base.vn && y < mapHeight; y++) {
                for (let x = yLine[1] - G.geometry[map].min_x - parent.character.base.h; x < yLine[2] - G.geometry[map].min_x + parent.character.base.h && x < mapWidth; x++) {
                    grid[y][x] = UNWALKABLE
                }
            }
        }
        // 2B: Make the x_lines unwalkable
        for (const xLine of G.geometry[map].x_lines) {
            for (let x = xLine[0] - G.geometry[map].min_x - parent.character.base.h; x < xLine[0] - G.geometry[map].min_x + parent.character.base.h && x < mapWidth; x++) {
                for (let y = xLine[1] - G.geometry[map].min_y - parent.character.base.v; y < xLine[2] - G.geometry[map].min_y + parent.character.base.vn && y < mapHeight; y++) {
                    grid[y][x] = UNWALKABLE
                }
            }
        }
        // 2C: Fill in the grid with walkable pixels
        for (const spawn of G.maps[map].spawns) {
            let x = spawn[0] - G.geometry[map].min_x
            let y = spawn[1] - G.geometry[map].min_y
            if (grid[y][x] == WALKABLE) continue // We've already flood filled this
            const stack = [[y, x]]
            while (stack.length) {
                [y, x] = stack.pop()
                let x1 = x
                while (x1 >= 0 && grid[y][x1] == UNKNOWN) x1--
                x1++
                let spanAbove = 0
                let spanBelow = 0
                while (x1 < mapWidth && grid[y][x1] == UNKNOWN) {
                    grid[y][x1] = WALKABLE
                    if (!spanAbove && y > 0 && grid[y - 1][x1] == UNKNOWN) {
                        stack.push([y - 1, x1])
                        spanAbove = 1
                    } else if (spanAbove && y > 0 && grid[y - 1][x1] != UNKNOWN) {
                        spanAbove = 0
                    }

                    if (!spanBelow && y < mapHeight - 1 && grid[y + 1][x1] == UNKNOWN) {
                        stack.push([y + 1, x1])
                        spanBelow = 1
                    } else if (spanBelow && y < mapHeight - 1 && grid[y + 1][x1] != UNKNOWN) {
                        spanBelow = 0
                    }
                    x1++
                }
            }
        }

        // Add the grid
        this.grids[map] = grid

        // 3: Create nodes

        // Some useful functions for later
        function createNodeId(map: MapName, x: number, y: number): NodeId {
            return `${map}:${x - G.geometry[map].min_x},${y - G.geometry[map].min_y}`
        }
        function createNodeData(map: MapName, x: number, y: number): NodeData {
            return {
                map: map,
                x: x - G.geometry[map].min_x,
                y: y - G.geometry[map].min_y
            }
        }
        function findClosestSpawn(x: number, y: number): { x: number, y: number, distance: number } {
            let closest = {
                x: -99999,
                y: -99999,
                distance: 99999
            }
            for (const spawn of G.maps[map].spawns) {
                const distance = Math.sqrt((spawn[0] - x) ** 2 + (spawn[1] - y) ** 2)
                if (distance < closest.distance) {
                    closest = {
                        x: spawn[0],
                        y: spawn[1],
                        distance: distance
                    }
                }
            }
            return closest
        }

        // 3A: Create nodes based on corners
        const newNodes = []
        for (let y = 1; y < mapHeight - 1; y++) {
            for (let x = 1; x < mapWidth - 1; x++) {
                if (grid[y][x] != WALKABLE) continue

                const nodeID = createNodeId(map, x, y)
                if (this.graph.hasNode(nodeID)) {
                    newNodes.push(this.graph.getNode(nodeID))
                    continue
                }
                const nodeData = createNodeData(map, x, y)

                if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y - 1][x] == UNWALKABLE
                    && grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x - 1] == UNWALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE) {
                    // Inside-1
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                } else if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y - 1][x] == UNWALKABLE
                    && grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x + 1] == UNWALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    // Inside-2
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                } else if (grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x + 1] == UNWALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE
                    && grid[y + 1][x] == UNWALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    // Inside-3
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                } else if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y][x - 1] == UNWALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE
                    && grid[y + 1][x] == UNWALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    // Inside-4
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                } else if (grid[y - 1][x - 1] == UNWALKABLE
                    && grid[y - 1][x] == WALKABLE
                    && grid[y][x - 1] == WALKABLE) {
                    // Outside-1
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                } else if (grid[y - 1][x] == WALKABLE
                    && grid[y - 1][x + 1] == UNWALKABLE
                    && grid[y][x + 1] == WALKABLE) {
                    // Outside-2
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                } else if (grid[y][x + 1] == WALKABLE
                    && grid[y + 1][x] == WALKABLE
                    && grid[y + 1][x + 1] == UNWALKABLE) {
                    // Outside-3
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                } else if (grid[y][x - 1] == WALKABLE
                    && grid[y + 1][x - 1] == UNWALKABLE
                    && grid[y + 1][x] == WALKABLE) {
                    // Outside-4
                    newNodes.push(this.graph.addNode(nodeID, nodeData))
                }
            }
        }
        // 3B: Create nodes and links for transporters
        for (const npc of G.maps[map].npcs) {
            if (npc.id != "transporter") continue
            const closest = findClosestSpawn(npc.position[0], npc.position[1])

            const nodeID = createNodeId(map, closest.x, closest.y)
            if (!this.graph.hasNode(nodeID)) {
                const nodeData = createNodeData(map, closest.x, closest.y)
                newNodes.push(this.graph.addNode(nodeID, nodeData))
            } else {
                newNodes.push(this.graph.getNode(nodeID))
            }

            // Create links to destinations
            for (const map in G.npcs.transporter.places) {
                const spawnID = G.npcs.transporter.places[map as MapName]
                const spawn = G.maps[map as MapName].spawns[spawnID]

                const nodeID2 = createNodeId(map as MapName, spawn[0], spawn[1])
                if (!this.graph.hasNode(nodeID)) {
                    const nodeData2 = createNodeData(map as MapName, spawn[0], spawn[1])
                    this.graph.addNode(nodeID2, nodeData2)
                }

                if (!this.graph.hasLink(nodeID, nodeID2)) {
                    const linkData: LinkData = {
                        type: "transport",
                        spawn: spawnID
                    }
                    this.graph.addLink(nodeID, nodeID2, linkData)
                }
            }
        }
        // 3C: Create nodes and links for doors
        for (const door of G.maps[map].doors) {
            const nodeID = createNodeId(map, door[0], door[1])
            if (!this.graph.hasNode(nodeID)) {
                const spawn = G.maps[map].spawns[door[6]]
                const nodeData = createNodeData(map, spawn[0], spawn[1])
                newNodes.push(this.graph.addNode(nodeID, nodeData))
            } else {
                newNodes.push(this.graph.getNode(nodeID))
            }

            // Create link to destination
            const spawn2 = G.maps[door[4]].spawns[door[5]]
            const nodeID2 = createNodeId(door[4], spawn2[0], spawn2[1])
            if (!this.graph.hasNode(nodeID2)) {
                const nodeData2 = createNodeData(door[4], spawn2[0], spawn2[1])
                this.graph.addNode(nodeID2, nodeData2)
            }
            if (!this.graph.hasLink(nodeID, nodeID2)) {
                const linkData: LinkData = {
                    type: "transport",
                    spawn: door[5]
                }
                this.graph.addLink(nodeID, nodeID2, linkData)
            }
        }

        // 3D: Create links between nodes which are walkable
        for (let i = 0; i < newNodes.length; i++) {
            for (let j = i + 1; j < newNodes.length; j++) {
                const nodeI = newNodes[i]
                const nodeJ = newNodes[j]
                if (this.canMove(nodeI.data, nodeJ.data)) {
                    this.graph.addLink(nodeI.id, nodeJ.id)
                    this.graph.addLink(nodeJ.id, nodeI.id)
                }
            }
        }
    }

    public async prepare(start: MapName = FIRST_MAP): Promise<void> {
        // Create a list of all reachable maps from the start point
        const maps: MapName[] = [start]
        for (let i = 0; i < maps.length; i++) {
            const map = maps[i]
            // Add maps reachable through doors
            for (const door of G.maps[map].doors) {
                const connectedMap = door[4]
                if (!maps.includes(connectedMap)) maps.push(door[4])
            }
        }
        // Add maps reachable through teleporters
        for (const destination in G.npcs.transporter.places) {
            const map = destination as MapName
            if (!maps.includes(map)) maps.push(map)
        }

        // Prepare all of the maps
        for (const map of maps) {
            await this.addToGraph(map)
            await new Promise(resolve => setTimeout(resolve, SLEEP_FOR_MS)) // Don't lock the game
        }
    }

    private getPath(start: PositionReal, goal: PositionReal) {
        // Get the closest node to the start and finish
        let distToStart = Number.MAX_VALUE
        let startNode: NodeId
        let distToFinish = Number.MAX_VALUE
        let finishNode: NodeId
        this.graph.forEachNode((node: { data: NodeData, id: NodeId }) => {
            if (node.data.map == start.map) {
                const distance = Math.sqrt((node.data.x - start.x) ** 2 + (node.data.y - start.y) ** 2)
                if (distance < distToStart) {
                    distToStart = distance
                    startNode = node.id
                }
            }
            if (node.data.map == goal.map) {
                const distance = Math.sqrt((node.data.x - goal.x) ** 2 + (node.data.y - goal.y) ** 2)
                if (distance < distToFinish) {
                    distToFinish = distance
                    finishNode = node.id
                }
            }
        })

        // Get path from start to goal
        const path = this.pathfinder.find(startNode, finishNode)
        console.log("This is the path we found:")
        console.log(path)
    }

    public async move(destination: PositionReal, finishDistanceTolerance = 0): Promise<unknown> {

        return
    }
}