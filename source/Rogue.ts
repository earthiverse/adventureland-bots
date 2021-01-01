import { EvalData } from "./definitions/adventureland-server"
import { TIMEOUT } from "./Game.js"
import { PingCompensatedPlayer } from "./PingCompensatedPlayer.js"

export class Rogue extends PingCompensatedPlayer {
    // NOTE: UNTESTED
    public invis(): Promise<void> {
        const invised = new Promise<void>((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]invis['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`invis timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })
        this.socket.emit("skill", {
            name: "invis"
        })
        return invised
    }

    // NOTE: UNTESTED
    public mentalBurst(target: string): Promise<void> {
        const marked = new Promise<void>((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]mentalburst['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`mentalburst timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })
        this.socket.emit("skill", {
            name: "mentalburst",
            id: target
        })
        return marked
    }

    // NOTE: UNTESTED
    public poisonCoat(): Promise<void> {
        const poisonCoated = new Promise<void>((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]pcoat['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`poisoncoat timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })
        this.socket.emit("skill", {
            name: "pcoat"
        })
        return poisonCoated
    }

    // NOTE: UNTESTED
    public quickPunch(target: string): Promise<void> {
        const marked = new Promise<void>((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]quickpunch['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`quickpunch timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })
        this.socket.emit("skill", {
            name: "quickpunch",
            id: target
        })
        return marked
    }

    // NOTE: UNTESTED
    public quickStab(target: string): Promise<void> {
        const marked = new Promise<void>((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]quickstab['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`quickstab timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })
        this.socket.emit("skill", {
            name: "quickstab",
            id: target
        })
        return marked
    }

    // NOTE: UNTESTED
    // TODO: Improve to check if we applied it on the given character
    public rspeed(target: string): Promise<void> {
        const marked = new Promise<void>((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]rspeed['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`rspeed timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })
        this.socket.emit("skill", {
            name: "rspeed",
            id: target
        })
        return marked
    }

    // NOTE: UNTESTED
    public shadowStrike(shadowstone = this.locateItem("shadowstone")): Promise<void> {
        if (shadowstone === undefined) return Promise.reject("We need a shadowstone in order to shadowstrike.")

        const shadowStriked = new Promise<void>((resolve, reject) => {
            const cooldownCheck = (data: EvalData) => {
                if (/skill_timeout\s*\(\s*['"]shadowstrike['"]\s*,?\s*(\d+\.?\d+?)?\s*\)/.test(data.code)) {
                    this.socket.removeListener("eval", cooldownCheck)
                    resolve()
                }
            }

            setTimeout(() => {
                this.socket.removeListener("eval", cooldownCheck)
                reject(`shadowstrike timeout (${TIMEOUT}ms)`)
            }, TIMEOUT)
            this.socket.on("eval", cooldownCheck)
        })
        this.socket.emit("skill", {
            name: "shadowstrike",
            num: shadowstone
        })
        return shadowStriked
    }
}