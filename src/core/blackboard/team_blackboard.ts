import type { CharacterType, ItemName, MapName, MonsterName, ServerIdentifier, ServerRegion } from "alclient"
import { EventBus, globalEventBus } from "../events/event_bus.js"

export interface BotStatus {
    name: string
    type: CharacterType
    map: MapName
    x: number
    y: number
    hp: number
    maxHp: number
    mp: number
    maxMp: number
    freeInventorySlots: number
    gold: number
    isReady: boolean
    isDead: boolean
    lastUpdated: number
}

export interface ActiveBossInfo {
    monster: MonsterName
    server: { region: ServerRegion; name: ServerIdentifier }
    map: MapName
    x?: number
    y?: number
    hp?: number
    maxHp?: number
    discoveredAt: number
}

export interface SupplyNeed {
    botName: string
    item: ItemName
    quantity: number
    requestedAt: number
}

export class TeamBlackboard {
    private targetServer: { region: ServerRegion; name: ServerIdentifier }
    private farmTarget: MonsterName | null = null
    private partyLeaderName: string | null = null
    private members = new Map<string, BotStatus>()
    private activeBosses = new Map<MonsterName, ActiveBossInfo>()
    private supplyNeeds = new Map<string, SupplyNeed>() // key: `${botName}:${item}`

    public constructor(
        defaultRegion: ServerRegion = "US",
        defaultIdentifier: ServerIdentifier = "I",
        eventBus: EventBus = globalEventBus,
    ) {
        this.targetServer = { region: defaultRegion, name: defaultIdentifier }
        this.wireEventBus(eventBus)
    }

    private wireEventBus(bus: EventBus): void {
        bus.subscribe("boss:spawned", (e) => {
            this.activeBosses.set(e.monster, {
                monster: e.monster,
                server: e.server,
                map: e.map,
                x: e.x,
                y: e.y,
                hp: e.hp,
                maxHp: e.maxHp,
                discoveredAt: Date.now(),
            })
        })

        bus.subscribe("boss:defeated", (e) => {
            this.activeBosses.delete(e.monster)
        })

        bus.subscribe("supply:needed", (e) => {
            const key = `${e.botName}:${e.item}`
            this.supplyNeeds.set(key, {
                botName: e.botName,
                item: e.item,
                quantity: e.quantityNeeded,
                requestedAt: Date.now(),
            })
        })

        bus.subscribe("server:hop_requested", (e) => {
            this.targetServer = { region: e.targetRegion, name: e.targetIdentifier }
        })
    }

    // --- Server & Target State ---
    public getTargetServer(): { region: ServerRegion; name: ServerIdentifier } {
        return { ...this.targetServer }
    }

    public setTargetServer(region: ServerRegion, name: ServerIdentifier): void {
        this.targetServer = { region, name }
    }

    public getFarmTarget(): MonsterName | null {
        return this.farmTarget
    }

    public setFarmTarget(monster: MonsterName | null): void {
        this.farmTarget = monster
    }

    public getPartyLeader(): string | null {
        return this.partyLeaderName
    }

    public setPartyLeader(leaderName: string | null): void {
        this.partyLeaderName = leaderName
    }

    // --- Team Roster & Telemetry ---
    public updateMemberStatus(status: BotStatus): void {
        this.members.set(status.name, { ...status, lastUpdated: Date.now() })
    }

    public getMemberStatus(name: string): BotStatus | undefined {
        return this.members.get(name)
    }

    public getAllMembers(): BotStatus[] {
        return Array.from(this.members.values())
    }

    public removeMember(name: string): void {
        this.members.delete(name)
    }

    // --- Boss Information ---
    public getActiveBosses(): ActiveBossInfo[] {
        return Array.from(this.activeBosses.values())
    }

    public getBoss(monster: MonsterName): ActiveBossInfo | undefined {
        return this.activeBosses.get(monster)
    }

    public clearBoss(monster: MonsterName): void {
        this.activeBosses.delete(monster)
    }

    // --- Supply Requests ---
    public getSupplyNeeds(): SupplyNeed[] {
        return Array.from(this.supplyNeeds.values())
    }

    public fulfillSupplyNeed(botName: string, item: ItemName): void {
        this.supplyNeeds.delete(`${botName}:${item}`)
    }

    public clear(): void {
        this.members.clear()
        this.activeBosses.clear()
        this.supplyNeeds.clear()
        this.farmTarget = null
        this.partyLeaderName = null
    }
}

export const globalTeamBlackboard = new TeamBlackboard()
