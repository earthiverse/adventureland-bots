import { AchievementProgressData, Character, ClientToServerSkillData, LimitDCReportData, NewMapData, SkillTimeoutData } from "alclient"
import { Strategy } from "../context.js"
import fs from "fs"

type DebugOptions = {
    /** If true, we will write to a file for the bot */
    writeToFile?: boolean

    /** The size of the events log (default 500) */
    logEventsSize?: number

    /** Will log all incoming sockets */
    logAllIncoming?: boolean
    /** Will log all outgoing sockets */
    logAllOutgoing?: boolean

    /** Will log when you get achievement points */
    logAchievementProgress?: boolean
    /** Will log when we attack */
    logAttacks?: boolean
    /** Will log when we equip things */
    logEquips?: boolean
    /** Will log when we enter an instance */
    logInstances?: boolean
    /** Will log the report that tells you how many commands you ran when you are disconnected for doing too many code calls */
    logLimitDCReport?: boolean
    /** Will log when we receive a penalty */
    logPenalties?: boolean
    /** Will log when we use a skill */
    logSkills?: boolean
    /** Will log when we receive a skill timeout */
    logSkillTimeouts?: boolean
}

/**
 * Logs data to console
 * TODO: Log to files, too
 */
export class DebugStrategy<Type extends Character> implements Strategy<Type> {
    private logAllIncoming: (name: string, data: unknown) => void
    private logAllOutgoing: (name: string, data: unknown) => void

    private logAchievementProgress: (data: AchievementProgressData) => void
    private logAttacks: (name: string, data: unknown) => void
    private logEquips: (name: string, data: unknown) => void
    private logInstances1: (name: string, data: unknown) => void
    private logInstances2: (data: NewMapData) => void
    private logLimitDCReport: (data: LimitDCReportData) => void
    private logPenalty: (name: string, data: unknown) => void
    private logSkills: (name: string, data: ClientToServerSkillData) => void
    private logSkillTimeouts: (data: SkillTimeoutData) => void

    public static events = new Map<string, string[]>()

    public options: DebugOptions

    public constructor(options?: DebugOptions) {
        if (options == undefined) options = {}
        if (options.logEventsSize === undefined) options.logEventsSize = 500
        this.options = options
    }

    /**
     * Gets the last events for the given character ID
     *
     * `=>` are outgoing events
     *
     * `<=` are incoming events
     *
     * @param id Character ID
     * @returns
     */
    public static getEvents(id: string) {
        return DebugStrategy.events.get(id)
    }

    public onApply(bot: Type) {
        // Reset events
        DebugStrategy.events.set(bot.id, [])

        this.logAllIncoming = (name: string, data: unknown) => {
            // Add the new event
            const events = DebugStrategy.events.get(bot.id)
            const log = `[${this.getTimestamp()}] [${bot.id}] [${name}] <= ${JSON.stringify(data)}`
            events.push(log)
            if (this.options.logAllIncoming) {
                console.debug(log)
            }

            // Trim events
            if (events.length > this.options.logEventsSize) events.splice(events.length - this.options.logEventsSize, this.options.logEventsSize)
        }

        bot.socket.onAny(this.logAllIncoming)
        this.logAllOutgoing = (name: string, data: unknown) => {
            // Add the new event
            const events = DebugStrategy.events.get(bot.id)
            const log = `[${this.getTimestamp()}] [${bot.id}] [${name}] => ${JSON.stringify(data)}`
            events.push(log)
            if (this.options.logAllOutgoing) {
                console.debug(log)
            }

            // Trim events
            if (events.length > this.options.logEventsSize) events.splice(events.length - this.options.logEventsSize, this.options.logEventsSize)
        }
        bot.socket.onAnyOutgoing(this.logAllOutgoing)

        if (this.options.logAchievementProgress) {
            this.logAchievementProgress = (data: AchievementProgressData) => {
                if ((data as any).count && (data as any).needed) {
                    this.log(bot, "logAchievementProgress", `${data.name} ${(data as any).count}/${(data as any).needed}`)
                }
            }
            bot.socket.on("achievement_progress", this.logAchievementProgress)
        }

        if (this.options.logAttacks) {
            this.logAttacks = (name: string, data: unknown) => {
                if (name !== "attack") return
                this.log(bot, "logAttacks", JSON.stringify(data))
            }
            bot.socket.onAnyOutgoing(this.logAttacks)
        }

        if (this.options.logEquips) {
            this.logEquips = (name: string, data: unknown) => {
                if (name !== "equip") return
                this.log(bot, "logEquips", JSON.stringify(data))
            }
            bot.socket.onAnyOutgoing(this.logEquips)
        }

        if (this.options.logInstances) {
            this.logInstances1 = (name: string, data: unknown) => {
                if (name !== "enter") return
                this.log(bot, "logInstances", JSON.stringify(data))
            }
            bot.socket.onAnyOutgoing(this.logInstances1)
            this.logInstances2 = (data: NewMapData) => {
                if (data.in === data.name) return
                this.log(bot, "logInstances", data.in)
            }
            bot.socket.on("new_map", this.logInstances2)
        }

        if (this.options.logLimitDCReport) {
            this.logLimitDCReport = (data: LimitDCReportData) => {
                console.debug(`=== START LIMITDCREPORT (${bot.id}) ===`)
                console.debug(data)
                console.debug(`=== END LIMITDCREPORT ${bot.id} ===`)
            }
            bot.socket.on("limitdcreport", this.logLimitDCReport)
        }

        if (this.options.logPenalties) {
            this.logPenalty = (name: string, data: unknown) => {
                if (typeof data !== "object") return
                if ((data as any).penalty) {
                    this.log(bot, "logPenalties", `${name} ${JSON.stringify(data)}`)
                }
            }
            bot.socket.onAny(this.logPenalty)
        }

        if (this.options.logSkills) {
            this.logSkills = (name: string, data: ClientToServerSkillData) => {
                if (name !== "skill") return
                this.log(bot, "logSkills", JSON.stringify(data))
            }
            bot.socket.onAnyOutgoing(this.logSkills)
        }

        if (this.options.logSkillTimeouts) {
            this.logSkillTimeouts = (data: SkillTimeoutData) => {
                this.log(bot, "logSkillTimeouts", JSON.stringify(data))
            }
            bot.socket.on("skill_timeout", this.logSkillTimeouts)
        }
    }

    public onRemove(bot: Type) {
        bot.socket.offAny(this.logAllIncoming)
        bot.socket.offAnyOutgoing(this.logAllOutgoing)
        if (this.logAchievementProgress) bot.socket.off("achievement_progress", this.logAchievementProgress)
        if (this.logAttacks) bot.socket.offAnyOutgoing(this.logAttacks)
        if (this.logEquips) bot.socket.offAnyOutgoing(this.logEquips)
        if (this.logInstances2) bot.socket.off("new_map", this.logInstances2)
        if (this.logLimitDCReport) bot.socket.off("limitdcreport", this.logLimitDCReport)
        if (this.logPenalty) bot.socket.offAny(this.logPenalty)
        if (this.logSkills) bot.socket.offAnyOutgoing(this.logSkills)
        if (this.logSkillTimeouts) bot.socket.off("skill_timeout", this.logSkillTimeouts)
    }

    protected log(bot: Type, name: string, message: string) {
        const output = `[${this.getTimestamp()}] [${bot.id}] [${name}] ${message}`
        console.debug(output)

        if (this.options.writeToFile) {
            fs.appendFileSync(`./${bot.id}_debug`, output)
        }
    }

    protected getTimestamp(): string {
        return (new Date()).toISOString()
    }
}