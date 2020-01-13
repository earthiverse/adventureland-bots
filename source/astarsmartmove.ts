import FastPriorityQueue from 'fastpriorityqueue'
import { IPositionReal, MapName } from './definitions/adventureland';
import { SmartMoveNode, ScoreMap, VisitedMap } from './definitions/astarsmartmove';
import { sleep } from './functions';

export class AStarSmartMove {
    /** The cost to move through doors (so we don't go in and out of them, like smart_move does) */
    private DOOR_MOVEMENT_COST = 25
    /** The cost to move through NPCs (so we don't go in and out of them) */
    private NPC_MOVEMENT_COST = 25
    /** The cost of teleporting to town (so we don't teleport if it's faster to walk) */
    private TOWN_MOVEMENT_COST = 100
    private MOVE_TOLERANCE = 1
    private TOWN_TOLERANCE = 10
    private MOVEMENTS = [
        [[0, 100], [0, 50], [0, 25], [0, 10], [0, 5]], // down
        [[100, 0], [50, 0], [25, 0], [10, 0], [5, 0]], // right
        [[0, -100], [0, -50], [0, -25], [0, -10], [0, -5]], // up
        [[-100, 0], [-50, 0], [-25, 0], [-10, 0], [-5, 0]] // left
    ]

    /** Date the search was finished */
    private _astar_finished: Date = undefined
    /** Date the search was started */
    private _astart_start: Date = undefined
    /** A list of doors and transporters we've visited */
    private _visited_doors: VisitedMap = {}

    /** Returns true if we're following the path. */
    public isMoving(): boolean {
        return this._astar_finished == undefined && this._astart_start != undefined
    }

    /** Returns true if we were pathfinding, but stop() was called. */
    private wasCancelled(start: Date): boolean {
        return (!this._astart_start || start < this._astart_start)
    }

    /** Stop pathfinding */
    public stop() {
        this.reset()
    }

    /** Resets the variables for a fresh run */
    private reset() {
        this._astar_finished = undefined
        this._astart_start = undefined
        this._visited_doors = {}
    }

    /** Removes unnecessary variables, and snaps to the nearest 5th pixel */
    private cleanPosition(position: IPositionReal): IPositionReal {
        return {
            map: position.map,
            x: Math.round((position.real_x !== undefined ? position.real_x : position.x) / 5) * 5,
            y: Math.round((position.real_y !== undefined ? position.real_y : position.y) / 5) * 5
        }
    }

    private positionToString(position: IPositionReal): string {
        return `${position.map}.${position.x}.${position.y}`
    }

    private heuristic(position: IPositionReal, finish: IPositionReal): number {
        let minD = distance(position, finish)
        if (position.map == finish.map) return minD

        // Nearby doors?
        let doorD = 9999
        for (let door of G.maps[position.map].doors) {
            let doorPos: IPositionReal = { map: position.map, x: door[0], y: door[1] }
            let doorPosString = this.positionToString(doorPos)
            if (this._visited_doors[doorPosString] == true) continue // already visited this door

            // TODO: Avoid doors that link to maps that don't have any doors linking to other maps we haven't visited

            let d = distance(position, doorPos)
            if (d < doorD) doorD = d
        }
        let minDoorD = minD + doorD

        // NPC teleports
        // Todo

        return minDoorD
    }

    private smoothPath(path: SmartMoveNode[]): SmartMoveNode[] {
        console.log(`roughPath (${path.length})`)
        console.log(path)
        let newPath: SmartMoveNode[] = []
        newPath.push(path[0])
        for (let i = 0; i < path.length - 1; i++) {
            let pathI = path[i]

            let canWalkTo = i + 1
            for (let j = i + 1; j < path.length; j++) {
                let pathJ = path[j]
                if (pathJ.map != pathI.map) break // can't smooth across maps
                if (pathJ.town) break // can't smooth across town warps

                if (can_move({
                    map: pathI.map,
                    x: pathI.x,
                    y: pathI.y,
                    going_x: pathJ.x,
                    going_y: pathJ.y,
                    base: parent.character.base
                })) {
                    canWalkTo = j
                }
            }
            newPath.push(path[canWalkTo])
            i = canWalkTo - 1
        }
        console.log(`smooth path (${newPath.length})`)
        console.log(newPath)
        return newPath
    }

    private reconstructPath(current: SmartMoveNode, finish: SmartMoveNode): SmartMoveNode[] {

        let path: SmartMoveNode[] = []
        let i = 0
        path.push({
            map: finish.map,
            x: finish.x,
            real_x: finish.x,
            y: finish.y,
            real_y: finish.y,
            town: finish.town,
            transport: finish.transport,
            s: finish.s
        })
        while (current.from) {
            path.push({
                map: current.map,
                x: current.x,
                real_x: current.x,
                y: current.y,
                real_y: current.y,
                town: current.town,
                transport: current.transport,
                s: current.s
            })
            current = current.from
            i += 1
        }
        return this.smoothPath(path.reverse())
    }

