import { Constants } from 'alclient';
import { describe, expect, test } from 'bun:test';

import { getReconnectDelayMs, ignoreErrors, isFatalReconnectError } from '@/utils/errors';

describe('reconnect error helpers', () => {
  test('parses wait_X_second server delays with 2s buffer', () => {
    expect(getReconnectDelayMs(new Error('wait_5_seconds'))).toBe(7000);
    expect(getReconnectDelayMs('wait_12_second')).toBe(14_000);
  });

  test('returns ALClient reconnect timeout for limits errors', () => {
    expect(getReconnectDelayMs(new Error('limits'))).toBe(Constants.RECONNECT_TIMEOUT_MS);
  });

  test('returns 500ms for ingame errors', () => {
    expect(getReconnectDelayMs('ingame')).toBe(500);
  });

  test('identifies fatal nouser auth errors regardless of error shape', () => {
    expect(isFatalReconnectError(new Error('nouser'))).toBe(true);
    expect(isFatalReconnectError('nouser')).toBe(true);
    expect(isFatalReconnectError({ reason: 'nouser' })).toBe(true);
    expect(isFatalReconnectError(new Error('limits'))).toBe(false);
  });

  test('defaults to 10s for unrecognized errors', () => {
    expect(getReconnectDelayMs(new Error('network timeout'))).toBe(10_000);
  });
});

describe('ignoreErrors', () => {
  test('returns resolved value when promise succeeds', async () => {
    const result = await ignoreErrors(Promise.resolve('success'));
    expect(result).toBe('success');
  });

  test('returns undefined when promise rejects', async () => {
    const result = await ignoreErrors(Promise.reject(new Error('failure')));
    expect(result).toBeUndefined();
  });

  test('handles void promises correctly', async () => {
    const result = await ignoreErrors(Promise.resolve());
    expect(result).toBeUndefined();
  });

  test('can be called without await for fire-and-forget suppression', async () => {
    let unhandledTriggered = false;
    const handleUnhandledRejection = () => {
      unhandledTriggered = true;
    };
    process.once('unhandledRejection', handleUnhandledRejection);

    void ignoreErrors(Promise.reject(new Error('background failure')));
    await new Promise((resolve) => setTimeout(resolve, 10));

    process.off('unhandledRejection', handleUnhandledRejection);
    expect(unhandledTriggered).toBe(false);
  });
});
