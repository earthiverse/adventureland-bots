const lastCheck = new Map<string, number>();
export function throttle(key: string, intervalMs: number, update = true) {
  const now = Date.now();
  const last = lastCheck.get(key) ?? 0;

  if (now - last >= intervalMs) {
    if (update) lastCheck.set(key, now);
    return true;
  }
  return false;
}