    public async astar_smart_move(finish: IPositionReal) {
        this.reset()
        this._astart_start = new Date()

        let movements = await this.get_movements(parent.character, finish)

        let i = 0;
        let movementComplete = new Promise((resolve, reject) => {
            let movementLoop = (start: Date) => {
                if (this.wasCancelled(start)) {
                    reject("cancelled")
                    return
                }

                let nextMove = movements[i]

                if (distance(parent.character, movements[movements.length - 1]) < this.MOVE_TOLERANCE) {
                    // We're done!
                    game_log("a* - done")
                    this._astar_finished = new Date()
                    resolve()
                    return
                }

                if (parent.character.moving || is_transporting(parent.character) || !can_walk(parent.character)) {
                    // We are moving, we need to be patient.
                } else if (nextMove.transport) {
                    if (parent.character.map == nextMove.map) {
                        i += 1 // we're here -- next
                        setTimeout(() => { movementLoop(start) }, 10)
                        return
                    } else {
                        game_log("a* - transport")
                        transport(nextMove.map, nextMove.s)
                    }
                } else if (nextMove.town) {
                    if (distance(parent.character, nextMove) < this.TOWN_TOLERANCE) {
                        i += 1 // we're here -- next
                        setTimeout(() => { movementLoop(start) }, 10)
                        return
                    } else {
                        game_log("a* - town")
                        use_skill("town")
                    }
                    setTimeout(() => { movementLoop(start) }, 1000) // Town warps take a while
                    return
                } else if (parent.character.map == nextMove.map && can_move_to(nextMove.x, nextMove.y)) {
                    if (distance(parent.character, nextMove) < this.MOVE_TOLERANCE) {
                        i += 1 // we're here -- next
                    } else {
                        game_log(`a* - next movement (${nextMove.x}, ${nextMove.y})`)
                        move(nextMove.x, nextMove.y)
                    }
                } else {
                    // Oh no! Something went wrong with our movement
                    game_log("a* - oh no")
                    this.reset()
                    reject()
                    return
                }
                setTimeout(() => { movementLoop(start) }, 40)
            }

            game_log("a* - start")
            movementLoop(this._astart_start)
        })

        return await movementComplete
    }

