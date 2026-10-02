import { EventEmitter } from "node:events"
import type { CharacterType, MapName, PingCompensatedCharacter, SkillName } from "alclient"

export interface MockCharacterOptions {
    name?: string
    ctype?: CharacterType
    map?: MapName
    x?: number
    y?: number
    hp?: number
    max_hp?: number
    mp?: number
    max_mp?: number
    esize?: number
    gold?: number
    range?: number
}

export class MockCharacter {
    public name: string
    public ctype: CharacterType
    public map: MapName
    public x: number
    public y: number
    public hp: number
    public max_hp: number
    public mp: number
    public max_mp: number
    public esize: number
    public gold: number
    public ready: boolean
    public rip: boolean
    public socket: EventEmitter & { connected: boolean }
    public cooldowns = new Map<string, number>()

    public stand: boolean | string = false
    public moving: boolean = false
    public smartMoving: boolean = false
    public slots: Record<string, any> = {}
    public pontyItems: any[] = []

    public range: number
    public items: Array<{ name: string; q?: number; level?: number; l?: string | boolean; p?: string } | null> = []
    public chests = new Map<string, any>()
    public entities = new Map<string, any>()
    public players = new Map<string, any>()
    public party?: string
    public partyData?: { list?: string[] }
    public calls: Array<{ method: string; args: any[] }> = []

    public constructor(options: MockCharacterOptions = {}) {
        this.name = options.name ?? "TestHero"
        this.ctype = options.ctype ?? "warrior"
        this.map = options.map ?? "main"
        this.x = options.x ?? 0
        this.y = options.y ?? 0
        this.hp = options.hp ?? 1000
        this.max_hp = options.max_hp ?? 1000
        this.mp = options.mp ?? 500
        this.max_mp = options.max_mp ?? 500
        this.esize = options.esize ?? 20
        this.gold = options.gold ?? 50000
        this.ready = true
        this.rip = false
        this.range = options.range ?? (this.ctype === "warrior" ? 50 : 300)

        const emitter = new EventEmitter() as EventEmitter & { connected: boolean }
        emitter.connected = true
        this.socket = emitter
    }

    public recordCall(method: string, ...args: any[]): void {
        this.calls.push({ method, args })
    }

    public locateItem(name: string): number {
        return this.items.findIndex((item) => item?.name === name)
    }

    public hasItem(name: string | string[], items: Array<{ name: string; q?: number } | null> = this.items): boolean {
        const names = Array.isArray(name) ? name : [name]
        return items.some((item) => item && names.includes(item.name))
    }

    public countItem(name: string, items: Array<{ name: string; q?: number } | null> = this.items): number {
        return items.reduce((acc, item) => (item?.name === name ? acc + (item.q ?? 1) : acc), 0)
    }

    public async openMerchantStand(): Promise<void> {
        this.recordCall("openMerchantStand")
        this.stand = true
    }

    public async closeMerchantStand(): Promise<void> {
        this.recordCall("closeMerchantStand")
        this.stand = false
    }

    public async listForSale(
        itemPos: number,
        price: number,
        tradeSlot?: string,
        quantity: number = 1,
    ): Promise<unknown> {
        this.recordCall("listForSale", itemPos, price, tradeSlot, quantity)
        const slot = tradeSlot ?? "trade1"
        const invItem = this.items[itemPos]
        if (invItem) {
            this.slots[slot] = {
                name: invItem.name,
                price,
                q: quantity,
                b: false,
                rid: "test_rid_" + itemPos,
            }
        }
        return true
    }

    public async unequip(slot: string): Promise<number> {
        this.recordCall("unequip", slot)
        delete this.slots[slot]
        return 0
    }

    public async getPontyItems(): Promise<any[]> {
        this.recordCall("getPontyItems")
        return [...this.pontyItems]
    }

