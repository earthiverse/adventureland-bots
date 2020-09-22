import createGraph, { NodeId, Node, Graph, Link } from "ngraph.graph"
import path from "ngraph.path"
import { createEmitAndSemanticDiagnosticsBuilderProgram } from "typescript"
import { PositionReal, MapName } from "./definitions/adventureland"
import { Grids, Grid, NodeData, LinkData, PathData } from "./definitions/ngraphmap"
import { nodes as CachedNodes, links as CachedLinks } from "./ngraphmove_cache"

// Variables for the grid
const UNKNOWN = 1
const UNWALKABLE = 2
const WALKABLE = 3
const EXTRA_PADDING = 0

// Other variables
const FIRST_MAP: MapName = "main"
const SLEEP_FOR_MS = 50
const ENABLE_BLINK = true
const TOWN_TIME = 3000
const TRANSPORT_TIME = 500
const BLINK_TIME = 500
const WALK_TIMEOUT = 10000
const USE_CACHE = false

// Cost variables
const TRANSPORT_COST = 50 * TRANSPORT_TIME / 1000
const TOWN_COST = 50 * TOWN_TIME / 1000

export class NGraphMove {
    private static instance: NGraphMove
    private grids: Grids = {}
    public graph: Graph<NodeData, LinkData> = createGraph({ multigraph: true })
    private pathfinder = path.nba(this.graph, {
        distance(fromNode, toNode, link) {
            if (link.data && link.data.type == "transport") {
                // We are using the transporter
                return TRANSPORT_COST
            } else if (link.data && link.data.type == "town") {
                // We are warping to town
                return TOWN_COST
            }
            // We are walking
            if (fromNode.data.map == toNode.data.map) {
                return Math.sqrt((fromNode.data.x - toNode.data.x) ** 2 + (fromNode.data.y - toNode.data.y) ** 2)
            }
        },
        oriented: true
    })

    /** Date the search started */
    public searchStartTime: number
    /** Date the search finished */
    public searchFinishTime: number
    /** Time the movement started */
    public moveStartTime: number
    /** Time the movement finished */
    public moveFinishTime: number

    private constructor() {
        // Private to force singleton
    }

    static async getInstance(): Promise<NGraphMove> {
        if (!this.instance) {
            this.instance = new NGraphMove()
            await this.instance.prepare()
        }

        return this.instance
    }

    static cleanPosition(position: PositionReal): NodeData {
        return {
            map: position.map,
            x: position.real_x !== undefined ? position.real_x : position.x,
            y: position.real_y !== undefined ? position.real_y : position.y
        }
    }

    private reset() {
        this.searchStartTime = undefined
        this.searchFinishTime = undefined
        this.moveStartTime = undefined
        this.moveFinishTime = undefined
    }

    private addLinkToGraph(from: Node<NodeData>, to: Node<NodeData>, data?: LinkData): Link<LinkData> {
        return this.graph.addLink(from.id, to.id, data)
    }

    private addNodeToGraph(map: MapName, x: number, y: number): Node<NodeData> {
        return this.graph.addNode(`${map}:${x},${y}`, { map: map, x: x, y: y })
    }

    public stop(): void {
        this.reset()
        if (parent.character.moving) stop()
        if (parent.character.c.town) stop("town")
    }

    public isMoving(): boolean {
        return this.moveFinishTime == undefined && this.searchStartTime != undefined
    }

    private wasCancelled(start: number): boolean {
        return !this.searchStartTime || start < this.searchStartTime
    }

