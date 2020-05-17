import FastPriorityQueue from "fastpriorityqueue"
import { PositionReal, MapName } from "./definitions/adventureland"
import { SmartMoveNode, ScoreMap, VisitedMap, FromMap } from "./definitions/astarsmartmove"
import { sleep } from "./functions"

export class AStarSmartMove {
    /** The cost of teleporting to town (so we don't teleport if it's faster to walk) */
    private TOWN_MOVEMENT_COST = 250
    private DOOR_TOLERANCE = 40 - 2
    private TELEPORT_TOLERANCE = 75 - 2
    private MOVE_TOLERANCE = 1
    private TOWN_TOLERANCE = 1
    /** If we are looking for a path, it will lock up the game, as the search is intensive. We will sleep every this amount of time to prevent locking up the game for too long. */
    private SLEEP_AFTER_MS = 500
    /** We will sleep for this long after taking a break from pathfinding */
    private SLEEP_FOR_MS = 50
    /** The distance from the target in which we start checking if we can walk in a straight line to reach it */
    private FINISH_CHECK_DISTANCE = 200
    /** A list of movements to search for. */
    private MOVEMENTS = [
        [[0, 25], [0, 5]], // down
        [[25, 0], [5, 0]], // right
        [[0, -25], [0, -5]], // up
        [[-25, 0], [-5, 0]] // left
    ]

    /** A flag for whether or not to use blink for mages */
    private USE_BLINK = true

    /** If we fail pathfinding, we will randomly try to move a small distance to see if it helps */
    private MOVE_ON_FAIL = false

    private SHOW_MESSAGES = false
    private MESSAGE_COLOR = "#F7600E"

    /** Date the search was finished */
    private finishedDate: Date
    /** Date the search was started */
    private startDate: Date

    /** A cache for travelling from door to door */
    private doorCache: Map<string, SmartMoveNode[]> = new Map<string, SmartMoveNode[]>()

    /** Returns true if we're following the path. */
    public isMoving(): boolean {
        return this.finishedDate == undefined && this.startDate != undefined
    }

    /** Returns true if we were pathfinding, but stop() was called. */
    private wasCancelled(start: Date): boolean {
        return (!this.startDate || start < this.startDate)
    }

    /** Stop pathfinding */
    public stop(): void {
        this.reset()
        if (parent.character.c.town) stop("town")
        stop()
    }

    /** Resets the variables for a fresh run */
    private reset(): void {
        this.finishedDate = undefined
        this.startDate = undefined
    }

    /** Removes unnecessary variables, and snaps to the nearest pixel */
    private cleanPosition(position: SmartMoveNode | PositionReal): SmartMoveNode {
        const x = (position.real_x !== undefined ? position.real_x : position.x)
        const y = (position.real_y !== undefined ? position.real_y : position.y)
        const clean = {
            map: position.map,
            x: x,
            y: y,
            key: `${position.map}.${x}.${y}`,
            transportS: (position as SmartMoveNode).transportS,
            transportMap: (position as SmartMoveNode).transportMap,
            transportType: (position as SmartMoveNode).transportType
        }
        return clean
    }

    private positionToString(position: PositionReal): string {
        return `${position.map}.${position.x}.${position.y}`
    }

    private stringToPosition(positionString: string): PositionReal {
        const s = positionString.split(".")
        const map = s[0] as MapName
        const x = Number.parseFloat(s[1])
        const y = Number.parseFloat(s[2])
        return {
            map: map,
            x: x,
            // eslint-disable-next-line @typescript-eslint/camelcase
            real_x: x,
            y: y,
            // eslint-disable-next-line @typescript-eslint/camelcase
            real_y: y
        }
    }

