import type { CharacterType, MapName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { EventBus, globalEventBus } from "../../core/events/event_bus.js"
import { TeamBlackboard, globalTeamBlackboard, type BotStatus } from "../../core/blackboard/team_blackboard.js"
import type { Action, ActionContext } from "../../core/actions/action.js"

export type FormationStyle = "wedge" | "circle" | "role_based"

export interface FollowFormationOptions {
    style?: FormationStyle
    baseDistance?: number // Distance from leader (default: 45)
    leashDistance?: number // Distance threshold before moving (default: 30)
    maxDistance?: number // Urgent follow threshold (default: 250)
    angleSpreadRad?: number // Spread angle for fan-out (default: 0.7 rad ~ 40 deg)
}

export interface FollowPosition {
    x: number
    y: number
    map: MapName
}

export interface MapTransitionPlan {
    followerName: string
    sourceMap: MapName
    targetMap: MapName
    targetX: number
    targetY: number
    action: "transition" | "move" | "in_sync"
    distance: number
}

export type PartyAction =
    | { type: "accept_request"; botName: string; requesterName: string }
    | { type: "accept_invite"; botName: string; inviterName: string }
    | { type: "send_invite"; leaderName: string; targetName: string }
    | { type: "send_request"; botName: string; leaderName: string }
    | { type: "none" }

export interface ServerHopPlan {
    shouldHop: boolean
    currentServer: { region: ServerRegion; name: ServerIdentifier }
    targetServer: { region: ServerRegion; name: ServerIdentifier }
    readyMembers: string[]
    pendingMembers: string[]
}

/**
 * Pure function: calculates follow target coordinate for a follower based on leader position and formation.
 */
export function calculateFollowPosition(
    leaderPos: { x: number; y: number; map: MapName },
    followerIndex: number,
    totalFollowers: number,
    followerType?: CharacterType,
    options: FollowFormationOptions = {},
): FollowPosition {
    const style = options.style ?? "role_based"
    const baseDist = options.baseDistance ?? 45
    const angleSpread = options.angleSpreadRad ?? 0.7

    if (style === "role_based" && followerType) {
        let dx = 0
        let dy = 0
        switch (followerType) {
            case "priest":
                // Safe rear-left flank, close enough for heals, far from frontal cleave
                dx = -35
                dy = 30
                break
            case "mage":
                // Center rear, long-range casting
                dx = 0
                dy = 45
                break
            case "ranger":
                // Safe rear-right flank
                dx = 35
                dy = 30
                break
            case "merchant":
                // Trailing deep rear
                dx = 0
                dy = 75
                break
            case "warrior":
            case "paladin":
                // Frontline alongside leader if another tank exists
                dx = followerIndex % 2 === 0 ? 25 : -25
                dy = 10
                break
            case "rogue":
                // Flanking side
                dx = 30
                dy = -15
                break
            default:
                dx = 0
                dy = baseDist
        }
        return {
            x: Math.round(leaderPos.x + dx),
            y: Math.round(leaderPos.y + dy),
            map: leaderPos.map,
        }
    }

    if (style === "circle") {
        const count = Math.max(1, totalFollowers)
        const angle = (2 * Math.PI * followerIndex) / count
        return {
            x: Math.round(leaderPos.x + baseDist * Math.cos(angle)),
            y: Math.round(leaderPos.y + baseDist * Math.sin(angle)),
            map: leaderPos.map,
        }
    }

    // Wedge / Fan-out rear formation (style === "wedge" or fallback)
    const count = Math.max(1, totalFollowers)
    const centerOffset = (count - 1) / 2
    // Angle centered at PI (behind facing)
    const angle = Math.PI + (followerIndex - centerOffset) * angleSpread
    return {
        x: Math.round(leaderPos.x + baseDist * Math.cos(angle)),
        y: Math.round(leaderPos.y + baseDist * Math.sin(angle)),
        map: leaderPos.map,
    }
}

/**
 * Pure function: checks if two positions are stacked on top of each other.
 */
export function isStacked(
    a: { x: number; y: number },
    b: { x: number; y: number },
    threshold = 8,
): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) <= threshold
}

/**
 * Pure function: calculates an anti-stacking displacement offset for a stacked bot.
 */
export function calculateUnstackOffset(
    botIndex: number,
    jitterDistance = 25,
): { x: number; y: number } {
    const angle = (2 * Math.PI * (botIndex % 8)) / 8
    return {
        x: Math.round(jitterDistance * Math.cos(angle)),
        y: Math.round(jitterDistance * Math.sin(angle)),
    }
}