    public canMove2(from: NodeData, to: NodeData): boolean {
        if (from.map != to.map) {
            console.error(`Don't use this function across maps. You tried to check canMove from ${from.map} to ${to.map}.`)
            return false
        }

        const grid = this.grids[from.map]

        // The following code is adapted from http://eugen.dedu.free.fr/projects/bresenham/

        let ystep, xstep // the step on y and x axis
        let error // the error accumulated during the incremenet
        let errorprev // *vision the previous value of the error variable
        let y = Math.trunc(from.y) - G.geometry[from.map].min_y, x = Math.trunc(from.x) - G.geometry[from.map].min_x // the line points
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
     * Checks if you can move from the `from` position to the `to` position.
     * This function doesn't support movement across maps!
     * @param from Position to start moving from
     * @param to Position to move to
     */
    public canMove(from: NodeData, to: NodeData): boolean {
        if (from.map != to.map) {
            console.error(`Don't use this function across maps. You tried to check canMove from ${from.map} to ${to.map}.`)
            return false
        }
        const grid = this.grids[from.map]
        const dx = Math.trunc(to.x) - Math.trunc(from.x), dy = Math.trunc(to.y) - Math.trunc(from.y)
        const nx = Math.abs(dx), ny = Math.abs(dy)
        const sign_x = dx > 0 ? 1 : -1, sign_y = dy > 0 ? 1 : -1

        let x = Math.trunc(from.x) - G.geometry[from.map].min_x, y = Math.trunc(from.y) - G.geometry[from.map].min_y
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
        if (this.grids[map]) {
            return // We already have information about this map
        }
        if (!G.maps[map]) {
            console.error(`${map} is not a valid map.`) // Not a map
        }

        const mapWidth = G.geometry[map].max_x - G.geometry[map].min_x
        const mapHeight = G.geometry[map].max_y - G.geometry[map].min_y

        // 1: Create the grid
        const grid: Grid = Array(mapHeight)
        for (let y = 0; y < mapHeight; y++) {
            grid[y] = []
            for (let x = 0; x < mapWidth; x++)
                grid[y][x] = UNKNOWN
        }

        // 2: Prepare the grid. The grid is a 2d array which says which "pixels" are walkable, and which ones aren't.
        // 2A: Make the y_lines unwalkable
        for (const yLine of G.geometry[map].y_lines) {
            for (let y = Math.max(0, yLine[0] - G.geometry[map].min_y - parent.character.base.vn - EXTRA_PADDING); y <= yLine[0] - G.geometry[map].min_y + parent.character.base.v + EXTRA_PADDING && y < mapHeight; y++) {
                for (let x = Math.max(0, yLine[1] - G.geometry[map].min_x - parent.character.base.h - EXTRA_PADDING); x <= yLine[2] - G.geometry[map].min_x + parent.character.base.h + EXTRA_PADDING && x < mapWidth; x++) {
                    grid[y][x] = UNWALKABLE
                }
            }
        }
        // 2B: Make the x_lines unwalkable
        for (const xLine of G.geometry[map].x_lines) {
            for (let x = Math.max(0, xLine[0] - G.geometry[map].min_x - parent.character.base.h - EXTRA_PADDING); x <= xLine[0] - G.geometry[map].min_x + parent.character.base.h + EXTRA_PADDING && x < mapWidth; x++) {
                for (let y = Math.max(0, xLine[1] - G.geometry[map].min_y - parent.character.base.vn - EXTRA_PADDING); y <= xLine[2] - G.geometry[map].min_y + parent.character.base.v + EXTRA_PADDING && y < mapHeight; y++) {
                    grid[y][x] = UNWALKABLE
                }
            }
        }
        // 2C: Fill in the grid with walkable pixels
        for (const spawn of G.maps[map].spawns) {
            let x = Math.trunc(spawn[0]) - G.geometry[map].min_x
            let y = Math.trunc(spawn[1]) - G.geometry[map].min_y
            if (grid[y][x] === WALKABLE) continue // We've already flood filled this
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

        if (!USE_CACHE) {
            // 3: Create nodes

            // 3A: Create nodes based on corners
            const newNodes: Node<NodeData>[] = []
            for (let y = 1; y < mapHeight - 1; y++) {
                for (let x = 1; x < mapWidth - 1; x++) {
                    if (grid[y][x] != WALKABLE) continue

                    if (grid[y - 1][x - 1] == UNWALKABLE
                        && grid[y - 1][x] == UNWALKABLE
                        && grid[y - 1][x + 1] == UNWALKABLE
                        && grid[y][x - 1] == UNWALKABLE
                        && grid[y + 1][x - 1] == UNWALKABLE) {
                        // Inside-1
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    } else if (grid[y - 1][x - 1] == UNWALKABLE
                        && grid[y - 1][x] == UNWALKABLE
                        && grid[y - 1][x + 1] == UNWALKABLE
                        && grid[y][x + 1] == UNWALKABLE
                        && grid[y + 1][x + 1] == UNWALKABLE) {
                        // Inside-2
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    } else if (grid[y - 1][x + 1] == UNWALKABLE
                        && grid[y][x + 1] == UNWALKABLE
                        && grid[y + 1][x - 1] == UNWALKABLE
                        && grid[y + 1][x] == UNWALKABLE
                        && grid[y + 1][x + 1] == UNWALKABLE) {
                        // Inside-3
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    } else if (grid[y - 1][x - 1] == UNWALKABLE
                        && grid[y][x - 1] == UNWALKABLE
                        && grid[y + 1][x - 1] == UNWALKABLE
                        && grid[y + 1][x] == UNWALKABLE
                        && grid[y + 1][x + 1] == UNWALKABLE) {
                        // Inside-4
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    } else if (grid[y - 1][x - 1] == UNWALKABLE
                        && grid[y - 1][x] == WALKABLE
                        && grid[y][x - 1] == WALKABLE) {
                        // Outside-1
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    } else if (grid[y - 1][x] == WALKABLE
                        && grid[y - 1][x + 1] == UNWALKABLE
                        && grid[y][x + 1] == WALKABLE) {
                        // Outside-2
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    } else if (grid[y][x + 1] == WALKABLE
                        && grid[y + 1][x] == WALKABLE
                        && grid[y + 1][x + 1] == UNWALKABLE) {
                        // Outside-3
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    } else if (grid[y][x - 1] == WALKABLE
                        && grid[y + 1][x - 1] == UNWALKABLE
                        && grid[y + 1][x] == WALKABLE) {
                        // Outside-4
                        newNodes.push(this.addNodeToGraph(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y))
                    }
                }
            }
            // 3B: Create nodes and links for transporters
            for (const npc of G.maps[map].npcs) {
                if (npc.id != "transporter") continue
                const closest = findClosestSpawn(npc.position[0], npc.position[1])
                const fromNode = this.addNodeToGraph(map, closest.x, closest.y)
                newNodes.push(fromNode)

                // Create links to destinations
                for (const toMap in G.npcs.transporter.places) {
                    if (toMap == map) continue // Don't add links to ourself
                    const spawnID = G.npcs.transporter.places[toMap as MapName]
                    const spawn = G.maps[toMap as MapName].spawns[spawnID]
                    const toNode = this.addNodeToGraph(toMap as MapName, spawn[0], spawn[1])

                    this.addLinkToGraph(fromNode, toNode, {
                        type: "transport",
                        spawn: spawnID
                    })
                }
            }
            // 3C: Create nodes and links for doors
            for (const door of G.maps[map].doors) {
                // TODO: Figure out how to know if we have access to a locked door
                if (door[7] || door[8]) continue

                // From
                const spawn = G.maps[map].spawns[door[6]]
                const fromDoor = this.addNodeToGraph(map, spawn[0], spawn[1])
                newNodes.push(fromDoor)

                // To
                const spawn2 = G.maps[door[4]].spawns[door[5]]
                const toDoor = this.addNodeToGraph(door[4], spawn2[0], spawn2[1])
                this.graph.addLink(fromDoor.id, toDoor.id, {
                    type: "transport",
                    spawn: door[5]
                })
            }
            // 3D: Create nodes for spawns
            for (const spawn of G.maps[map].spawns) {
                newNodes.push(this.addNodeToGraph(map, spawn[0], spawn[1]))
            }

            // 3E: Create links between nodes which are walkable
            for (let i = 0; i < newNodes.length; i++) {
                for (let j = i + 1; j < newNodes.length; j++) {
                    // if (can_move({ map: nodeI.data.map, x: nodeI.data.x, y: nodeI.data.y, going_x: nodeJ.data.x, going_y: nodeJ.data.y, base: parent.character.base })) {
                    if (this.canMove2(newNodes[i].data, newNodes[j].data)) {
                        this.addLinkToGraph(newNodes[i], newNodes[j])
                        this.addLinkToGraph(newNodes[j], newNodes[i])
                    }
                }
            }

            // // 3F: Create "town" links
            const townNode = this.addNodeToGraph(map, G.maps[map].spawns[0][0], G.maps[map].spawns[0][1])
            for (const node of newNodes) {
                this.addLinkToGraph(node, townNode, {
                    type: "town"
                })
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
                if (door[7] || door[8]) continue
                const connectedMap = door[4]
                if (!maps.includes(connectedMap)) maps.push(door[4])
            }
        }
        // Add maps reachable through teleporters
        for (const map in G.npcs.transporter.places) {
            if (!maps.includes(map as MapName)) maps.push(map as MapName)
        }

        if (USE_CACHE) {
            // Create nodes & links
            for (const node of CachedNodes as [NodeId, NodeData][]) {
                this.graph.addNode(node[0], node[1])
            }

            // Create links
            for (const link of CachedLinks as [NodeId, NodeId, LinkData?][]) {
                this.graph.addLink(link[0], link[1], link[2])
            }
        }

        // Prepare all of the maps
        for (const map of maps) {
            if (map == "test") continue
            await this.addToGraph(map)
            await new Promise(resolve => setTimeout(resolve, SLEEP_FOR_MS)) // Don't lock the game
        }
    }

    public getGraphInfo(): void {
        console.info("Graph information ----------")
        console.info(`# Nodes: ${this.graph.getNodeCount()}`)
        console.info(`# Links: ${this.graph.getLinkCount()}`)
        console.info("----------------------------")
    }

    private getPath(goal: NodeData): PathData {
        // Find the closest node to the start and finish points
        let distToStart = Number.MAX_VALUE
        let startNode: NodeId
        let distToFinish = Number.MAX_VALUE
        let finishNode: NodeId
        this.graph.forEachNode((node: { data: NodeData, id: NodeId }) => {
            //DEBUG
            if (!node.data) {
                console.error("NO DATA!?")
                console.error(node)
            }
            if (node.data.map == parent.character.map) {
                const distance = Math.sqrt((node.data.x - parent.character.real_x) ** 2 + (node.data.y - parent.character.real_y) ** 2)
                if (distance < distToStart && can_move_to(node.data.x, node.data.y)) {
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

        // Get the data for the path we need to travel (town, teleport, walking)
        const rawPath = this.pathfinder.find(startNode, finishNode)
        if (rawPath.length == 0) {
            console.error("could not find a path")
            return undefined
        }
        const optimizedPath: PathData = []

        if (rawPath[rawPath.length - 1].data.x != parent.character.real_x || rawPath[rawPath.length - 1].data.y != parent.character.real_y) {
            // Add the starting position
            optimizedPath.push([NGraphMove.cleanPosition(parent.character), rawPath[rawPath.length - 1].data, undefined])
        }
        for (let i = rawPath.length - 1; i > 0; i--) {
            // Add the path nodes
            const node = rawPath[i]
            const nextNode = rawPath[i - 1]
            const link = this.graph.getLink(node.id, nextNode.id)
            optimizedPath.push([node.data, nextNode.data, link.data])
        }
        if (rawPath[0].data.x != goal.x || rawPath[0].data.y != goal.y) {
            // Add the finishing position
            optimizedPath.push([rawPath[0].data, goal, undefined])
        }

        // Optimize starting position
        const character = NGraphMove.cleanPosition(parent.character)
        let canMove = 0
        for (let i = 1; i < optimizedPath.length; i++) {
            const to = optimizedPath[i][1]
            const link = optimizedPath[i][2]

            if (character.map !== to.map) break // We can't optimize across maps
            if (link) break

            if (this.canMove2(character, to)) canMove = i
        }
        if (canMove > 0) {
            optimizedPath.splice(0, canMove)
            optimizedPath[0][0] = character
        }

        // Optimize finish position
        canMove = optimizedPath.length - 1
        for (let i = optimizedPath.length - 2; i > 0; i--) {
            const from = optimizedPath[i][0]
            const to = optimizedPath[i][1]
            const link = optimizedPath[i][2]

            if (link) break // We shouldn't optimize over special movements
            if (to.map != goal.map) break

            if (this.canMove2(from, goal)) canMove = i
        }
        if (canMove < optimizedPath.length - 1) {
            optimizedPath.splice(canMove + 1)
            optimizedPath[optimizedPath.length - 1][1] = goal
        }

        // 2: Optimize Town Teleport
        if (optimizedPath.length > 1
            && optimizedPath[0][2] === undefined // The first move isn't special
            && optimizedPath[1][2] && optimizedPath[1][2].type == "town" // The first move is a teleport
            && optimizedPath[0][0].map == optimizedPath[1][0].map) { // The maps are the same
            optimizedPath.shift()
        }

        return optimizedPath
    }

    public async move(goal: PositionReal, finishDistanceTolerance = 0): Promise<unknown> {
        this.reset()

        if (distance(parent.character, goal) <= finishDistanceTolerance) return // We're already close enough

        const from: NodeData = NGraphMove.cleanPosition(parent.character)
        const to: NodeData = NGraphMove.cleanPosition(goal)

        function getCloseTo(from: NodeData): PositionReal {
            if (finishDistanceTolerance == 0) return to // We want to go to this exact position

            const distance = Math.sqrt((from.y - to.y) ** 2 + (from.x - to.x) ** 2)
            if (distance < finishDistanceTolerance) return from // We're already close enough

            // Compute a line from `from` to `destinaton` that is `finishDistanceTolerance` units away.
            const angle = Math.atan2(from.y - to.y, from.x - to.x)
            if (distance > finishDistanceTolerance) {
                return {
                    map: to.map,
                    x: to.x + Math.cos(angle) * finishDistanceTolerance,
                    y: to.y + Math.sin(angle) * finishDistanceTolerance
                }
            }
        }

        if (from.map == to.map) {
            const close = getCloseTo(to)
            if (can_move_to(close.x, close.y)) {
                return move(close.x, close.y)
            }
        }

        // Get the path
        const searchStart = Date.now()
        this.searchStartTime = searchStart
        const path = this.getPath(to)
        this.searchFinishTime = Date.now()
        if (!path) {
            return Promise.reject(`We could not find a path from [${from.map},${from.x},${from.y}] to [${to.map},${to.x},${to.y}] in ${this.searchFinishTime - this.searchStartTime}ms`)
        } else {
            console.log("----- DEBUG: path -----")
            console.log(path)
            console.log("-----------------------")
        }

        async function performNextMovement(to: NodeData, link: LinkData) {
            if (link) {
                if (link.type == "town") {
                    if (distance(parent.character, to) < TOWN_COST && can_move_to(to.x, to.y)) {
                        // Walk to the town node
                        await Promise.race([move(to.x, to.y), new Promise(resolve => setTimeout(resolve, WALK_TIMEOUT))])
                    } else {
                        // Use "town" to get to the next node
                        use_skill("town")
                        await new Promise(resolve => setTimeout(resolve, Math.max(...parent.pings) + TOWN_TIME))
                    }
                    return
                } else if (link.type == "transport") {
                    // Transport to the next node
                    transport(to.map, link.spawn)
                    await new Promise(resolve => setTimeout(resolve, Math.max(...parent.pings) + TRANSPORT_TIME))
                    return
                } else if (link.type == "blink") {
                    use_skill("blink", [to.x, to.y])
                    await new Promise(resolve => setTimeout(resolve, Math.max(...parent.pings) + BLINK_TIME))
                    return
                }
            } else {
                // Walk to the next node (timeout after 5 seconds)
                await Promise.race([move(to.x, to.y), new Promise(resolve => setTimeout(resolve, WALK_TIMEOUT))])
                return
            }
        }

        this.moveStartTime = Date.now()
        for (let i = 0; i < path.length;) {
            const fromData = path[i][0]
            let toData: NodeData
            if (i == path.length - 1) {
                toData = getCloseTo(path[i][1])
            } else {
                toData = path[i][1]
            }
            let linkData = path[i][2]
            let distance = Math.sqrt((Math.trunc(toData.x) - Math.trunc(parent.character.real_x)) ** 2 + (Math.trunc(toData.y) - Math.trunc(parent.character.real_y)) ** 2)

            if (this.wasCancelled(searchStart)) {
                return Promise.reject("cancelled")
            }

            if (distance < 1) {
                // We're at the next node, continue
                i++
                continue
            }

            // If we're moving, wait.
            if (parent.character.c.town || parent.character.moving) {
                await new Promise(resolve => setTimeout(resolve, SLEEP_FOR_MS))
                continue
            }

            if ((!linkData && !can_move_to(toData.x, toData.y)) || parent.character.map !== fromData.map) {
                // We got lost somewhere, retry
                console.warn("NGraphMove movement failed. We're going to teleport to town and try again.")
                console.log("---- Path -----")
                console.log(path)
                console.log("---------------")
                console.log("---- Target Destination -----")
                console.log(`{map: "${toData.map}", x: ${toData.x}", y: ${toData.y}}`)
                console.log("-----------------------------")
                console.log("----- Character Position -----")
                console.log(`{map: "${parent.character.map}", x: ${parent.character.real_x}, y: ${parent.character.real_y}`)
                console.log("------------------------------")
                use_skill("town")
                await new Promise(resolve => setTimeout(resolve, Math.max(...parent.pings) + TOWN_TIME))
                return this.move(goal, finishDistanceTolerance)
            }

            // See if we can use blink to speed up movement (if we are mage)
            if (ENABLE_BLINK && can_use("blink") && parent.character.mp > G.skills.blink.mp) {
                let j = i
                for (; j < path.length; j++) {
                    distance += Math.sqrt((path[j][1].x - path[j][0].x) ** 2 + (path[j][1].y - path[j][0].y) ** 2)
                    if (path[j][0].map != path[j][1].map) break // We found the last point that we can travel to on this map
                }
                if (distance > TOWN_COST) {
                    // We can save time by blinking!
                    if (j == path.length) {
                        toData = path[j - 1][1]
                        i = j - 2
                    } else {
                        toData = path[j][0]
                        i = j - 1
                    }
                    linkData = { type: "blink" }
                }
            }

            // Perform movement
            await performNextMovement(toData, linkData)
        }
        this.moveFinishTime = Date.now()

        return
    }
}