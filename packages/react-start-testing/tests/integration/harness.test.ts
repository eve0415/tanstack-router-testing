/**
 * Integration tests for the public Start testing surface. No DOM required.
 *
 * Covers:
 * - mock cleanup
 * - registerMiddleware → mockMiddleware override (both phases)
 * - runInStartEnv flipping the env flag
 */

import type { AnyFn } from '@tanstack-router-testing/router-testing-core';

import {
  __resetMiddlewareRegistry,
  __resetServerFnRegistry,
  getEnv,
  getMiddlewareEntry,
  registerMiddleware,
  registerServerFn,
} from '@tanstack-router-testing/router-testing-core';
import { afterEach, describe, expect, it } from 'vitest';

import { clearStartMocks, mockMiddleware, mockServerFn, runInStartEnv } from '../../src/index.ts';

describe('react-start-testing harness integration', () => {
  afterEach(() => {
    __resetServerFnRegistry();
    __resetMiddlewareRegistry();
  });

  it('mockServerFn installs a callable-shaped mock and clearStartMocks clears it', () => {
    const serverFn = (_opts?: { data?: { x: number } }) => Promise.resolve('real');
    registerServerFn(serverFn as unknown as AnyFn, () => Promise.resolve('real'));

    mockServerFn(serverFn, () => Promise.resolve('mock:0'));
    clearStartMocks();

    const entry = registerServerFn(serverFn as unknown as AnyFn, () => Promise.resolve('real'));
    expect(entry.mock).toBeUndefined();
  });

  it('mockMiddleware overrides the server phase for the lifetime of the disposer', async () => {
    const mw = {};
    const originalServer = () => 'orig-server';
    registerMiddleware(mw, { server: originalServer });

    const restore = mockMiddleware(mw, { server: () => 'mocked-server' });
    await expect(Promise.resolve(getMiddlewareEntry(mw)?.mockServer?.())).resolves.toBe('mocked-server');
    restore();
    expect(getMiddlewareEntry(mw)?.mockServer).toBeUndefined();
  });

  it('runInStartEnv flips the env flag and restores it afterwards', async () => {
    const result = await runInStartEnv('server', () => ({ env: getEnv() }));
    expect(result).toStrictEqual({ env: 'server' });
    expect(getEnv()).toBeUndefined();
  });
});
