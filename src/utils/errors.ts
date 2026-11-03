/** Awaits a promise and swallows any rejection, returning undefined on failure. */
export async function ignoreErrors<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise;
  } catch {
    // Intentionally ignored
    return undefined;
  }
}