/**
 * Pure function: evaluates whether follower should move based on leash and max distance thresholds.
 */
export function shouldFollow(
    followerPos: { x: number; y: number; map: MapName },
    targetPos: FollowPosition,
    leashDistance = 30,
): boolean {
    if (followerPos.map !== targetPos.map) return true
    const distance = Math.hypot(followerPos.x - targetPos.x, followerPos.y - targetPos.y)
    return distance > leashDistance
}

/**
 * Pure function: evaluates map transitions and positioning plans across all followers.
 */
export function evaluateMapTransitions(
    leader: BotStatus,
    followers: BotStatus[],
    options: FollowFormationOptions = {},
): MapTransitionPlan[] {
    const plans: MapTransitionPlan[] = []
    const leash = options.leashDistance ?? 30

    followers.forEach((follower, index) => {
        if (follower.map !== leader.map) {
            // Follower is on a different map: must transition immediately
            plans.push({
                followerName: follower.name,
                sourceMap: follower.map,
                targetMap: leader.map,
                targetX: leader.x,
                targetY: leader.y,
                action: "transition",
                distance: Infinity,
            })
            return
        }

        const targetPos = calculateFollowPosition(
            { x: leader.x, y: leader.y, map: leader.map },
            index,
            followers.length,
            follower.type,
            options,
        )

        const dist = Math.hypot(follower.x - targetPos.x, follower.y - targetPos.y)

        if (dist > leash) {
            plans.push({
                followerName: follower.name,
                sourceMap: follower.map,
                targetMap: leader.map,
                targetX: targetPos.x,
                targetY: targetPos.y,
                action: "move",
                distance: dist,
            })
        } else {
            plans.push({
                followerName: follower.name,
                sourceMap: follower.map,
                targetMap: leader.map,
                targetX: targetPos.x,
                targetY: targetPos.y,
                action: "in_sync",
                distance: dist,
            })
        }
    })

    return plans
}

/**
 * Pure function: evaluates server realm hopping readiness across the team.
 */
export function evaluateServerHop(
    currentServer: { region: ServerRegion; name: ServerIdentifier },
    targetServer: { region: ServerRegion; name: ServerIdentifier },
    members: BotStatus[],
): ServerHopPlan {
    const shouldHop =
        currentServer.region !== targetServer.region ||
        currentServer.name !== targetServer.name

    const readyMembers: string[] = []
    const pendingMembers: string[] = []

    for (const member of members) {
        if (member.isReady && !member.isDead) {
            readyMembers.push(member.name)
        } else {
            pendingMembers.push(member.name)
        }
    }

    return {
        shouldHop,
        currentServer,
        targetServer,
        readyMembers,
        pendingMembers,
    }
}

/**
 * Pure function: checks if a party invite should be accepted.
 */
export function shouldAcceptPartyInvite(
    inviter: string,
    designatedLeader: string | null,
): boolean {
    return designatedLeader !== null && inviter === designatedLeader
}

/**
 * Pure function: checks if a party join request should be accepted.
 */
export function shouldAcceptPartyRequest(
    requester: string,
    teamMembers: string[],
): boolean {
    return teamMembers.includes(requester)
}

/**
 * Pure function: evaluates party actions required to align current party state with desired team roster.
 */
export function evaluatePartyActions(
    leaderName: string,
    teamMembers: string[],
    partyStates: Map<string, { partyLeader?: string; partyList?: string[] }>,
): PartyAction[] {
    const actions: PartyAction[] = []
    const leaderState = partyStates.get(leaderName)
    const currentPartyList = leaderState?.partyList ?? [leaderName]

    for (const member of teamMembers) {
        if (member === leaderName) continue

        const memberState = partyStates.get(member)
        const inParty =
            currentPartyList.includes(member) ||
            memberState?.partyLeader === leaderName ||
            memberState?.partyList?.includes(leaderName)

        if (!inParty) {
            // Invite follower from leader
            actions.push({
                type: "send_invite",
                leaderName,
                targetName: member,
            })
            // Follower requests join from leader
            actions.push({
                type: "send_request",
                botName: member,
                leaderName,
            })
        }
    }

    return actions
}

export interface PartyCoordinatorOptions {
    leaderName: string
    teamMembers: string[]
    eventBus?: EventBus
    blackboard?: TeamBlackboard
    formationOptions?: FollowFormationOptions
}

/**
 * PartyCoordinator manages party formation, invitations, leader-following, and map synchronization.
 */
