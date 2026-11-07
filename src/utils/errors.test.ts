import { describe, expect, test } from 'bun:test';

import { ignoreErrors } from '@/utils/errors';

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
