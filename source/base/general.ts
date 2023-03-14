const lastCheck = new Map<string, number>()
export function checkOnlyEveryMS(key: string, msSince = 5000) {
    const last = lastCheck.get(key)
    if (!last || (last < (Date.now() - msSince))) {
        // We haven't checked before, or it's been more than `msSince` since we last checked
        lastCheck.set(key, Date.now())
        return true
    }
    return false
}

export function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}