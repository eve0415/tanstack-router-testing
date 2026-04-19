import { afterEach, describe, expect, it } from 'vitest';

import { getEnv, runInEnv, setEnv } from './env.ts';

describe('env', () => {
  afterEach(() => {
    setEnv(undefined);
  });

  it('getEnv returns undefined by default', () => {
    expect(getEnv()).toBeUndefined();
  });

  it('setEnv writes and clears the env', () => {
    setEnv('server');
    expect(getEnv()).toBe('server');
    setEnv('client');
    expect(getEnv()).toBe('client');
    setEnv(undefined);
    expect(getEnv()).toBeUndefined();
  });

  it('runInEnv sets env for the callback and restores afterwards', async () => {
    expect(getEnv()).toBeUndefined();
    const result = await runInEnv('server', () => {
      expect(getEnv()).toBe('server');
      return 42;
    });
    expect(result).toBe(42);
    expect(getEnv()).toBeUndefined();
  });

  it('runInEnv restores prior env on throw', async () => {
    setEnv('client');
    await expect(
      runInEnv('server', () => {
        expect(getEnv()).toBe('server');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(getEnv()).toBe('client');
  });

  it('runInEnv supports nesting', async () => {
    await runInEnv('server', async () => {
      expect(getEnv()).toBe('server');
      await runInEnv('client', () => {
        expect(getEnv()).toBe('client');
      });
      expect(getEnv()).toBe('server');
    });
  });

  it('runInEnv awaits async callbacks', async () => {
    const result = await runInEnv('server', async () => {
      await Promise.resolve();
      return getEnv();
    });
    expect(result).toBe('server');
  });
});
