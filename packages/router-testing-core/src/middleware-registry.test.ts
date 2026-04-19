import { afterEach, describe, expect, it } from 'vitest';

import { __resetMiddlewareRegistry, clearAllMiddlewareMocks, getMiddlewareEntry, registerMiddleware, setMiddlewareMock } from './middleware-registry.ts';

describe('middleware-registry', () => {
  afterEach(() => {
    __resetMiddlewareRegistry();
  });

  it('registerMiddleware stores phases and returns entry', () => {
    const mw = {};
    const client = () => 'client';
    const server = () => 'server';
    const entry = registerMiddleware(mw, { client, server });
    expect(entry.originalClient).toBe(client);
    expect(entry.originalServer).toBe(server);
    expect(entry.mockClient).toBeUndefined();
    expect(entry.mockServer).toBeUndefined();
  });

  it('registerMiddleware is idempotent', () => {
    const mw = {};
    const server = () => 'server';
    const first = registerMiddleware(mw, { server });
    const second = registerMiddleware(mw, { server: () => 'different' });
    expect(second).toBe(first);
    expect(second.originalServer).toBe(server);
  });

  it('supports middleware with only one phase', () => {
    const mw = {};
    const server = () => 'server';
    const entry = registerMiddleware(mw, { server });
    expect(entry.originalClient).toBeUndefined();
    expect(entry.originalServer).toBe(server);
  });

  it('setMiddlewareMock swaps a single phase', () => {
    const mw = {};
    const client = () => 'client';
    const server = () => 'server';
    const mockServer = () => 'mockServer';
    registerMiddleware(mw, { client, server });
    const restore = setMiddlewareMock(mw, { server: mockServer });
    expect(getMiddlewareEntry(mw)?.mockServer).toBe(mockServer);
    expect(getMiddlewareEntry(mw)?.mockClient).toBeUndefined();
    restore();
    expect(getMiddlewareEntry(mw)?.mockServer).toBeUndefined();
  });

  it('setMiddlewareMock swaps both phases independently', () => {
    const mw = {};
    registerMiddleware(mw, { client: () => 'c', server: () => 's' });
    const mockClient = () => 'mockC';
    const mockServer = () => 'mockS';
    const restore = setMiddlewareMock(mw, { client: mockClient, server: mockServer });
    expect(getMiddlewareEntry(mw)?.mockClient).toBe(mockClient);
    expect(getMiddlewareEntry(mw)?.mockServer).toBe(mockServer);
    restore();
    expect(getMiddlewareEntry(mw)?.mockClient).toBeUndefined();
    expect(getMiddlewareEntry(mw)?.mockServer).toBeUndefined();
  });

  it('setMiddlewareMock throws for unregistered mw', () => {
    const mw = {};
    expect(() => setMiddlewareMock(mw, { server: () => 's' })).toThrow(/unregistered middleware/);
  });

  it('clearAllMiddlewareMocks clears every mock', () => {
    const mwA = {};
    const mwB = {};
    registerMiddleware(mwA, { server: () => 'sA' });
    registerMiddleware(mwB, { server: () => 'sB' });
    setMiddlewareMock(mwA, { server: () => 'mockA' });
    setMiddlewareMock(mwB, { server: () => 'mockB' });
    clearAllMiddlewareMocks();
    expect(getMiddlewareEntry(mwA)?.mockServer).toBeUndefined();
    expect(getMiddlewareEntry(mwB)?.mockServer).toBeUndefined();
  });
});
