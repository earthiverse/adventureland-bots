const lastCheck = new Map<string, number>();

/**
 * Throttles logic to have a function only run once every interval
 * @param key
 * @param intervalMs
 * @param update if we should update the last check to the current time if returning true
 * @returns false if we should throttle, true otherwise
 */
export function throttle(key: string, intervalMs: number, update = true) {
  const now = Date.now();
  const last = lastCheck.get(key) ?? 0;

  if (now - last >= intervalMs) {
    if (update) lastCheck.set(key, now);
    return true;
  }
  return false;
}
