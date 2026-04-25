// NOTE: Requires the Vite plugin from '@tanstack-router-testing/react-start-testing/vite'
// so that `@tanstack/react-start` imports resolve to the test shim (which auto-registers
// middleware). See tanstackStartTesting() in your vitest/vite config.
import { createMiddleware } from '@tanstack/react-start';
import { afterEach, describe, expect, it } from 'vitest';
import {
  callMiddleware,
  clearStartMocks,
  mockMiddleware,
} from '@tanstack-router-testing/react-start-testing';

// ---------------------------------------------------------------------------
// Middleware under test
// ---------------------------------------------------------------------------

const authMiddleware = createMiddleware()
  .server(async ({ next, context }) => {
    // In production this would verify a session token
    const user = { id: 'real-user', role: 'admin' };
    return next({ context: { ...context, user } });
  })
  .client(async ({ next }) => {
    return next();
  });

const loggingMiddleware = createMiddleware()
  .server(async ({ next, context }) => {
    const start = Date.now();
    const result = await next();
    const elapsed = Date.now() - start;
    return { ...result, context: { ...context, elapsed } };
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('callMiddleware — isolated execution', () => {
  afterEach(() => {
    clearStartMocks();
  });

  it('calls the server phase and captures the resulting context', async () => {
    const result = await callMiddleware(authMiddleware, {
      phase: 'server',
      context: { tenant: 'acme' },
    });

    expect(result.context).toEqual({
      tenant: 'acme',
      user: { id: 'real-user', role: 'admin' },
    });
  });

  it('calls the client phase', async () => {
    const result = await callMiddleware(authMiddleware, {
      phase: 'client',
      context: {},
    });

    // The client phase just forwards — context is unchanged
    expect(result.context).toEqual({});
  });

  it('accepts an optional request object', async () => {
    const request = new Request('http://localhost:3000/api/admin', {
      headers: { Authorization: 'Bearer test-token' },
    });

    const result = await callMiddleware(authMiddleware, {
      phase: 'server',
      context: {},
      request,
    });

    expect(result.context).toHaveProperty('user');
  });
});

describe('mockMiddleware', () => {
  afterEach(() => {
    clearStartMocks();
  });

  it('replaces the server phase of a middleware', async () => {
    mockMiddleware(authMiddleware, {
      server: async ({ next }) => {
        return next({ context: { user: { id: 'stub', role: 'viewer' } } });
      },
    });

    const result = await callMiddleware(authMiddleware, {
      phase: 'server',
      context: {},
    });

    expect(result.context).toEqual({
      user: { id: 'stub', role: 'viewer' },
    });
  });

  it('leaves the client phase untouched when only server is mocked', async () => {
    mockMiddleware(authMiddleware, {
      server: async ({ next }) => {
        return next({ context: { user: { id: 'mocked' } } });
      },
      // client is omitted — real implementation runs
    });

    const clientResult = await callMiddleware(authMiddleware, {
      phase: 'client',
      context: {},
    });

    // Client phase still uses the real implementation
    expect(clientResult.context).toEqual({});
  });

  it('returns a disposer that restores the original', async () => {
    const dispose = mockMiddleware(authMiddleware, {
      server: async ({ next }) => {
        return next({ context: { user: { id: 'temporary' } } });
      },
    });

    const mocked = await callMiddleware(authMiddleware, {
      phase: 'server',
      context: {},
    });
    expect(mocked.context).toEqual({ user: { id: 'temporary' } });

    dispose();

    const restored = await callMiddleware(authMiddleware, {
      phase: 'server',
      context: {},
    });
    expect(restored.context).toEqual({
      user: { id: 'real-user', role: 'admin' },
    });
  });

  it('clearStartMocks removes all middleware mocks', async () => {
    mockMiddleware(authMiddleware, {
      server: async ({ next }) => next({ context: { user: null } }),
    });
    mockMiddleware(loggingMiddleware, {
      server: async ({ next }) => next({ context: { elapsed: -1 } }),
    });

    clearStartMocks();

    const authResult = await callMiddleware(authMiddleware, {
      phase: 'server',
      context: {},
    });
    expect(authResult.context).toHaveProperty('user.id', 'real-user');
  });
});
