import { Constants } from 'alclient';

const WAIT_SECONDS_PATTERN = /wait_(\d+)_second/;

/** Extracts a readable string from an unknown thrown or rejected value. */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error) ?? '';
  } catch {
    return '';
  }
}

/** Returns true when a server connection error indicates retrying cannot succeed (such as invalid auth). */
export function isFatalReconnectError(error: unknown): boolean {
  return formatErrorMessage(error).includes('nouser');
}

/** Computes reconnect backoff delay in ms from a server connection error. */
export function getReconnectDelayMs(error: unknown): number {
  const message = formatErrorMessage(error);
  const waitMatch = WAIT_SECONDS_PATTERN.exec(message);
  if (waitMatch?.[1]) return 2000 + Number(waitMatch[1]) * 1000;
  if (message.includes('limits')) return Constants.RECONNECT_TIMEOUT_MS;
  return message.includes('ingame') ? 500 : 10_000;
}

/** Awaits a promise and swallows any rejection, returning undefined on failure. */
export async function ignoreErrors<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise;
  } catch {
    // Intentionally ignored
    return undefined;
  }
}
