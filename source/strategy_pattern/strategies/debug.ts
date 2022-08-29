import { AchievementProgressData, Character, LimitDCReportData } from "alclient"
import { Strategy } from "../context.js"

type DebugOptions = {
    /** Will log when you get achievement points */
    logAchievementProgress?: boolean
    /** Will log the report that tells you how many commands you ran when you are disconnected for doing too many code calls */
    logLimitDCReport?: boolean
}

/**
 * Logs data to console or files
 */
export class DebugStrategy<Type extends Character> implements Strategy<Type> {
    private onAchievementProgress: (data: AchievementProgressData) => void
    private onLimitDCReport: (data: LimitDCReportData) => void

    public options: DebugOptions

    public constructor(options?: DebugOptions) {
        if (options == undefined) options = {}
        this.options = options
    }

    public onApply(bot: Type) {
        if (this.options.logAchievementProgress) {
            this.onAchievementProgress = (data: AchievementProgressData) => {
                if ((data as any).count && (data as any).needed) {
                    console.debug(`[${data.name}] ${(data as any).count}/${(data as any).needed}`)
                }
            }
            bot.socket.on("achievement_progress", this.onAchievementProgress)
        }
        if (this.options.logLimitDCReport) {
            this.onLimitDCReport = (data: LimitDCReportData) => {
                console.debug("=== START LIMITDCREPORT ===")
                console.debug(data)
                console.debug("=== END LIMITDCREPORT ===")
            }
            bot.socket.on("limitdcreport", this.onLimitDCReport)
        }
    }

    public onRemove(bot: Type) {
        if (this.onAchievementProgress) bot.socket.off("achievement_progress", this.onAchievementProgress)
        if (this.onLimitDCReport) bot.socket.off("limitdcreport", this.onLimitDCReport)
    }
}