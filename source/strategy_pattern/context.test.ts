import { jest } from "@jest/globals"
import { EventEmitter } from "events"
import AL, { type PingCompensatedCharacter, type ServerData, type ServerIdentifier, type ServerRegion } from "alclient"
import { Strategist } from "./context.js"

class FakeSocket extends EventEmitter {
    public connected = true
    public disconnected = false

    public disconnect() {
        if (this.disconnected) return
        this.connected = false
        this.disconnected = true
        this.emit("disconnect", "io client disconnect")
    }
}

class FakeBot {
    public owner: string
    public userAuth: string
    public characterID: string
    public ctype = "warrior"
    public name = "earthWar"
    public serverData: ServerData
    public ready = true
    public socket = new FakeSocket()
    public disconnectCount = 0

    public constructor(
        owner: string,
        userAuth: string,
        characterID: string,
        _g: unknown,
        serverData: ServerData,
    ) {
        this.owner = owner
        this.userAuth = userAuth
        this.characterID = characterID
        this.serverData = serverData
    }

    public connect(): Promise<void> {
        return Promise.resolve()
    }

    public disconnect(): void {
        this.disconnectCount += 1
        this.ready = false
        this.socket.disconnect()
        this.socket.removeAllListeners()
    }
}

function makeServer(region: ServerRegion, name: ServerIdentifier): ServerData {
    return {
        address: `${region.toLowerCase()}-${name.toLowerCase()}.example.test`,
        name,
        path: "/",
        players: 0,
        region,
        secure: true,
    } as unknown as ServerData
}

const US_I = makeServer("US", "I")
const EU_I = makeServer("EU", "I")
const US_II = makeServer("US", "II")

