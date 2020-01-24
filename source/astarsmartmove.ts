import FastPriorityQueue from 'fastpriorityqueue'
import { IPositionReal, MapName, ICharacter } from './definitions/adventureland';
import { SmartMoveNode, ScoreMap, VisitedMap, FromMap } from './definitions/astarsmartmove';
import { sleep } from './functions';
import { IpcNetConnectOpts } from 'net';

export class AStarSmartMove {
    /** The cost of teleporting to town (so we don't teleport if it's faster to walk) */
    private TOWN_MOVEMENT_COST = 200
    private DOOR_TOLERANCE = 40 - 2
    private TELEPORT_TOLERANCE = 75 - 2
    private MOVE_TOLERANCE = 1
    private TOWN_TOLERANCE = 1
    private FINISH_CHECK_DISTANCE = 200
    /** A list of movements to search for. */
    private MOVEMENTS = [
        [[0, 25], [0, 5]], // down
        [[25, 0], [5, 0]], // right
        [[0, -25], [0, -5]], // up
        [[-25, 0], [-5, 0]] // left
    ]

    /** If we fail pathfinding, we will randomly try to move a small distance to see if it helps */
    private MOVE_ON_FAIL = true

    private SHOW_MESSAGES = true
    private MESSAGE_COLOR = "#F7600E"

    /** Date the search was finished */
    private _astar_finished: Date
    /** Date the search was started */
    private _astart_start: Date