    private async get_movements(start: IPositionReal, finish: IPositionReal, startTime: Date = this._astart_start): Promise<SmartMoveNode[]> {
        let cleanStart = this.cleanPosition(start)
        let cleanStartString = this.positionToString(cleanStart)
        let cleanFinish = this.cleanPosition(finish)
        let cleanFinishString = this.positionToString(cleanFinish)
        console.log(`starting search from ${this.positionToString(cleanStart)} to ${this.positionToString(cleanFinish)}`)

        /** Unvisited nodes */
        let openSet = new FastPriorityQueue<SmartMoveNode>(function (a: SmartMoveNode, b: SmartMoveNode) {
            let h_a = a.priority
            let h_b = b.priority
            return h_a < h_b
        })
        openSet.add({ ...cleanStart, priority: this.heuristic(cleanStart, cleanFinish) })
        // let openSet = new TinyQueue<SmartMoveNode>([{ ...cleanStart, priority: this.heuristic(cleanStart, cleanFinish) }], ;
        let openSetStrings = new Set<string>(cleanStartString)

        /** Cost to get to the current node */
        let gScore: ScoreMap = {}
        gScore[cleanStartString] = 0

        let timer = Date.now()
        while (openSet.size) {
            let current = openSet.poll()
            let currentString = this.positionToString(current)
            openSetStrings.delete(currentString)

            if (current.map == cleanFinish.map
                && can_move({
                    map: current.map,
                    x: current.x,
                    y: current.y,
                    going_x: cleanFinish.x,
                    going_y: cleanFinish.y,
                    base: parent.character.base
                })) {

                // We can walk to the finish, we're done!
                let path = this.reconstructPath(current, cleanFinish)
                return Promise.resolve(path)
            }

            // Explore Neighbors
            // Movement Neighbors
            for (let subMovements of this.MOVEMENTS) {
                for (let subMovement of subMovements) {
                    let neighbor: SmartMoveNode = this.cleanPosition({
                        map: current.map,
                        x: current.x + subMovement[0],
                        y: current.y + subMovement[1]
                    })
                    let neighborString = this.positionToString(neighbor)

                    if (can_move({
                        map: current.map,
                        x: current.x,
                        y: current.y,
                        going_x: neighbor.x,
                        going_y: neighbor.y,
                        base: parent.character.base
                    })) {
                        let tentative_gScore = gScore[currentString] + Math.abs(subMovement[0]) + Math.abs(subMovement[1])
                        if (!gScore[neighborString] /* No score yet */
                            || tentative_gScore < gScore[neighborString] /* This path is more efficient */) {
                            gScore[neighborString] = tentative_gScore
                            neighbor.priority = tentative_gScore + this.heuristic(neighbor, cleanFinish)
                            neighbor.from = current
                            if (!openSetStrings.has(neighborString)) {
                                openSetStrings.add(neighborString)
                                openSet.add(neighbor)
                            }
                        }
                    }
                }
            }

            // Door Neighbors
            for (let door of G.maps[current.map].doors) {
                if (can_use_door(current.map, door, current.x, current.y)) {
                    let doorPos: IPositionReal = {
                        map: door[4],
                        x: G.maps[door[4]].spawns[door[5] || 0][0],
                        y: G.maps[door[4]].spawns[door[5] || 0][1]
                    }
                    let doorPosString = this.positionToString(doorPos)
                    let neighbor: SmartMoveNode = this.cleanPosition(doorPos)
                    neighbor.transport = true
                    neighbor.s = door[5]
                    let neighborString = this.positionToString(neighbor)

                    let tentative_gScore = gScore[currentString] + this.DOOR_MOVEMENT_COST
                    if (!gScore[neighborString] /* No score yet */
                        || tentative_gScore < gScore[neighborString] /* This path is more efficient */) {
                        this._visited_doors[doorPosString] = true
                        gScore[neighborString] = tentative_gScore
                        neighbor.priority = tentative_gScore + this.heuristic(neighbor, cleanFinish)
                        neighbor.from = current
                        if (!openSetStrings.has(neighborString)) {
                            openSetStrings.add(neighborString)
                            openSet.add(neighbor)
                        }
                    }
                }
            }

            // NPC Teleport Neighbors
            for (let npc of G.maps[current.map].npcs) {
                if (npc.id !== "transporter") continue // not a teleporter
                let teleporterPos = { map: current.map, x: npc.position[0], y: npc.position[1] }
                let teleporterPosString = this.positionToString(teleporterPos)
                if (distance(current, teleporterPos) > 75) continue // out of range

                for (let map in G.npcs.transporter.places) {
                    let s = G.npcs.transporter.places[map as MapName]
                    let p = G.maps[map as MapName].spawns[s]
                    let neighbor: SmartMoveNode = this.cleanPosition({
                        map: map as MapName,
                        x: p[0],
                        y: p[1]
                    })
                    neighbor.transport = true
                    neighbor.s = s
                    let neighborString = this.positionToString(neighbor)

                    let tentative_gScore = gScore[currentString] + this.NPC_MOVEMENT_COST
                    if (!gScore[neighborString] /* No score yet */
                        || tentative_gScore < gScore[neighborString] /* This path is more efficient */) {
                        this._visited_doors[teleporterPosString] = true
                        gScore[neighborString] = tentative_gScore
                        neighbor.priority = tentative_gScore + this.heuristic(neighbor, cleanFinish)
                        neighbor.from = current
                        if (!openSetStrings.has(neighborString)) {
                            openSetStrings.add(neighborString)
                            openSet.add(neighbor)
                        }
                    }
                }
            }

            // Town Teleport Neighbors
            let townNeighbor: SmartMoveNode = this.cleanPosition({
                map: current.map,
                x: G.maps[current.map].spawns[0][0],
                y: G.maps[current.map].spawns[0][1]
            })
            let townNeighborString = this.positionToString(townNeighbor)
            townNeighbor.town = true
            let tentative_gScore = gScore[currentString] + this.TOWN_MOVEMENT_COST
            if (!gScore[townNeighborString] /* No score yet */
                || tentative_gScore < gScore[townNeighborString] /* This path is more efficient */) {
                gScore[townNeighborString] = tentative_gScore
                townNeighbor.priority = tentative_gScore + this.heuristic(townNeighbor, cleanFinish)
                townNeighbor.from = current
                if (!openSetStrings.has(townNeighborString)) {
                    openSetStrings.add(townNeighborString)
                    openSet.add(townNeighbor)
                }
            }

            // Don't lock up the game
            if (Date.now() - timer > 1000) {
                // game_log(`open: ${openSet.length}`)
                // game_log(`best: ${openSet.peek().map}, ${Math.floor(openSet.peek().y)}, ${Math.floor(openSet.peek().x)}`)
                //game_log(`heuristic: ${openSet.peek().priority}`)
                await sleep(40)
                timer = Date.now()
                if (this.wasCancelled(startTime)) return Promise.reject("cancelled")
            }
        }

        game_log("fail")
        this.reset()
        return Promise.reject("Failed to find a path...")
    }
}