    public async buyFromPonty(item: any): Promise<void> {
        this.recordCall("buyFromPonty", item)
        const cost = (item.price ?? 100) * (item.q ?? 1)
        this.gold = Math.max(0, this.gold - cost)
        const existingIdx = this.items.findIndex((i) => i?.name === item.name)
        if (existingIdx !== -1 && this.items[existingIdx]) {
            this.items[existingIdx]!.q = (this.items[existingIdx]!.q ?? 1) + (item.q ?? 1)
        } else {
            const emptyIdx = this.items.findIndex((i) => !i)
            if (emptyIdx !== -1) {
                this.items[emptyIdx] = { name: item.name, q: item.q ?? 1, level: item.level }
                this.esize = Math.max(0, this.esize - 1)
            }
        }
    }

    public async usePotion(itemPos: number): Promise<void> {
        this.recordCall("usePotion", itemPos)
    }

    public async regenHP(): Promise<void> {
        this.recordCall("regenHP")
    }

    public async regenMP(): Promise<void> {
        this.recordCall("regenMP")
    }

    public async openChest(id: string): Promise<any> {
        this.recordCall("openChest", id)
        this.chests.delete(id)
        return { gold: 100 }
    }

    public async basicAttack(id: string): Promise<any> {
        this.recordCall("basicAttack", id)
        return { id }
    }

    public async healSkill(id: string): Promise<any> {
        this.recordCall("healSkill", id)
        return { id }
    }

    public async partyHeal(): Promise<any> {
        this.recordCall("partyHeal")
        return {}
    }

    public async taunt(id: string): Promise<any> {
        this.recordCall("taunt", id)
        return { id }
    }

    public async cleave(): Promise<any> {
        this.recordCall("cleave")
        return {}
    }

    public async burst(id: string): Promise<any> {
        this.recordCall("burst", id)
        return { id }
    }

    public async cburst(targets: [string, number][]): Promise<any> {
        this.recordCall("cburst", targets)
        return { targets }
    }

    public async huntersMark(id: string): Promise<any> {
        this.recordCall("huntersMark", id)
        return { id }
    }

    public async superShot(id: string): Promise<any> {
        this.recordCall("superShot", id)
        return { id }
    }

    public async sendPartyInvite(id: string): Promise<void> {
        this.recordCall("sendPartyInvite", id)
    }

    public async acceptPartyInvite(id: string): Promise<any> {
        this.recordCall("acceptPartyInvite", id)
        this.party = id
        return { list: [id, this.name] }
    }

    public async sendPartyRequest(id: string): Promise<void> {
        this.recordCall("sendPartyRequest", id)
    }

    public async acceptPartyRequest(id: string): Promise<any> {
        this.recordCall("acceptPartyRequest", id)
        if (!this.partyData) this.partyData = { list: [this.name] }
        if (!this.partyData.list) this.partyData.list = [this.name]
        this.partyData.list.push(id)
        return this.partyData
    }

    public async leaveParty(): Promise<void> {
        this.recordCall("leaveParty")
        this.party = undefined
        this.partyData = undefined
    }

    public async move(x: number, y: number): Promise<void> {
        this.recordCall("move", x, y)
        this.x = x
        this.y = y
    }

    public async smartMove(destination: any): Promise<void> {
        this.recordCall("smartMove", destination)
        if (typeof destination === "object") {
            if (destination.x !== undefined) this.x = destination.x
            if (destination.y !== undefined) this.y = destination.y
            if (destination.map !== undefined) this.map = destination.map
        }
    }

    public canUse(skill: SkillName | string): boolean {
        const cd = this.cooldowns.get(skill) ?? 0
        return Date.now() >= cd
    }

    public getCooldown(skill: SkillName | string): number {
        const cd = this.cooldowns.get(skill) ?? 0
        return Math.max(0, cd - Date.now())
    }

    public setCooldown(skill: SkillName | string, ms: number): void {
        this.cooldowns.set(skill, Date.now() + ms)
    }

    public disconnect(): void {
        this.socket.connected = false
        this.ready = false
        this.socket.emit("disconnect", "manual")
    }

    public asPingCompensated(): PingCompensatedCharacter {
        return this as unknown as PingCompensatedCharacter
    }
}