export class PartyCoordinator {
    private designatedLeader: string
    private teamMembers: string[]
    private eventBus: EventBus
    private blackboard: TeamBlackboard
    private formationOptions: FollowFormationOptions

    public constructor(options: PartyCoordinatorOptions) {
        this.designatedLeader = options.leaderName
        this.teamMembers = [...options.teamMembers]
        this.eventBus = options.eventBus ?? globalEventBus
        this.blackboard = options.blackboard ?? globalTeamBlackboard
        this.formationOptions = {
            style: "role_based",
            baseDistance: 45,
            leashDistance: 30,
            maxDistance: 250,
            angleSpreadRad: 0.7,
            ...options.formationOptions,
        }

        this.blackboard.setPartyLeader(this.designatedLeader)
    }

    public getLeader(): string {
        return this.designatedLeader
    }

    public setLeader(name: string): void {
        this.designatedLeader = name
        this.blackboard.setPartyLeader(name)
    }

    public isLeader(name: string): boolean {
        return this.designatedLeader === name
    }

    public getTeamMembers(): string[] {
        return [...this.teamMembers]
    }

    public setTeamMembers(members: string[]): void {
        this.teamMembers = [...members]
    }

    public getFormationOptions(): FollowFormationOptions {
        return { ...this.formationOptions }
    }

    public setFormationOptions(opts: Partial<FollowFormationOptions>): void {
        this.formationOptions = { ...this.formationOptions, ...opts }
    }

    /**
     * Attaches live socket event listeners for automated party invites and join requests.
     * Returns an unsubscribe/cleanup function.
     */
    public attachBot(bot: PingCompensatedCharacter): () => void {
        const onInvite = async (data: { name: string }): Promise<void> => {
            if (shouldAcceptPartyInvite(data.name, this.designatedLeader)) {
                await bot.acceptPartyInvite(data.name).catch(() => {})
                this.eventBus.publish({
                    type: "party:member_joined",
                    botName: bot.name,
                    leaderName: data.name,
                })
            }
        }

        const onRequest = async (data: { name: string }): Promise<void> => {
            if (this.isLeader(bot.name) && shouldAcceptPartyRequest(data.name, this.teamMembers)) {
                await bot.acceptPartyRequest(data.name).catch(() => {})
                this.eventBus.publish({
                    type: "party:member_joined",
                    botName: data.name,
                    leaderName: bot.name,
                })
            }
        }

        bot.socket.on("invite", onInvite)
        bot.socket.on("request", onRequest)

        return () => {
            bot.socket.off("invite", onInvite)
            bot.socket.off("request", onRequest)
        }
    }

    /**
     * Directly evaluates and handles an incoming party invite.
     */
    public async handlePartyInvite(
        bot: PingCompensatedCharacter,
        inviterName: string,
    ): Promise<boolean> {
        if (shouldAcceptPartyInvite(inviterName, this.designatedLeader)) {
            await bot.acceptPartyInvite(inviterName).catch(() => {})
            this.eventBus.publish({
                type: "party:member_joined",
                botName: bot.name,
                leaderName: inviterName,
            })
            return true
        }
        return false
    }

    /**
     * Directly evaluates and handles an incoming party join request.
     */
    public async handlePartyRequest(
        leaderBot: PingCompensatedCharacter,
        requesterName: string,
    ): Promise<boolean> {
        if (this.isLeader(leaderBot.name) && shouldAcceptPartyRequest(requesterName, this.teamMembers)) {
            await leaderBot.acceptPartyRequest(requesterName).catch(() => {})
            this.eventBus.publish({
                type: "party:member_joined",
                botName: requesterName,
                leaderName: leaderBot.name,
            })
            return true
        }
        return false
    }

    /**
     * Synchronizes party membership across a map or array of bots.
     */
    public async syncPartyMembership(
        bots: Map<string, PingCompensatedCharacter> | PingCompensatedCharacter[],
    ): Promise<PartyAction[]> {
        const botMap =
            bots instanceof Map
                ? bots
                : new Map(bots.map((b) => [b.name, b]))

        const partyStates = new Map<string, { partyLeader?: string; partyList?: string[] }>()
        for (const [name, bot] of botMap) {
            partyStates.set(name, {
                partyLeader: bot.party,
                partyList: bot.partyData?.list,
            })
        }

        const actions = evaluatePartyActions(this.designatedLeader, this.teamMembers, partyStates)

        for (const action of actions) {
            if (action.type === "send_invite") {
                const leader = botMap.get(action.leaderName)
                if (leader) {
                    await leader.sendPartyInvite(action.targetName).catch(() => {})
                }
            } else if (action.type === "send_request") {
                const follower = botMap.get(action.botName)
                if (follower) {
                    await follower.sendPartyRequest(action.leaderName).catch(() => {})
                }
            }
        }

        return actions
    }

