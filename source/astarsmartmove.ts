import FastPriorityQueue from 'fastpriorityqueue'
import { IPositionReal, MapName, ICharacter } from './definitions/adventureland';
import { SmartMoveNode, ScoreMap, VisitedMap, FromMap } from './definitions/astarsmartmove';
import { sleep } from './functions';
import { IpcNetConnectOpts } from 'net';

export class AStarSmartMove {
    /** The cost of teleporting to town (so we don't teleport if it's faster to walk) */
    private TOWN_MOVEMENT_COST = 200
    private DOOR_TOLERANCE = 40 - 10
    private TELEPORT_TOLERANCE = 75 - 10
    private MOVE_TOLERANCE = 1
    private TOWN_TOLERANCE = 10
    private MOVEMENTS = [
        [[0, 25], [0, 5]], // down
        [[25, 0], [5, 0]], // right
        [[0, -25], [0, -5]], // up
        [[-25, 0], [-5, 0]] // left
    ]

    /** Date the search was finished */
    private _astar_finished: Date
    /** Date the search was started */
    private _astart_start: Date
    /** Used for the heuristic */
    private currentBest: number

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
        this.currentBest = Number.MAX_VALUE
    }

    /** Removes unnecessary variables, and snaps to the nearest 5th pixel */
    private cleanPosition(position: SmartMoveNode): SmartMoveNode {
        return {
            map: position.map,
            x: Math.round((position.real_x !== undefined ? position.real_x : position.x) / 5) * 5,
            y: Math.round((position.real_y !== undefined ? position.real_y : position.y) / 5) * 5,
            transportS: position.transportS,
            transportMap: position.transportMap,
            transportType: position.transportType,
            town: position.town
        }
    }

    private positionToString(position: IPositionReal): string {
        return `${position.map}.${position.x}.${position.y}`
    }

    public findDoorPath(position: IPositionReal, destination: IPositionReal, visitedNodes: Set<SmartMoveNode> = new Set<SmartMoveNode>(), visitedMaps: Set<string> = new Set<string>()): [number, SmartMoveNode[]] {
        // Add our current position to the visited nodes
        visitedNodes.add(position)

        // Exit case -- when we find the map we're supposed to be on
        if (position.map == destination.map) {
            let d = distance(position, destination)
            let path: IPositionReal[] = []
            for (const door of visitedNodes) {
                path.push(door)
            }
            path.push(destination)
            return [d, path]
        }

        // Traverse Doors
        // Physical doors
        let doors = [...G.maps[position.map].doors]
        // Transporter doors
        for (const npc of G.maps[position.map].npcs) {
            if (npc.id !== "transporter") continue // not a teleporter

            for (const map in G.npcs.transporter.places) {
                doors.push([npc.position[0], npc.position[1], -1, -1, map as MapName, G.npcs.transporter.places[map as MapName]])
            }
            break
        }

        let currentBestDistance: number = Number.MAX_VALUE
        let currentBestPath: IPositionReal[]
        for (const door of doors) {
            let doorExitMap = door[4]
            if (visitedMaps.has(doorExitMap)) continue // don't revisit maps we've already visited

            let doorEntrance: SmartMoveNode = { map: position.map, x: door[0], y: door[1], transportS: door[5], transportMap: doorExitMap, transportType: door[3] == -1 ? "teleport" : "door" }
            let doorExit: SmartMoveNode = { map: doorExitMap, x: G.maps[doorExitMap].spawns[door[5]][0], y: G.maps[doorExitMap].spawns[door[5]][1] }

            let newVisitedMaps = new Set(visitedMaps)
            newVisitedMaps.add(doorExitMap)

            let newVisitedDoors = new Set(visitedNodes)
            newVisitedDoors.add(doorEntrance)

            let d = distance(position, doorEntrance)
            if (currentBestDistance < d) continue // We have a better path
            let [d2, path] = this.findDoorPath(doorExit, destination, newVisitedDoors, newVisitedMaps)
            if (currentBestDistance > d2 + d) {
                currentBestDistance = d2 + d
                currentBestPath = path
            }
        }

        return [currentBestDistance, currentBestPath]
    }

    private heuristic(position: IPositionReal, finish: IPositionReal): number {
        return distance(position, finish)
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

    private reconstructPath(current: SmartMoveNode, finish: SmartMoveNode, cameFrom: FromMap): SmartMoveNode[] {
        let path: SmartMoveNode[] = []
        path.push({
            map: finish.map,
            x: finish.x,
            real_x: finish.x,
            y: finish.y,
            real_y: finish.y,
            town: finish.town,
            transportMap: finish.transportMap,
            transportS: finish.transportS
        })
        while (current) {
            path.push({
                map: current.map,
                x: current.x,
                real_x: current.x,
                y: current.y,
                real_y: current.y,
                town: current.town,
                transportMap: current.transportMap,
                transportS: current.transportS
            })
            current = cameFrom.get(this.positionToString(current))
        }
        return this.smoothPath(path.reverse())
    }

    public async astar_smart_move(destination: IPositionReal) {
        this.reset()
        this._astart_start = new Date()

        let movements: SmartMoveNode[] = []
        let doors = this.findDoorPath(this.cleanPosition(parent.character), this.cleanPosition(destination))[1]

        console.log("here is our door path")
        console.log(doors)
        console.log("----------")

        for (let i = 0; i < doors.length; i += 2) {
            const from = doors[i]
            const to = doors[i + 1]

            console.log(`starting search`)
            console.log(`from: `)
            console.log(from)
            console.log(`to: `)
            console.log(to)

            let subMovements = await this.get_movements(from, to)

            console.log("here are our submovements")
            console.log(subMovements)
            console.log("----------")

            movements = movements.concat(subMovements)
        }

        console.log("here are our movements")
        console.log(movements)
        console.log("----------")

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
                    // TODO: Cooldown based on how much time it will take to walk there
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
                        if (nextMove.transportMap) {
                            if (parent.character.map == nextMove.map) {
                                game_log("a* - transport")
                                transport(nextMove.transportMap, nextMove.transportS)
                                i += 1 // we're here -- next
                            }
                        } else {
                            i += 1 // we're here -- next
                        }
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

    private async get_movements(start: SmartMoveNode, finish: SmartMoveNode, startTime: Date = this._astart_start): Promise<SmartMoveNode[]> {
        let cleanStart = this.cleanPosition(start)
        let cleanStartString = this.positionToString(cleanStart)
        let cleanFinish = this.cleanPosition(finish)

        let cameFrom: FromMap = new Map<string, SmartMoveNode>()

        /** Cost to get to the current node */
        let gScore: ScoreMap = new Map<string, number>()
        gScore.set(cleanStartString, 0)

        let fScore: ScoreMap = new Map<string, number>()
        fScore.set(cleanStartString, this.heuristic(cleanStart, cleanFinish))

        /** Unvisited nodes */
        let openSet = new FastPriorityQueue<SmartMoveNode>((a: SmartMoveNode, b: SmartMoveNode) => {
            return fScore.get(this.positionToString(a)) < fScore.get(this.positionToString(b))
        })
        openSet.add({ ...cleanStart })
        let openSetNodes: VisitedMap = new Set<string>()

        // Town Teleport
        let neighbor: SmartMoveNode = this.cleanPosition({
            map: cleanStart.map,
            x: G.maps[cleanStart.map].spawns[0][0],
            y: G.maps[cleanStart.map].spawns[0][1],
            town: true
        })
        let neighborString = this.positionToString(neighbor)
        let tentative_gScore = gScore.get(cleanStartString) + this.TOWN_MOVEMENT_COST
        if (neighborString !== cleanStartString) {
            console.log(`${neighborString} vs ${cleanStartString}`)
            if (!gScore.get(neighborString) /* No score yet */
                || tentative_gScore < gScore.get(neighborString) /* This path is more efficient */) {
                cameFrom.set(neighborString, cleanStart)
                gScore.set(neighborString, tentative_gScore)
                fScore.set(neighborString, tentative_gScore + this.heuristic(neighbor, cleanFinish))
                if (!openSetNodes.has(neighborString)) {
                    openSetNodes.add(neighborString)
                    openSet.add(neighbor)
                }
            }
        }

        let timer = Date.now()
        while (openSet.size) {
            let current = openSet.poll()
            let currentString = this.positionToString(current)
            openSetNodes.delete(currentString)

            // Check if we can finish pathfinding from the current point
            if (current.map == cleanFinish.map) {
                let closeFinish = { ...cleanFinish }
                if (cleanFinish.transportMap) {
                    // We only have to get close if our destination is a door, we don't have to be on the same position
                    let angle = Math.atan2(current.y - cleanFinish.y, current.x - cleanFinish.x)
                    closeFinish.x = cleanFinish.x + Math.cos(angle) * (cleanFinish.transportType == "teleport" ? this.TELEPORT_TOLERANCE : this.DOOR_TOLERANCE)
                    closeFinish.y = cleanFinish.y + Math.sin(angle) * (cleanFinish.transportType == "teleport" ? this.TELEPORT_TOLERANCE : this.DOOR_TOLERANCE)
                }

                if (can_move({
                    map: current.map,
                    x: current.x,
                    y: current.y,
                    going_x: closeFinish.x,
                    going_y: closeFinish.y,
                    base: parent.character.base
                })) {
                    // We can walk to the finish, we're done!
                    let path = this.reconstructPath(current, closeFinish, cameFrom)
                    return Promise.resolve(path)
                }
            }

            // Explore Neighbors
            // Movement Neighbors
            for (const subMovements of this.MOVEMENTS) {
                for (const subMovement of subMovements) {
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
                        let tentative_gScore = gScore.get(currentString) + Math.abs(subMovement[0]) + Math.abs(subMovement[1])
                        if (!gScore.has(neighborString) /* No score yet */
                            || tentative_gScore < gScore.get(neighborString) /* This path is more efficient */) {
                            cameFrom.set(neighborString, current)
                            gScore.set(neighborString, tentative_gScore)
                            fScore.set(neighborString, tentative_gScore + this.heuristic(neighbor, cleanFinish))
                            if (!openSetNodes.has(neighborString)) {
                                openSetNodes.add(neighborString)
                                openSet.add(neighbor)
                            }
                        }
                    }
                }
            }

            // // Door Neighbors
            // for (const door of G.maps[current.map].doors) {
            //     if (can_use_door(current.map, door, current.x, current.y)) {
            //         let doorPos: IPositionReal = {
            //             map: door[4],
            //             x: G.maps[door[4]].spawns[door[5] || 0][0],
            //             y: G.maps[door[4]].spawns[door[5] || 0][1]
            //         }
            //         let neighbor: SmartMoveNode = this.cleanPosition(doorPos)
            //         let neighborString = this.positionToString(neighbor)
            //         neighbor.transport = true
            //         neighbor.s = door[5]

            //         let tentative_gScore = gScore.get(currentString) + this.DOOR_MOVEMENT_COST
            //         if (!gScore.get(neighborString) /* No score yet */
            //             || tentative_gScore < gScore.get(neighborString) /* This path is more efficient */) {
            //             cameFrom.set(neighborString, current)
            //             gScore.set(neighborString, tentative_gScore)
            //             fScore.set(neighborString, tentative_gScore + this.heuristic(neighbor, cleanFinish))
            //             if (!openSetNodes.has(neighborString)) {
            //                 openSetNodes.add(neighborString)
            //                 openSet.add(neighbor)
            //             }
            //         }
            //     }
            // }

            // // NPC Teleport Neighbors
            // for (const npc of G.maps[current.map].npcs) {
            //     if (npc.id !== "transporter") continue // not a teleporter
            //     let teleporterPos = { map: current.map, x: npc.position[0], y: npc.position[1] }
            //     if (distance(current, teleporterPos) > 75) continue // out of range

            //     for (const map in G.npcs.transporter.places) {
            //         let s = G.npcs.transporter.places[map as MapName]
            //         let p = G.maps[map as MapName].spawns[s]
            //         let neighbor: SmartMoveNode = this.cleanPosition({
            //             map: map as MapName,
            //             x: p[0],
            //             y: p[1]
            //         })
            //         let neighborString = this.positionToString(neighbor)
            //         neighbor.transport = true
            //         neighbor.s = s

            //         let tentative_gScore = gScore.get(currentString) + this.NPC_MOVEMENT_COST
            //         if (!gScore.get(neighborString) /* No score yet */
            //             || tentative_gScore < gScore.get(neighborString) /* This path is more efficient */) {
            //             cameFrom.set(neighborString, current)
            //             gScore.set(neighborString, tentative_gScore)
            //             fScore.set(neighborString, tentative_gScore + this.heuristic(neighbor, cleanFinish))
            //             if (!openSetNodes.has(neighborString)) {
            //                 openSetNodes.add(neighborString)
            //                 openSet.add(neighbor)
            //             }
            //         }
            //     }
            // }

            // // Town Teleport Neighbors
            // if (cameFrom.get(currentString) == undefined) {

            // }

            // Don't lock up the game
            if (Date.now() - timer > 40) {
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