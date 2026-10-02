import { existsSync } from "node:fs"
import { resolve } from "node:path"
import AL, {
    type CharacterType,
    type PingCompensatedCharacter,
    type ServerIdentifier,
    type ServerRegion,
} from "alclient"

import { activeTeamConfig, type CharacterConfig, type TeamConfig } from "../config/party.js"
import { EventBus, globalEventBus } from "../core/events/event_bus.js"
import { TeamBlackboard, globalTeamBlackboard } from "../core/blackboard/team_blackboard.js"
import { BotController } from "../core/character/bot_controller.js"
import type { Action } from "../core/actions/action.js"
import { PartyCoordinator, FollowLeaderAction } from "../domain/team/party_coordinator.js"

// Combat Actions
import {
    UsePotionAction,
    LootChestsAction,
    BasicAttackAction,
    HealAction,
    PartyHealAction,
    TauntAction,
    CleaveAction,
    BurstAction,
    CBurstAction,
    HuntersMarkAction,
    SuperShotAction,
    KiteAction,
} from "../domain/combat/actions/index.js"

export interface TeamRunnerOptions {
    config?: TeamConfig
    credentialsPath?: string
    eventBus?: EventBus
    blackboard?: TeamBlackboard
    skipPathfinderCheck?: boolean
}

/**
 * Builds the prioritized list of Actions for a specific character class.
 */
export function buildActionsForRole(
    ctype: CharacterType,
    gData: any,
    coordinator: PartyCoordinator,
): Action<PingCompensatedCharacter>[] {
    const actions: Action<PingCompensatedCharacter>[] = []

    // 1. Shared Potions (Emergency HP/MP priority)
    actions.push(new UsePotionAction())

    // 2. Class-specific Combat Actions
    switch (ctype) {
        case "warrior":
            // Tank: Taunt to peel squishies, Cleave on mob groups
            actions.push(new TauntAction())
            actions.push(new CleaveAction())
            break

        case "priest":
            // Healer: Party heal on multi-damage, targeted emergency heal
            actions.push(new PartyHealAction())
            actions.push(new HealAction())
            break

        case "mage":
            // Magic DPS: Single target burst and controlled multi-target burst
            actions.push(new BurstAction({ gData }))
            actions.push(new CBurstAction({ gData }))
            break

        case "ranger":
            // Physical DPS: Debuff tough elites and snipe with super shot
            actions.push(new HuntersMarkAction({ gData }))
            actions.push(new SuperShotAction({ gData }))
            break

        case "merchant":
            // Courier: merchant services can be added here
            break

        default:
            break
    }

    // 3. Tactical Kiting & Self-Preservation (Ranged classes maintain safe distance)
    if (ctype === "priest" || ctype === "mage" || ctype === "ranger") {
        actions.push(new KiteAction({ gData }))
    }

    // 4. Movement / Formation: Followers keep formation behind the tank
    actions.push(new FollowLeaderAction(coordinator, { throttleMs: 1000, debug: true }))

    // 4. Default Attack
    actions.push(new BasicAttackAction({ gData }))

    // 5. Scavenge nearby chests when safe
    actions.push(new LootChestsAction())

    return actions
}

/**
 * MultiBotTeamManager orchestrates the full lifecycle of a multi-character party:
 * credentials, pathfinder, blackboard, socket attachments, and action loops.
 */
export class MultiBotTeamManager {
    public readonly config: TeamConfig
    public readonly eventBus: EventBus
    public readonly blackboard: TeamBlackboard
    public readonly coordinator: PartyCoordinator
    public readonly controllers = new Map<string, BotController>()

    private credentialsPath: string
    private partySyncTimer: NodeJS.Timeout | null = null
    private isRunning = false
    private gData: any = null
    private pathfinderReady = false

    public constructor(options: TeamRunnerOptions = {}) {
        this.config = options.config ?? activeTeamConfig
        this.credentialsPath =
            options.credentialsPath ?? resolve(process.cwd(), "credentials.json")
        this.eventBus = options.eventBus ?? globalEventBus
        this.blackboard =
            options.blackboard ??
            new TeamBlackboard(
                this.config.server.region,
                this.config.server.identifier,
                this.eventBus,
            )

        if (options.skipPathfinderCheck) {
            this.pathfinderReady = true
        }

        const allMemberNames = [
            ...this.config.characters.map((c) => c.name),
            ...(this.config.merchant ? [this.config.merchant.name] : []),
        ]

        this.coordinator = new PartyCoordinator({
            leaderName: this.config.partyLeader,
            teamMembers: allMemberNames,
            eventBus: this.eventBus,
            blackboard: this.blackboard,
        })
    }

    /**
     * Initializes ALClient credentials, GData, and Pathfinder maps.
     */
    public async initialize(): Promise<void> {
        if (!existsSync(this.credentialsPath)) {
            throw new Error(
                `Credentials file not found at: ${this.credentialsPath}. Please create credentials.json or specify path.`,
            )
        }

        console.info(`[TeamManager] Logging into Adventureland using credentials from: ${this.credentialsPath}`)
        await Promise.all([
            AL.Game.loginJSONFile(this.credentialsPath, true),
            AL.Game.getGData(true),
        ])

        this.gData = AL.Game.G
        console.info(`[TeamManager] GData loaded successfully. Preparing pathfinder...`)
        await AL.Pathfinder.prepare(this.gData, { cheat: true })

        // Verify Pathfinder has fully completed and loaded map geometry
        const isPrepared = (AL.Pathfinder as any).prepared === true
        const preparedMaps: Set<string> | undefined = (AL.Pathfinder as any).preparedMaps
        const mapCount = preparedMaps?.size ?? 0
        const hasMainGrid = AL.Pathfinder.getGrid("main")

        if (!isPrepared || mapCount === 0 || !hasMainGrid) {
            throw new Error(
                `[TeamManager] Pathfinder preparation failed: map geometry not loaded (prepared=${isPrepared}, maps=${mapCount}, mainGrid=${hasMainGrid})`,
            )
        }

        this.pathfinderReady = true
        console.info(
            `[TeamManager] Pathfinder ready. Successfully loaded map geometry for ${mapCount} maps.`,
        )
    }