    /**
     * Computes the target follow position and urgency for a given follower bot.
     */
    public getFollowTarget(
        followerName: string,
        followerType?: CharacterType,
        currentPos?: { x?: number; y?: number; map?: MapName },
    ): {
        shouldMove: boolean
        target?: FollowPosition
        distance: number
        distanceToLeader: number
        onDifferentMap: boolean
    } {
        if (this.isLeader(followerName)) {
            return { shouldMove: false, distance: 0, distanceToLeader: 0, onDifferentMap: false }
        }

        const leaderStatus = this.blackboard.getMemberStatus(this.designatedLeader)
        const followerStatus = this.blackboard.getMemberStatus(followerName)

        if (!leaderStatus || (!followerStatus && (!currentPos || typeof currentPos.x !== "number"))) {
            return { shouldMove: false, distance: 0, distanceToLeader: 0, onDifferentMap: false }
        }

        const posX = typeof currentPos?.x === "number" ? currentPos.x : (followerStatus?.x ?? 0)
        const posY = typeof currentPos?.y === "number" ? currentPos.y : (followerStatus?.y ?? 0)
        const posMap = currentPos?.map ?? followerStatus?.map ?? leaderStatus.map

        if (posMap !== leaderStatus.map) {
            return {
                shouldMove: true,
                target: { x: leaderStatus.x, y: leaderStatus.y, map: leaderStatus.map },
                distance: Infinity,
                distanceToLeader: Infinity,
                onDifferentMap: true,
            }
        }

        // Determine follower index among non-leader team members
        const followers = this.teamMembers.filter((m) => m !== this.designatedLeader)
        const followerIndex = Math.max(0, followers.indexOf(followerName))

        const target = calculateFollowPosition(
            { x: leaderStatus.x, y: leaderStatus.y, map: leaderStatus.map },
            followerIndex,
            followers.length,
            followerType ?? followerStatus?.type,
            this.formationOptions,
        )

        const dist = Math.hypot(posX - target.x, posY - target.y)
        const distanceToLeader = Math.hypot(posX - leaderStatus.x, posY - leaderStatus.y)
        const leash = this.formationOptions.leashDistance ?? 30
        const shouldMove = dist > leash

        return {
            shouldMove,
            target,
            distance: dist,
            distanceToLeader,
            onDifferentMap: false,
        }
    }

    /**
     * Evaluates map transition plans across all active followers on the blackboard.
     */
    public getMapTransitionPlans(): MapTransitionPlan[] {
        const leaderStatus = this.blackboard.getMemberStatus(this.designatedLeader)
        if (!leaderStatus) return []

        const followers = this.teamMembers
            .filter((m) => m !== this.designatedLeader)
            .map((m) => this.blackboard.getMemberStatus(m))
            .filter((s): s is BotStatus => s !== undefined)

        return evaluateMapTransitions(leaderStatus, followers, this.formationOptions)
    }

    /**
     * Evaluates whether the team needs to hop servers and which members are ready.
     */
    public getServerHopPlan(
        currentServer: { region: ServerRegion; name: ServerIdentifier },
    ): ServerHopPlan {
        const targetServer = this.blackboard.getTargetServer()
        const members = this.blackboard.getAllMembers()
        return evaluateServerHop(currentServer, targetServer, members)
    }
}

export interface FollowLeaderActionOptions {
    /** Cooldown / throttle between issuing movement commands in ms (default: 1000) */
    throttleMs?: number
    /** Whether to enable debug logging of move executions (default: true) */
    debug?: boolean
}

/**
 * FollowLeaderAction plugs directly into ActionRunner to keep squishies in formation.
 */
export class FollowLeaderAction implements Action<PingCompensatedCharacter> {
    public readonly name = "follow_leader"
    private coordinator: PartyCoordinator
    private throttleMs: number
    private debug: boolean
    private lastMoveTimes = new Map<string, number>()

    public constructor(
        coordinator: PartyCoordinator,
        options: FollowLeaderActionOptions = {},
    ) {
        this.coordinator = coordinator
        this.throttleMs = options.throttleMs ?? 1000
        this.debug = options.debug ?? true
    }

    /**
     * Resets the movement cooldown for a bot or all bots.
     */
    public resetCooldown(botName?: string): void {
        if (botName) {
            this.lastMoveTimes.delete(botName)
        } else {
            this.lastMoveTimes.clear()
        }
    }

