import { AchievementProgressData, Character, LimitDCReportData } from "alclient"
import { Strategy } from "../context.js"

type DebugOptions = {
    /** Will log when you get achievement points */
    logAchievementProgress?: boolean
    /** Will log the report that tells you how many commands you ran when you are disconnected for doing too many code calls */
    logLimitDCReport?: boolean
    /** Will log when we receive a penalty */
    logPenalties?: boolean
}

/**
 * Logs data to console or files
 */
export class DebugStrategy<Type extends Character> implements Strategy<Type> {
    private logAchievementProgress: (data: AchievementProgressData) => void
    private logLimitDCReport: (data: LimitDCReportData) => void
    private logPenalty: (data: any) => void

    public options: DebugOptions

    public constructor(options?: DebugOptions) {
        if (options == undefined) options = {}
        this.options = options
    }

    public onApply(bot: Type) {
        if (this.options.logAchievementProgress) {
            this.logAchievementProgress = (data: AchievementProgressData) => {
                if ((data as any).count && (data as any).needed) {
                    console.debug(`[${bot.id}] [${data.name}] ${(data as any).count}/${(data as any).needed}`)
                }
            }
            bot.socket.on("achievement_progress", this.logAchievementProgress)
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
            this.logPenalty = (data: any) => {
                if (typeof data !== "object") return
                if (data.penalty) {
                    console.debug(JSON.stringify(data, null, 2))
                }
            }
            bot.socket.onAny(this.logPenalty)
        }
    }

    public onRemove(bot: Type) {
        if (this.logAchievementProgress) bot.socket.off("achievement_progress", this.logAchievementProgress)
        if (this.logLimitDCReport) bot.socket.off("limitdcreport", this.logLimitDCReport)
        if (this.logPenalty) bot.socket.offAny(this.logPenalty)
    }
}