    public isPathfinderReady(): boolean {
        return this.pathfinderReady
    }

    /**
     * Spawns and manages a single bot instance.
     */
    public async spawnBot(
        charConfig: CharacterConfig,
        region: ServerRegion,
        identifier: ServerIdentifier,
    ): Promise<BotController> {
        if (!this.pathfinderReady || !this.gData) {
            throw new Error(
                `[TeamManager] Cannot spawn bot '${charConfig.name}': AL.Pathfinder.prepare() must fully complete and load map geometry before bots are spawned. Call initialize() first.`,
            )
        }
        console.info(
            `[TeamManager] Starting ${charConfig.type} "${charConfig.name}" on ${region} ${identifier}...`,
        )

        const bot = await AL.Game.startCharacter(charConfig.name, region, identifier)

        const controller = new BotController(bot, {
            eventBus: this.eventBus,
            blackboard: this.blackboard,
            telemetryIntervalMs: 1000,
            actionIntervalMs: 250,
            reconnect: {
                enabled: true,
                maxAttempts: 10,
                initialDelayMs: 2000,
                maxDelayMs: 30000,
                reconnectFn: async () => {
                    console.warn(`[TeamManager] Reconnecting ${charConfig.name}...`)
                    return await AL.Game.startCharacter(charConfig.name, region, identifier)
                },
            },
        })

        // Wire socket listeners for automated party invites and join requests
        this.coordinator.attachBot(bot)

        // Build class-specific action rotation
        const actions = buildActionsForRole(charConfig.type, this.gData, this.coordinator)
        controller.runner.registerAll(actions)

        this.controllers.set(charConfig.name, controller)
        return controller
    }

    /**
     * Starts the entire team in coordinated sequence:
     * 1. Party Leader (Warrior tank) starts first to establish party anchor.
     * 2. Followers (Priest, Mage, Ranger) join and attach to the leader.
     * 3. Merchant (Courier) starts and coordinates supply lines.
     */
    public async startTeam(): Promise<void> {
        if (this.isRunning) return

        if (!this.pathfinderReady || !this.gData) {
            throw new Error(
                "[TeamManager] Cannot start team: AL.Pathfinder.prepare() must fully complete and load map geometry before any bot attempts to move. Call initialize() first.",
            )
        }

        this.isRunning = true

        const region = this.config.server.region
        const identifier = this.config.server.identifier

        console.info(`=== Starting Adventureland Team on ${region} ${identifier} ===`)

        // 1. Start Party Leader first
        const leaderConfig = this.config.characters.find(
            (c) => c.name === this.config.partyLeader,
        )
        if (leaderConfig) {
            const leaderCtrl = await this.spawnBot(leaderConfig, region, identifier)
            leaderCtrl.start()
            // Short delay to let leader register on game server
            await new Promise((r) => setTimeout(r, 1000))
        }

        // 2. Start other party members
        for (const charConfig of this.config.characters) {
            if (charConfig.name === this.config.partyLeader) continue
            const ctrl = await this.spawnBot(charConfig, region, identifier)
            ctrl.start()
            await new Promise((r) => setTimeout(r, 500))
        }

        // 3. Start merchant if configured
        if (this.config.merchant) {
            const merchCtrl = await this.spawnBot(this.config.merchant, region, identifier)
            merchCtrl.start()
        }

        // 4. Setup periodic party sync loop
        this.partySyncTimer = setInterval(async () => {
            if (!this.isRunning) return
            const liveBots = Array.from(this.controllers.values())
                .map((c) => c.bot)
                .filter((b) => b.ready && b.socket.connected)

            await this.coordinator.syncPartyMembership(liveBots).catch(() => {})
        }, 5000)

        console.info(`=== All ${this.controllers.size} team bots active and running! ===`)
    }

    /**
     * Gracefully stops all bots, clears timers, and disconnects sockets.
     */
    public async stopTeam(): Promise<void> {
        console.info(`[TeamManager] Stopping all team bots...`)
        this.isRunning = false

        if (this.partySyncTimer) {
            clearInterval(this.partySyncTimer)
            this.partySyncTimer = null
        }

        for (const [name, controller] of this.controllers) {
            console.info(`[TeamManager] Stopping ${name}...`)
            await controller.stop(true).catch(() => {})
        }
        this.controllers.clear()
        this.blackboard.clear()
        console.info(`[TeamManager] Team shutdown complete.`)
    }

    public isTeamActive(): boolean {
        return this.isRunning
    }
}

// Global process signal handlers for clean terminal shutdown
export function attachProcessSignals(manager: MultiBotTeamManager): void {
    const handleShutdown = async (signal: string): Promise<void> => {
        console.info(`\nReceived ${signal}. Performing clean team shutdown...`)
        await manager.stopTeam().catch(console.error)
        process.exit(0)
    }

    process.on("SIGINT", () => void handleShutdown("SIGINT"))
    process.on("SIGTERM", () => void handleShutdown("SIGTERM"))
}

// Standalone execution entrypoint
if (import.meta.main) {
    const manager = new MultiBotTeamManager()
    attachProcessSignals(manager)

    try {
        await manager.initialize()
        await manager.startTeam()
    } catch (err) {
        console.error("[TeamManager] Fatal error during team startup:", err)
        await manager.stopTeam().catch(() => {})
        process.exit(1)
    }
}