    public canExecute(bot: PingCompensatedCharacter, _context: ActionContext): boolean {
        if (this.coordinator.isLeader(bot.name)) return false
        if (bot.rip) return false

        // 1. Do not call move or smartMove if already actively moving
        if (Boolean(bot.moving || bot.smartMoving)) {
            return false
        }

        // 2. Cooldown / throttle check to avoid spamming requests every cycle
        const now = Date.now()
        const lastMove = this.lastMoveTimes.get(bot.name) ?? 0
        if (now - lastMove < this.throttleMs) {
            return false
        }

        // 3. Distance deadzones: verify follower is not already within acceptable range
        const plan = this.coordinator.getFollowTarget(
            bot.name,
            bot.ctype,
            typeof bot.x === "number" && typeof bot.y === "number"
                ? { x: bot.x, y: bot.y, map: bot.map }
                : undefined,
        )
        return plan.shouldMove && plan.target !== undefined
    }

    public score(bot: PingCompensatedCharacter, _context: ActionContext): number {
        if (this.coordinator.isLeader(bot.name)) return 0
        if (bot.rip) return 0
        if (Boolean(bot.moving || bot.smartMoving)) return 0

        const now = Date.now()
        const lastMove = this.lastMoveTimes.get(bot.name) ?? 0
        if (now - lastMove < this.throttleMs) return 0

        const plan = this.coordinator.getFollowTarget(
            bot.name,
            bot.ctype,
            typeof bot.x === "number" && typeof bot.y === "number"
                ? { x: bot.x, y: bot.y, map: bot.map }
                : undefined,
        )
        if (!plan.shouldMove || !plan.target) return 0

        // If on different map than leader, regroup with utmost urgency
        if (plan.onDifferentMap) {
            return 88
        }

        const maxDist = this.coordinator.getFormationOptions().maxDistance ?? 250
        if (plan.distance >= maxDist) {
            return 75
        }

        // Steady repositioning
        return 45
    }

    public async execute(bot: PingCompensatedCharacter, _context: ActionContext): Promise<void> {
        // Double-check active movement state before issuing any command
        if (Boolean(bot.moving || bot.smartMoving)) return

        const now = Date.now()
        const lastMove = this.lastMoveTimes.get(bot.name) ?? 0
        if (now - lastMove < this.throttleMs) return

        const plan = this.coordinator.getFollowTarget(
            bot.name,
            bot.ctype,
            typeof bot.x === "number" && typeof bot.y === "number"
                ? { x: bot.x, y: bot.y, map: bot.map }
                : undefined,
        )
        if (!plan.shouldMove || !plan.target) return

        this.lastMoveTimes.set(bot.name, now)

        const leash = this.coordinator.getFormationOptions().leashDistance ?? 30
        const isSmartMove = plan.onDifferentMap || plan.distance > 300

        const reason = plan.onDifferentMap
            ? `cross-map regroup from '${bot.map}' to leader on '${plan.target.map}'`
            : plan.distance > 300
            ? `long-distance pathfinding (dist: ${Math.round(plan.distance)}px > 300px threshold, distToLeader: ${Math.round(plan.distanceToLeader)}px)`
            : `formation repositioning (dist: ${Math.round(plan.distance)}px > leash: ${leash}px deadzone, distToLeader: ${Math.round(plan.distanceToLeader)}px)`

        if (this.debug) {
            console.info(
                `[FollowLeaderAction] Move issued for '${bot.name}' (${bot.ctype}): ` +
                `action=${isSmartMove ? "smartMove" : "move"} ` +
                `current={x: ${Math.round(bot.x ?? 0)}, y: ${Math.round(bot.y ?? 0)}, map: '${bot.map}'} ` +
                `target={x: ${plan.target.x}, y: ${plan.target.y}, map: '${plan.target.map}'} ` +
                `distToTarget=${Math.round(plan.distance)}px distToLeader=${Math.round(plan.distanceToLeader)}px ` +
                `reason='${reason}'`,
            )
        }

        try {
            if (isSmartMove) {
                await bot.smartMove(plan.target, { getWithin: leash })
            } else {
                await bot.move(plan.target.x, plan.target.y)
            }
        } catch (err: any) {
            console.warn(
                `[FollowLeaderAction] Move command failed for '${bot.name}' towards (${plan.target.x}, ${plan.target.y}, ${plan.target.map}):`,
                err?.message ?? err,
            )
        }
    }
}