    public findDoorPath(position: SmartMoveNode, destination: SmartMoveNode, visitedNodes: Set<SmartMoveNode> = new Set<SmartMoveNode>(), visitedMaps: Set<string> = new Set<string>()): [number, SmartMoveNode[]] {
        // Add our current position to the visited nodes
        visitedNodes.add(position)

        // Exit case -- when we find the map we're supposed to be on
        if (position.map == destination.map) {
            const d = distance(position, destination)
            const path: SmartMoveNode[] = []
            for (const door of visitedNodes) {
                path.push(door)
            }
            path.push(destination)
            return [d, path]
        }

        // Traverse Doors
        // Physical doors
        const doors = [...G.maps[position.map].doors]
        // Transporter doors
        for (const npc of G.maps[position.map].npcs) {
            if (npc.id !== "transporter") continue // not a teleporter

            for (const map in G.npcs.transporter.places) {
                if (map == position.map) continue

                doors.push([npc.position[0], npc.position[1], -1, -1, map as MapName, G.npcs.transporter.places[map as MapName]])
            }
            break
        }

        let currentBestDistance: number = Number.MAX_VALUE
        let currentBestPath: SmartMoveNode[]
        for (const door of doors) {
            const doorExitMap = door[4]
            if (visitedMaps.has(doorExitMap)) continue // don't revisit maps we've already visited

            // TODO: If we have a key to this door, use it to improve pathfinding
            if(G.maps[doorExitMap].mount || door[8] && door[8] == "complicated") continue

            const doorEntrance: SmartMoveNode = { map: position.map, x: door[0], y: door[1], key: `${position.map}.${door[0]}.${door[1]}`, transportS: door[5], transportMap: doorExitMap, transportType: door[3] == -1 ? "teleport" : "door" }
            const doorExit: SmartMoveNode = { map: doorExitMap, x: G.maps[doorExitMap].spawns[door[5]][0], y: G.maps[doorExitMap].spawns[door[5]][1], key: `${doorExitMap}.${G.maps[doorExitMap].spawns[door[5]][0]}.${G.maps[doorExitMap].spawns[door[5]][1]}` }

            const newVisitedMaps = new Set(visitedMaps)
            newVisitedMaps.add(doorExitMap)

            const newVisitedDoors = new Set(visitedNodes)
            newVisitedDoors.add(doorEntrance)

            const d = distance(position, doorEntrance) + 50 // + 50 as a cost for using the door to help minimize the amount of doors we travel through
            if (currentBestDistance < d) continue // We have a better path
            const [d2, path] = this.findDoorPath(doorExit, destination, newVisitedDoors, newVisitedMaps)
            if (currentBestDistance > d2 + d) {
                currentBestDistance = d2 + d
                currentBestPath = path
            }
        }

        return [currentBestDistance, currentBestPath]
    }

    private heuristic(position: PositionReal, finish: PositionReal): number {
        return distance(position, finish)
    }

