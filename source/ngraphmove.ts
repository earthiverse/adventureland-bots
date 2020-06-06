import createGraph, { NodeId, Node, Graph } from "ngraph.graph"
import path from "ngraph.path"
import { PositionReal, MapName } from "./definitions/adventureland"
import { Grids, Grid, NodeData, LinkData, PathData } from "./definitions/ngraphmap"

// Variables for the grid
const UNKNOWN = 1
const UNWALKABLE = 2
const WALKABLE = 3
const EXTRA_PADDING = 1

// Other variables
const FIRST_MAP: MapName = "main"
const SLEEP_FOR_MS = 50

// Cost variables
const TRANSPORT_COST = 25
const TOWN_COST = 100

export class NGraphMove {
    private static instance: NGraphMove
    private grids: Grids = {}
    private graph: Graph<NodeData, LinkData> = createGraph({ multigraph: true })
    private pathfinder = path.aStar(this.graph, {
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
    private searchStartTime: number
    /** Date the search finished */
    private searchFinishTime: number
    /** Time the movement started */
    private moveStartTime: number
    /** Time the movement finished */
    private moveFinishTime: number

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

    public stop() {
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

        const truncFrom = {
            x: Math.trunc(from.x) - G.geometry[from.map].min_x,
            y: Math.trunc(from.y) - G.geometry[from.map].min_y
        }
        const truncTo = {
            x: Math.trunc(to.x) - G.geometry[from.map].min_x,
            y: Math.trunc(to.y) - G.geometry[from.map].min_y
        }
        const toTravel = {
            x: truncTo.x - truncFrom.x,
            y: truncTo.y - truncFrom.y
        }
        const current = {
            x: truncFrom.x,
            y: truncFrom.y
        }

        if (toTravel.x == 0) {
            // It's a straight y-line
            const sign = Math.sign(toTravel.y)
            while (truncTo.y !== current.y + sign) {
                if (grid[current.y][current.x] !== WALKABLE) return false
                current.y += sign
            }
            return true
        }

        if (toTravel.y == 0) {
            // It's a straight x-line
            const sign = Math.sign(toTravel.x)
            while (truncTo.x !== current.x + sign) {
                if (grid[current.y][current.x] !== WALKABLE) return false
                current.x += sign
            }
            return true
        }

        if (Math.abs(toTravel.x) >= Math.abs(toTravel.y)) {
            // It's a diagonal line, longer in the x
            const xSign = Math.sign(toTravel.x)
            const ySign = Math.sign(toTravel.y)
            const slope = toTravel.y / toTravel.x
            while (truncTo.x !== current.x + xSign) {
                current.y = Math.trunc(truncFrom.y + slope * (current.x - truncFrom.x))
                if (grid[current.y][current.x] !== WALKABLE) return false
                if (grid[current.y + ySign][current.x] !== WALKABLE) return false
                current.x += xSign
            }
            return true
        } else {
            // It's a diagonal line, longer in the y
            const xSign = Math.sign(toTravel.x)
            const ySign = Math.sign(toTravel.y)
            const slope = toTravel.x / toTravel.y
            while (truncTo.y !== current.y + ySign) {
                current.x = Math.trunc(truncFrom.x + slope * (current.y - truncFrom.y))
                if (grid[current.y][current.x] !== WALKABLE) return false
                if (grid[current.y][current.x + xSign] !== WALKABLE) return false
                current.y += ySign
            }
            return true
        }
    }

    private async addToGraph(map: MapName): Promise<unknown> {
        if (this.grids[map]) {
            console.info(`We have already prepared ${map}.`)
            return // We already have information about this map
        }
        if (!G.maps[map]) {
            console.error(`${map} is not a valid map.`) // Not a map
        }
        console.info(`Preparing ${map}...`)

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
            for (let y = Math.max(0, yLine[0] - G.geometry[map].min_y - parent.character.base.vn - EXTRA_PADDING); y < yLine[0] - G.geometry[map].min_y + parent.character.base.v + EXTRA_PADDING && y < mapHeight; y++) {
                for (let x = Math.max(0, yLine[1] - G.geometry[map].min_x - parent.character.base.h - EXTRA_PADDING); x < yLine[2] - G.geometry[map].min_x + parent.character.base.h + EXTRA_PADDING && x < mapWidth; x++) {
                    grid[y][x] = UNWALKABLE
                }
            }
        }
        // 2B: Make the x_lines unwalkable
        for (const xLine of G.geometry[map].x_lines) {
            for (let x = Math.max(0, xLine[0] - G.geometry[map].min_x - parent.character.base.h - EXTRA_PADDING); x < xLine[0] - G.geometry[map].min_x + parent.character.base.h + EXTRA_PADDING && x < mapWidth; x++) {
                for (let y = Math.max(0, xLine[1] - G.geometry[map].min_y - parent.character.base.vn - EXTRA_PADDING); y < xLine[2] - G.geometry[map].min_y + parent.character.base.v + EXTRA_PADDING && y < mapHeight; y++) {
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

        // 3: Create nodes

        // Some useful functions for later
        function createNodeId(map: MapName, x: number, y: number): NodeId {
            return `${map}:${Math.trunc(x)},${Math.trunc(y)}`
        }
        function createNodeData(map: MapName, x: number, y: number): NodeData {
            return {
                map: map,
                x: Math.trunc(x),
                y: Math.trunc(y)
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
        const newNodes: Node<NodeData>[] = []
        for (let y = 1; y < mapHeight - 1; y++) {
            for (let x = 1; x < mapWidth - 1; x++) {
                if (grid[y][x] != WALKABLE) continue

                const nodeID = createNodeId(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y)
                if (this.graph.hasNode(nodeID)) {
                    newNodes.push(this.graph.getNode(nodeID))
                    continue
                }
                const nodeData = createNodeData(map, x + G.geometry[map].min_x, y + G.geometry[map].min_y)

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
                if (!this.graph.hasNode(nodeID2)) {
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
            // TODO: Figure out how to know if we have access to a locked door
            if (door[7] || door[8]) continue

            const spawn = G.maps[map].spawns[door[6]]
            const nodeID = createNodeId(map, spawn[0], spawn[1])
            if (!this.graph.hasNode(nodeID)) {
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
        // 3D: Create nodes for spawns
        for (const spawn of G.maps[map].spawns) {
            const spawnNodeId = createNodeId(map, spawn[0], spawn[1])
            if (!this.graph.hasNode(spawnNodeId)) {
                const spawnData = createNodeData(map, spawn[0], spawn[1])
                newNodes.push(this.graph.addNode(spawnNodeId, spawnData))
            }
        }

        // 3E: Create links between nodes which are walkable
        for (let i = 0; i < newNodes.length; i++) {
            for (let j = i + 1; j < newNodes.length; j++) {
                const nodeI = newNodes[i]
                const nodeJ = newNodes[j]
                // if (can_move({ map: nodeI.data.map, x: nodeI.data.x, y: nodeI.data.y, going_x: nodeJ.data.x, going_y: nodeJ.data.y, base: parent.character.base })) {
                if (this.canMove(nodeI.data, nodeJ.data)) {
                    this.graph.addLink(nodeI.id, nodeJ.id)
                    this.graph.addLink(nodeJ.id, nodeI.id)
                }
            }
        }

        // 3F: Create "town" links
        const townNodeID = createNodeId(map, G.maps[map].spawns[0][0], G.maps[map].spawns[0][1])
        const townNodeLinkData: LinkData = {
            type: "town"
        }
        for (const node of newNodes) {
            this.graph.addLink(node.id, townNodeID, townNodeLinkData)
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

    public getGraphInfo(): void {
        console.info("Graph information ----------")
        console.info(`# Nodes: ${this.graph.getNodeCount()}`)
        console.info(`# Links: ${this.graph.getLinkCount()}`)
        console.info("----------------------------")
    }

    private getPath(start: NodeData, goal: NodeData): PathData {
        console.info(`Getting path from [${start.map},${start.x},${start.y}] to [${goal.map},${goal.x},${goal.y}]`)
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

        // Get the data for the path we need to travel (town, teleport, walking)
        const rawPath = this.pathfinder.find(startNode, finishNode)
        console.log(rawPath)
        if (rawPath.length == 0) {
            console.error("could not find a path")
            return undefined
        }
        const optimizedPath: PathData = []
        if (rawPath[rawPath.length - 1].data.x != start.x || rawPath[rawPath.length - 1].data.y != start.y) {
            // Add the starting position
            optimizedPath.push([start, rawPath[rawPath.length - 1].data, undefined])
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

        // 2: TODO: Optimize town teleports


        return optimizedPath
    }

    public async move(goal: PositionReal, finishDistanceTolerance = 0): Promise<unknown> {
        this.reset()
        const searchStart = Date.now()
        this.searchStartTime = searchStart

        const from: NodeData = NGraphMove.cleanPosition(parent.character)
        const to: NodeData = NGraphMove.cleanPosition(goal)

        // Get the path
        const path = this.getPath(from, to)
        this.searchFinishTime = Date.now()
        if (!path) {
            return Promise.reject(`We could not find a path from [${from.map},${from.x},${from.y}] to [${to.map},${to.x},${to.y}] in ${this.searchFinishTime - this.searchStartTime}ms`)
        }

        // DEBUG
        console.log(`We found a path from [${from.map},${from.x},${from.y}] to [${to.map},${to.x},${to.y}] in ${this.searchFinishTime - this.searchStartTime}ms`)
        console.log(path)

        function getCloseTo(from: NodeData): PositionReal {
            if (finishDistanceTolerance == 0) return to // We want to go to this exact position

            // Compute a line from `from` to `destinaton` that is `finishDistanceTolerance` units away.
            const angle = Math.atan2(from.y - to.y, from.x - to.x)
            return {
                map: to.map,
                x: to.x + Math.cos(angle) * finishDistanceTolerance,
                y: to.y + Math.sin(angle) * finishDistanceTolerance
            }
        }

        async function performNextMovement(a: NodeData, b: NodeData, c: LinkData) {
            if (c) {
                if (c.type == "town") {
                    // Use "town" to get to the next node
                    use_skill("town")
                    await new Promise(resolve => setTimeout(resolve, Math.max(...parent.pings) + 4000))
                    return
                } else if (c.type == "transport") {
                    // Transport to the next node
                    transport(b.map, c.spawn)
                    await new Promise(resolve => setTimeout(resolve, Math.max(...parent.pings)))
                    return
                }
            } else {
                // Walk to the next node
                await move(b.x, b.y)
            }
        }

        this.moveStartTime = Date.now()
        for (let i = 0; i < path.length;) {
            const fromData = path[i][0]
            let toData
            if (i == path.length) {
                toData = getCloseTo(path[i][1])
            } else {
                toData = path[i][1]
            }
            const linkData = path[i][2]
            const distance = Math.sqrt((toData.x - parent.character.real_x) ** 2 + (toData.y - parent.character.real_y) ** 2)

            if (this.wasCancelled(searchStart)) {
                console.log(`Search from [${from.map},${from.x},${from.y}] to [${to.map},${to.x},${to.y}] was cancelled`)
                return Promise.reject("cancelled")
            }

            if (distance < 0.001) {
                // We're at the next node, continue
                i++
                continue
            }

            // If we're moving, wait.
            if (parent.character.c.town || parent.character.moving) {
                await new Promise(resolve => setTimeout(resolve, SLEEP_FOR_MS))
                continue
            }

            if (!linkData && !can_move_to(toData.x, toData.y)) {
                // We got lost somewhere, retry
                await new Promise(resolve => setTimeout(resolve, SLEEP_FOR_MS))
                console.warn("NGraphMove movement failed. We're trying again.")
                return this.move(goal, finishDistanceTolerance)
            }

            // DEBUG
            console.log(`STEP: [${fromData.map},${fromData.x},${fromData.y}] to [${toData.map},${toData.x},${toData.y}]`)
            // Perform movement
            await performNextMovement(fromData, toData, linkData)
        }
        this.moveFinishTime = Date.now()

        // DEBUG
        console.log(`We moved from [${from.map},${from.x},${from.y}] to [${to.map},${to.x},${to.y}] in ${this.moveFinishTime - this.moveStartTime}ms`)

        return
    }
}