describe("Strategist server switching and reconnection", () => {
    const originalWarrior = AL.Warrior
    const originalServers = AL.Game.servers
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>

    beforeEach(() => {
        jest.useFakeTimers()
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)
        AL.Game.servers = {
            EU: { I: EU_I },
            US: { I: US_I, II: US_II },
        } as unknown as typeof AL.Game.servers
    })

    afterEach(() => {
        AL.Warrior = originalWarrior
        AL.Game.servers = originalServers
        consoleErrorSpy.mockRestore()
        jest.useRealTimers()
    })

    test("retries wait, limits, and ingame errors until connected", async () => {
        const errors = [
            new Error("Failed to connect: wait_3_seconds"),
            new Error("Failed to connect: limits"),
            new Error("Failed to connect: ingame"),
        ]
        const createdBots: FakeBot[] = []

        AL.Warrior = class extends FakeBot {
            public constructor(o: string, a: string, c: string, g: unknown, s: ServerData) {
                super(o, a, c, g, s)
                createdBots.push(this)
            }

            public override connect(): Promise<void> {
                const nextError = errors.shift()
                if (nextError) return Promise.reject(nextError)
                return Promise.resolve()
            }
        } as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)

        let settled = false
        const hopPromise = strategist.changeServer("EU", "I").then(() => {
            settled = true
        })

        // First attempt fails with wait_3_seconds (2000ms + 3000ms)
        await Promise.resolve()
        expect(settled).toBe(false)
        expect(createdBots).toHaveLength(1)
        expect(createdBots[0].disconnectCount).toBe(1)

        // Second attempt fails with limits (RECONNECT_TIMEOUT_MS)
        await jest.advanceTimersByTimeAsync(5000)
        expect(settled).toBe(false)
        expect(createdBots).toHaveLength(2)

        // Third attempt fails with ingame (500ms)
        await jest.advanceTimersByTimeAsync(AL.Constants.RECONNECT_TIMEOUT_MS)
        expect(settled).toBe(false)
        expect(createdBots).toHaveLength(3)

        // Fourth attempt connects cleanly
        await jest.advanceTimersByTimeAsync(500)
        await hopPromise
        expect(settled).toBe(true)
        expect(strategist.bot).toBe(createdBots[3])
        expect(strategist.bot.serverData).toBe(EU_I)
    })

    test("rejects and stops context on nouser", async () => {
        const authError = new Error("Failed to connect: nouser")
        AL.Warrior = class extends FakeBot {
            public override connect(): Promise<void> {
                return Promise.reject(authError)
            }
        } as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)

        const caught = await strategist.changeServer("EU", "I").catch((err: unknown) => err)
        expect(caught).toBeInstanceOf(Error)
        expect((caught as Error).message).toContain("Authorization failed")
        expect((caught as Error & { cause?: unknown }).cause).toBe(authError)
        expect(strategist.isStopped()).toBe(true)
    })

    test("rejects with cause without retrying when retry is false", async () => {
        const connectError = new Error("Failed to connect: ingame")
        const createdBots: FakeBot[] = []

        AL.Warrior = class extends FakeBot {
            public constructor(o: string, a: string, c: string, g: unknown, s: ServerData) {
                super(o, a, c, g, s)
                createdBots.push(this)
            }

            public override connect(): Promise<void> {
                return Promise.reject(connectError)
            }
        } as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)

        const caught = await strategist.changeServer("EU", "I", false).catch((err: unknown) => err)
        expect(caught).toBeInstanceOf(Error)
        expect((caught as Error).message).toBe("Failed connecting, not retrying...")
        expect((caught as Error & { cause?: unknown }).cause).toBe(connectError)

        await jest.advanceTimersByTimeAsync(60_000)
        expect(createdBots).toHaveLength(1)
    })

    test("cancels pending reconnect timer when changeServer switches to another server", async () => {
        const createdBots: FakeBot[] = []
        let failUsConnect = true

        AL.Warrior = class extends FakeBot {
            public constructor(o: string, a: string, c: string, g: unknown, s: ServerData) {
                super(o, a, c, g, s)
                createdBots.push(this)
            }

            public override connect(): Promise<void> {
                if (this.serverData === US_I && failUsConnect) {
                    return Promise.reject(new Error("Failed to connect: wait_5_seconds"))
                }
                return Promise.resolve()
            }
        } as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)

        // Trigger unexpected disconnect on US I, which schedules a 7000ms reconnect timer
        initialBot.socket.disconnect()
        await Promise.resolve()
        expect(createdBots).toHaveLength(1)
        expect(createdBots[0].serverData).toBe(US_I)

        // Switch to EU I before the US I retry fires
        failUsConnect = false
        await strategist.changeServer("EU", "I")
        expect(strategist.bot.serverData).toBe(EU_I)
        const euBot = strategist.bot as unknown as FakeBot

        // Advance past the old US I retry timer and verify it never fires
        await jest.advanceTimersByTimeAsync(20_000)
        expect(strategist.bot).toBe(euBot)
        expect(strategist.bot.serverData).toBe(EU_I)
        expect(euBot.disconnectCount).toBe(0)
        expect(createdBots).toHaveLength(2)
    })

    test("discards late-resolving connect from a superseded changeServer", async () => {
        const resolvers: Array<() => void> = []
        const createdBots: FakeBot[] = []

        AL.Warrior = class extends FakeBot {
            public constructor(o: string, a: string, c: string, g: unknown, s: ServerData) {
                super(o, a, c, g, s)
                createdBots.push(this)
            }

            public override connect(): Promise<void> {
                return new Promise<void>((resolve) => {
                    resolvers.push(resolve)
                })
            }
        } as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)

        const firstHop = strategist.changeServer("EU", "I")
        const secondHop = strategist.changeServer("US", "II")

        await expect(firstHop).rejects.toThrow("Server change superseded")
        expect(createdBots).toHaveLength(2)

        // Resolve the second hop first, then the stale first hop
        resolvers[1]()
        await secondHop
        expect(strategist.bot).toBe(createdBots[1])
        expect(strategist.bot.serverData).toBe(US_II)

        resolvers[0]()
        await Promise.resolve()

        // Stale EU I bot must be disconnected and must not overwrite the US II bot
        expect(createdBots[0].disconnectCount).toBe(1)
        expect(strategist.bot).toBe(createdBots[1])
        expect(strategist.bot.serverData).toBe(US_II)
    })

    test("cancels pending changeServer retries when stop is called", async () => {
        const createdBots: FakeBot[] = []

        AL.Warrior = class extends FakeBot {
            public constructor(o: string, a: string, c: string, g: unknown, s: ServerData) {
                super(o, a, c, g, s)
                createdBots.push(this)
            }

            public override connect(): Promise<void> {
                return Promise.reject(new Error("Failed to start within 10s."))
            }
        } as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)

        const hopPromise = strategist.changeServer("EU", "I")
        await Promise.resolve()
        expect(createdBots).toHaveLength(1)

        strategist.stop()
        await expect(hopPromise).rejects.toThrow("Context stopped")

        await jest.advanceTimersByTimeAsync(60_000)
        expect(createdBots).toHaveLength(1)
    })

    test("preserves non-strategist disconnect listeners on intentional server change", async () => {
        AL.Warrior = FakeBot as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const observerDisconnect = jest.fn()
        initialBot.socket.on("disconnect", observerDisconnect)

        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)
        await strategist.changeServer("EU", "I")

        expect(observerDisconnect).toHaveBeenCalledTimes(1)
        expect(strategist.bot.serverData).toBe(EU_I)
    })

    test("reconnects to targetServer instead of stale bot serverData", async () => {
        let shouldFail = true
        AL.Warrior = class extends FakeBot {
            public override connect(): Promise<void> {
                if (shouldFail) return Promise.reject(new Error("Failed to connect: ingame"))
                return Promise.resolve()
            }
        } as unknown as typeof AL.Warrior

        const initialBot = new FakeBot("owner", "auth", "char1", {}, US_I)
        const strategist = new Strategist(initialBot as unknown as PingCompensatedCharacter)

        const hopPromise = strategist.changeServer("EU", "I")
        await Promise.resolve()
        expect(strategist.targetServer).toEqual({ name: "I", region: "EU" })

        // Calling reconnect while the hop is retrying must keep targeting EU I
        shouldFail = false
        await strategist.reconnect()
        await expect(hopPromise).rejects.toThrow("Reconnect superseded server change")
        expect(strategist.bot.serverData).toBe(EU_I)
    })
})