    /** A cache for travelling from door to door */
    private doorCache: Map<string, SmartMoveNode[]> = new Map<string, SmartMoveNode[]>()

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
    }

    /** Removes unnecessary variables, and snaps to the nearest pixel */
    private cleanPosition(position: SmartMoveNode): SmartMoveNode {
        let clean = {
            map: position.map,
            x: (position.real_x !== undefined ? position.real_x : position.x),
            y: (position.real_y !== undefined ? position.real_y : position.y),
            transportS: position.transportS,
            transportMap: position.transportMap,
            transportType: position.transportType,
            town: position.town
        }
        return clean
    }

    private positionToString(position: IPositionReal): string {
        return `${position.map}.${position.x}.${position.y}`
    }

    private stringToPosition(positionString: string): IPositionReal {
        let s = positionString.split(".")
        let map = s[0] as MapName
        let x = Number.parseFloat(s[1])
        let y = Number.parseFloat(s[2])
        return {
            map: map,
            x: x,
            real_x: x,
            y: y,
            real_y: y
        }
    }

    // public findDoorPath2(position: IPositionReal, destination: IPositionReal, visitedNodes: Set<SmartMoveNode> = new Set<SmartMoveNode>(), visitedDoors: Set<string> = new Set<string>()): [number, SmartMoveNode[]] {
    //     // Add our current position to the visited nodes
    //     visitedNodes.add(position)

    //     // Exit case -- when we find the map we're supposed to be on
    //     if (position.map == destination.map) {
    //         let d = distance(position, destination)
    //         let path: IPositionReal[] = []
    //         for (const door of visitedNodes) {
    //             path.push(door)
    //         }
    //         path.push(destination)
    //         return [d, path]
    //     }

    //     // Traverse Doors
    //     // Physical doors
    //     let doors = [...G.maps[position.map].doors]
    //     // Transporter doors
    //     for (const npc of G.maps[position.map].npcs) {
    //         if (npc.id !== "transporter") continue // not a teleporter

    //         for (const map in G.npcs.transporter.places) {
    //             doors.push([npc.position[0], npc.position[1], -1, -1, map as MapName, G.npcs.transporter.places[map as MapName]])
    //         }
    //         break
    //     }

    //     let currentBestDistance: number = Number.MAX_VALUE
    //     let currentBestPath: IPositionReal[]
    //     for (const door of doors) {
    //         let doorExitMap = door[4]

    //         let doorEntrance: SmartMoveNode = { map: position.map, x: door[0], y: door[1], transportS: door[5], transportMap: doorExitMap, transportType: door[3] == -1 ? "teleport" : "door" }
    //         let doorExit: SmartMoveNode = { map: doorExitMap, x: G.maps[doorExitMap].spawns[door[5]][0], y: G.maps[doorExitMap].spawns[door[5]][1] }
    //         let doorExitString = this.positionToString(doorExit)
    //         if (visitedDoors.has(doorExitString)) continue // don't revisit maps we've already visited

    //         let newVisitedMaps = new Set(visitedDoors)
    //         newVisitedMaps.add(doorExitString)

    //         let newVisitedNodes = new Set(visitedNodes)
    //         newVisitedNodes.add(doorEntrance)

    //         let doorEntranceString = this.positionToString(doorEntrance)
    //         const doorCacheKey = `${doorEntranceString}_${doorExitString}`

    //         let d
    //         if (this.doorCache.has(doorCacheKey)) { // use the actual distance instead of the heuristic
    //             let path = this.doorCache.get(doorCacheKey)
    //             let lastMovement = path[0]
    //             d = 0
    //             for (let i = 1; i < path.length; i++) {
    //                 let pathI = path[i]
    //                 d += distance(lastMovement, pathI)
    //                 lastMovement = pathI
    //             }
    //         } else {
    //             d = distance(position, doorEntrance)
    //         }
    //         if (currentBestDistance < d) continue // We have a better path
    //         let [d2, path] = this.findDoorPath(doorExit, destination, newVisitedNodes, newVisitedMaps)
    //         if (currentBestDistance > d2 + d) {
    //             currentBestDistance = d2 + d
    //             currentBestPath = path
    //         }
    //     }

    //     return [currentBestDistance, currentBestPath]
    // }

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

    private smoothPath2(path: SmartMoveNode[]): SmartMoveNode[] {
        console.log(`roughPath (${path.length})`)
        console.log(path)

        let newPath: SmartMoveNode[] = []
        newPath.push(path[0])
        // NOTE: At this point, the path is reversed. We're working backwards, and we will reverse it in to the correct order after this loop
        for (let i = 0; i < path.length - 1; i++) {
            let iPath = path[i]

            let canWalkTo = i + 1
            for (let j = i + 1; j < path.length; j++) {
                let jPath = path[j]

                if(jPath.town) {
                    // The warp is the first move we do, so we don't need to do anything before this
                    canWalkTo = j
                    i = path.length
                    break
                }

                if (can_move({
                    map: iPath.map,
                    x: jPath.x,
                    y: jPath.y,
                    going_x: iPath.x,
                    going_y: iPath.y,
                    base: parent.character.base
                })) {
                    canWalkTo = j
                    i = j - 1
                }
            }
            if (canWalkTo > 0) newPath.push(path[canWalkTo])
        }

        newPath = newPath.reverse()
        console.log(`smooth path (${newPath.length})`)
        console.log(newPath)

        return newPath
    }

    // private smoothPath(path: SmartMoveNode[]): SmartMoveNode[] {
    //     console.log(`roughPath (${path.length})`)
    //     console.log(path)
    //     let newPath: SmartMoveNode[] = []
    //     newPath.push(path[0])
    //     for (let i = 0; i < path.length - 1; i++) {
    //         let pathI = path[i]

    //         let canWalkTo = i + 1
    //         for (let j = i + 1; j < path.length; j++) {
    //             let pathJ = path[j]
    //             if (pathJ.map != pathI.map) break // can't smooth across maps

    //             if (can_move({
    //                 map: pathI.map,
    //                 x: pathI.x,
    //                 y: pathI.y,
    //                 going_x: pathJ.x,
    //                 going_y: pathJ.y,
    //                 base: parent.character.base
    //             })) {
    //                 canWalkTo = j
    //             }
    //         }
    //         newPath.push(path[canWalkTo])
    //         i = canWalkTo - 1
    //     }
    //     console.log(`smooth path (${newPath.length})`)
    //     console.log(newPath)

    //     // Remove the first move position if we're going to town
    //     if (newPath[1].town) newPath.splice(0, 1)

    //     return newPath
    // }

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
        return this.smoothPath2(path)
    }

    public async astar_smart_move(destination: IPositionReal) {
        this.reset()
        this._astart_start = new Date()

        let movements: SmartMoveNode[] = []
        let start = Date.now()
        if (this.SHOW_MESSAGES) game_log("a* - start searching", this.MESSAGE_COLOR)
        let doors = this.findDoorPath(this.cleanPosition(parent.character), this.cleanPosition(destination))[1]

        for (let i = 0; i < doors.length; i += 2) {
            const from = doors[i]
            const to = doors[i + 1]
            const doorCacheKey = `${this.positionToString(from)}_${this.positionToString(to)}`

            let subMovements;
            if (this.doorCache.has(doorCacheKey)) {
                subMovements = this.doorCache.get(doorCacheKey)
            } else {
                subMovements = await this.get_movements(from, to)

                // Cache all the submovements
                for(let i = 0; i < subMovements.length; i++) {
                    let cachePath2 = [...subMovements].splice(i, subMovements.length - i)
                    let cacheKey2 = `${this.positionToString(cachePath2[0])}_${this.positionToString(to)}`
                    this.doorCache.set(cacheKey2, cachePath2)
                }
            }

            movements = movements.concat(subMovements)
        }
        if (this.SHOW_MESSAGES) game_log(`a* - finish searching (${((Date.now() - start) / 1000).toFixed(1)} s)`, this.MESSAGE_COLOR)

        let i = 0;
        let movementComplete = new Promise((resolve, reject) => {
            let movementLoop = (start: Date) => {
                if (this.wasCancelled(start)) {
                    reject("a* - cancelled moving")
                    return
                }

                let nextMove = movements[i]

                if (distance(parent.character, movements[movements.length - 1]) < this.MOVE_TOLERANCE) {
                    // We're done!
                    if (this.SHOW_MESSAGES) game_log("a* - done moving", this.MESSAGE_COLOR)
                    this._astar_finished = new Date()
                    resolve()
                    return
                }

                if (parent.character.moving || is_transporting(parent.character) || !can_walk(parent.character)) {
                    // We are moving, we need to be patient.
                    // TODO: Cooldown based on how much time it will take to walk there
                } else if (nextMove.map == parent.character.map && nextMove.town) {
                    if (distance(parent.character, nextMove) < this.TOWN_TOLERANCE) {
                        i += 1 // we're here -- next
                        movementLoop(start)
                        return
                    } else {
                        use_skill("town")
                    }
                    setTimeout(() => { movementLoop(start) }, 900) // Town warps take a while
                    return
                } else if (parent.character.map == nextMove.map && can_move_to(nextMove.x, nextMove.y)) {
                    if (distance(parent.character, nextMove) < this.MOVE_TOLERANCE) {
                        if (nextMove.transportMap) {
                            if (parent.character.map == nextMove.map) {
                                transport(nextMove.transportMap, nextMove.transportS)
                                i += 1 // we're here -- next
                                setTimeout(() => { movementLoop(start) }, 100) // Transports take a bit
                                return
                            }
                        } else {
                            i += 1 // we're here -- next
                            movementLoop(start)
                            return
                        }
                    } else {
                        move(nextMove.x, nextMove.y)
                    }
                } else {
                    // Oh no! Something went wrong with our movement
                    if (this.SHOW_MESSAGES) game_log("a* - failed moving", this.MESSAGE_COLOR)
                    if (this.MOVE_ON_FAIL) {
                        let random_x = Math.random() * (1 - -1) + -1
                        let random_y = Math.random() * (1 - -1) + -1
                        move(parent.character.real_x + random_x, parent.character.real_y + random_y)
                    }
                    this.reset()
                    reject("failed moving")
                    return
                }
                setTimeout(() => { movementLoop(start) }, 40)
            }

            if (this.SHOW_MESSAGES) game_log("a* - start moving", this.MESSAGE_COLOR)
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
            if (current.map == cleanFinish.map && distance(current, cleanFinish) < this.FINISH_CHECK_DISTANCE) {
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
                        x: Math.trunc(current.x + subMovement[0]),
                        y: Math.trunc(current.y + subMovement[1])
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


            // Don't lock up the game
            if (Date.now() - timer > 40) {
                await sleep(1)
                timer = Date.now()
                if (this.wasCancelled(startTime)) return Promise.reject("cancelled")
            }
        }

        if (this.SHOW_MESSAGES) game_log("a* - failed searching", this.MESSAGE_COLOR)

        try {
            // Return the closest point we found to the destination.
            let finalPointString: string
            let minScore = Number.MAX_VALUE
            for (let [pointString, f] of fScore) {
                let g = gScore.get(pointString)
                if (f - g < minScore) {
                    minScore = f - g
                    finalPointString = pointString
                }
            }
            let finalPoint = this.stringToPosition(finalPointString)
            let path = this.reconstructPath(finalPoint, cleanFinish, cameFrom)
            return Promise.resolve(path)
        } catch (error) {
            // Failed hardcore.
            return Promise.reject("Failed to find a path...")
        }
    }
}