const lastCheck = new Map<string, number>()
export function checkOnlyEveryMS(key: string, msSince = 5000, set = true) {
    const last = lastCheck.get(key)
    if (!last || last < Date.now() - msSince) {
        // We haven't checked before, or it's been more than `msSince` since we last checked
        if (set) lastCheck.set(key, Date.now())
        return true
    }
    return false
}

export function setLastCheck(key: string, value = Date.now()) {
    lastCheck.set(key, value)
}

export function getMsToNextMinute(): number {
    return 60_000 - (Date.now() % 60_000)
}

export function randomIntFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