    private smoothPath(path: SmartMoveNode[]): SmartMoveNode[] {
        // console.log(`roughPath (${path.length})`)
        // console.log(path)

        let newPath: SmartMoveNode[] = []
        newPath.push(path[0])
        // NOTE: At this point, the path is reversed. We're working backwards, and we will reverse it in to the correct order after this loop
        for (let i = 0; i < path.length - 1; i++) {
            const iPath = path[i]

            if (iPath.transportType == "town") {
                // The warp is the first move we do, so we don't need to do anything before this
                newPath.push(iPath)
                break
            }

            let canWalkTo = i + 1
            for (let j = i + 1; j < path.length; j++) {
                const jPath = path[j]

                if (can_move({
                    map: iPath.map,
                    x: jPath.x,
                    y: jPath.y,
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    going_x: iPath.x,
                    // eslint-disable-next-line @typescript-eslint/camelcase
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
        // console.log(`smooth path (${newPath.length})`)
        // console.log(newPath)

        return newPath
    }

    private reconstructPath(current: SmartMoveNode, finish: SmartMoveNode, cameFrom: FromMap): SmartMoveNode[] {
        const path: SmartMoveNode[] = []
        path.push({
            map: finish.map,
            x: finish.x,
            // eslint-disable-next-line @typescript-eslint/camelcase
            real_x: finish.x,
            y: finish.y,
            // eslint-disable-next-line @typescript-eslint/camelcase
            real_y: finish.y,
            key: `${finish.map}.${finish.x}.${finish.y}`,
            transportMap: finish.transportMap,
            transportType: finish.transportType,
            transportS: finish.transportS
        })
        while (current) {
            path.push({
                map: current.map,
                x: current.x,
                // eslint-disable-next-line @typescript-eslint/camelcase
                real_x: current.x,
                y: current.y,
                // eslint-disable-next-line @typescript-eslint/camelcase
                real_y: current.y,
                key: `${current.map}.${current.x}.${current.y}`,
                transportMap: current.transportMap,
                transportType: current.transportType,
                transportS: current.transportS
            })
            current = cameFrom.get(current.key)
        }
        return this.smoothPath(path)
    }

    public async smartMove(destination: PositionReal, finishDistanceTolerance = 0): Promise<unknown> {
        this.reset()
        this.startDate = new Date()

        let movements: SmartMoveNode[] = []
        const start = Date.now()
        if (this.SHOW_MESSAGES) game_log("a* - start searching", this.MESSAGE_COLOR)
        const doors = this.findDoorPath(this.cleanPosition(parent.character), this.cleanPosition(destination))[1]

        for (let i = 0; i < doors.length; i += 2) {
            const from = doors[i]
            const to = doors[i + 1]
            const doorCacheKey = `${from.key}_${to.key}`

            let subMovements: SmartMoveNode[]
            if (this.doorCache.has(doorCacheKey)) {
                subMovements = this.doorCache.get(doorCacheKey)
            } else {
                if (to.transportType == "door") {
                    subMovements = await this.getMovements(from, to, this.DOOR_TOLERANCE)
                } else if (to.transportType == "teleport") {
                    subMovements = await this.getMovements(from, to, this.TELEPORT_TOLERANCE)
                } else {
                    subMovements = await this.getMovements(from, to, finishDistanceTolerance)
                }

                // Cache the submovements
                this.doorCache.set(doorCacheKey, subMovements)
            }

            movements = movements.concat(subMovements)
        }
        if (this.SHOW_MESSAGES) game_log(`a* - finish searching (${((Date.now() - start) / 1000).toFixed(1)} s)`, this.MESSAGE_COLOR)

        let i = 0
        const movementComplete = new Promise((resolve, reject) => {
            const movementLoop = (start: Date): void => {
                if (this.wasCancelled(start)) {
                    stop()
                    return reject("a* - cancelled moving")
                }

                const nextMove = movements[i]

                if (distance(parent.character, movements[movements.length - 1]) < this.MOVE_TOLERANCE) {
                    // We're done!
                    if (this.SHOW_MESSAGES) game_log("a* - done moving", this.MESSAGE_COLOR)
                    this.finishedDate = new Date()
                    resolve()
                    return
                }

                if (parent.character.moving || is_transporting(parent.character) || !can_walk(parent.character)) {
                    // We are moving, we need to be patient.
                    // TODO: Cooldown based on how much time it will take to walk there
                } else if (nextMove.map == parent.character.map && this.USE_BLINK && can_use("blink") && distance(parent.character, nextMove) > this.TOWN_MOVEMENT_COST && parent.character.mp > G.skills.blink.mp) {
                    // Find the last movement on this map and blink to it
                    let j = i
                    for (; j < movements.length; j++) {
                        if (movements[j].map !== parent.character.map) {
                            break
                        }
                    }
                    i = j - 1
                    setTimeout(() => { movementLoop(start) }, 900)
                    use_skill("blink", [movements[i].x, movements[i].y])
                    return
                } else if (nextMove.map == parent.character.map && nextMove.transportType == "town") {
                    if (distance(parent.character, nextMove) < this.TOWN_TOLERANCE) {
                        i += 1 // we're here -- next
                        movementLoop(start)
                        return
                    } else {
                        setTimeout(() => { movementLoop(start) }, 900)
                        use_skill("town")
                        return
                    }
                } else if (parent.character.map == nextMove.map && can_move_to(nextMove.x, nextMove.y)) {
                    if (distance(parent.character, nextMove) < this.MOVE_TOLERANCE) {
                        if (nextMove.transportType == "door" || nextMove.transportType == "teleport") {
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
                        const randomX = Math.random() * (1 - -1) + -1
                        const randomY = Math.random() * (1 - -1) + -1
                        move(parent.character.real_x + randomX, parent.character.real_y + randomY)
                    }
                    this.reset()
                    return reject("failed moving")
                }
                setTimeout(() => { movementLoop(start) }, 40)
            }

            if (this.SHOW_MESSAGES) game_log("a* - start moving", this.MESSAGE_COLOR)
            movementLoop(this.startDate)
        })

        return await movementComplete
    }

    private async getMovements(start: SmartMoveNode, finish: SmartMoveNode, finishDistanceTolerance = 0, startTime: Date = this.startDate): Promise<SmartMoveNode[]> {
        const cleanStart = this.cleanPosition(start)
        const cleanFinish = this.cleanPosition(finish)

        const cameFrom: FromMap = new Map<string, SmartMoveNode>()

        /** Cost to get to the current node */
        const gScore: ScoreMap = new Map<string, number>()
        gScore.set(cleanStart.key, 0)

        const fScore: ScoreMap = new Map<string, number>()
        fScore.set(cleanStart.key, this.heuristic(cleanStart, cleanFinish))

        /** Unvisited nodes */
        const openSet = new FastPriorityQueue<SmartMoveNode>((a: SmartMoveNode, b: SmartMoveNode) => {
            return fScore.get(a.key) < fScore.get(b.key)
        })
        openSet.add({ ...cleanStart })
        const openSetNodes: VisitedMap = new Set<string>()

        // Town Teleport
        const neighbor: SmartMoveNode = this.cleanPosition({
            map: cleanStart.map,
            x: G.maps[cleanStart.map].spawns[0][0],
            y: G.maps[cleanStart.map].spawns[0][1],
            transportType: "town"
        })
        const tentativeGScore = gScore.get(cleanStart.key) + this.TOWN_MOVEMENT_COST
        if (neighbor.key !== cleanStart.key) {
            if (!gScore.get(neighbor.key) /* No score yet */
                || tentativeGScore < gScore.get(neighbor.key) /* This path is more efficient */) {
                cameFrom.set(neighbor.key, cleanStart)
                gScore.set(neighbor.key, tentativeGScore)
                fScore.set(neighbor.key, tentativeGScore + this.heuristic(neighbor, cleanFinish))
                if (!openSetNodes.has(neighbor.key)) {
                    openSetNodes.add(neighbor.key)
                    openSet.add(neighbor)
                }
            }
        }

        let timer = Date.now()
        while (openSet.size) {
            const current = openSet.poll()
            openSetNodes.delete(current.key)

            // Check if we can finish pathfinding from the current point
            const distanceToFinish = distance(current, cleanFinish)
            if (distanceToFinish < finishDistanceTolerance) {
                // We're already within tolerance
                const path = this.reconstructPath(current, {
                    ...current,
                    transportType: cleanFinish.transportType,
                    transportMap: cleanFinish.transportMap,
                    transportS: cleanFinish.transportS
                }, cameFrom)
                return Promise.resolve(path)
            } else if (distanceToFinish < finishDistanceTolerance + this.FINISH_CHECK_DISTANCE) {
                if (finishDistanceTolerance == 0) {
                    // We want to move to the exact position
                    if (can_move({
                        map: current.map,
                        x: current.x,
                        y: current.y,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        going_x: cleanFinish.x,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        going_y: cleanFinish.y,
                        base: parent.character.base
                    })) {
                        // We can walk in a straight line to the finish
                        const path = this.reconstructPath(current, cleanFinish, cameFrom)
                        return Promise.resolve(path)
                    }
                } else {
                    // We want to move within a certain distance of the position
                    const angle = Math.atan2(current.y - cleanFinish.y, current.x - cleanFinish.x)
                    const x = cleanFinish.x + Math.cos(angle) * finishDistanceTolerance
                    const y = cleanFinish.y + Math.sin(angle) * finishDistanceTolerance
                    const closeFinish: SmartMoveNode = {
                        map: cleanFinish.map,
                        x: x,
                        y: y,
                        key: this.positionToString({ x: x, y: y, map: cleanFinish.map }),
                        transportMap: cleanFinish.transportMap,
                        transportType: cleanFinish.transportType,
                        transportS: cleanFinish.transportS
                    }
                    if (can_move({
                        map: current.map,
                        x: current.x,
                        y: current.y,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        going_x: closeFinish.x,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        going_y: closeFinish.y,
                        base: parent.character.base
                    })) {
                        // We can walk to the finish, we're done!
                        const path = this.reconstructPath(current, closeFinish, cameFrom)
                        return Promise.resolve(path)
                    }
                }
            }

            // Explore Neighbors
            // Movement Neighbors
            for (const subMovements of this.MOVEMENTS) {
                for (const subMovement of subMovements) {
                    const neighbor: SmartMoveNode = this.cleanPosition({
                        map: current.map,
                        x: Math.trunc(current.x + subMovement[0]),
                        y: Math.trunc(current.y + subMovement[1])
                    })

                    if (can_move({
                        map: current.map,
                        x: current.x,
                        y: current.y,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        going_x: neighbor.x,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        going_y: neighbor.y,
                        base: parent.character.base
                    })) {
                        const tentativeGScore = gScore.get(current.key) + Math.abs(subMovement[0]) + Math.abs(subMovement[1])
                        if (!gScore.has(neighbor.key) /* No score yet */
                            || tentativeGScore < gScore.get(neighbor.key) /* This path is more efficient */) {
                            cameFrom.set(neighbor.key, current)
                            gScore.set(neighbor.key, tentativeGScore)
                            fScore.set(neighbor.key, tentativeGScore + this.heuristic(neighbor, cleanFinish))
                            if (!openSetNodes.has(neighbor.key)) {
                                openSetNodes.add(neighbor.key)
                                openSet.add(neighbor)
                            }
                        }
                    }
                }
            }


            // Don't lock up the game
            if (Date.now() - timer > this.SLEEP_AFTER_MS) {
                await sleep(this.SLEEP_FOR_MS)
                timer = Date.now()
                if (this.wasCancelled(startTime)) return Promise.reject("cancelled")
            }
        }

        if (this.SHOW_MESSAGES) game_log("a* - failed searching", this.MESSAGE_COLOR)

        try {
            // Return the closest point we found to the destination.
            let finalPointString: string
            let minScore = Number.MAX_VALUE
            for (const [pointString, f] of fScore) {
                const g = gScore.get(pointString)
                if (f - g < minScore) {
                    minScore = f - g
                    finalPointString = pointString
                }
            }
            const finalPoint: SmartMoveNode = this.stringToPosition(finalPointString) as SmartMoveNode
            const path = this.reconstructPath(finalPoint, cleanFinish, cameFrom)
            return Promise.resolve(path)
        } catch (error) {
            // Failed hardcore.
            return Promise.reject("Failed to find a path...")
        }
    }
}