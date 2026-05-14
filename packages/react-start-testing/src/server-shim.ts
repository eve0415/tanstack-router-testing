import type { AnyRouter } from '@tanstack/router-core';
import type { HandlerCallback } from '@tanstack/router-core/ssr/server';
import type { CreateStartHandlerOptions, SessionConfig } from '@tanstack/start-server-core';
import type { CookieSerializeOptions } from 'cookie-es';

import { parse as parseCookieHeader, serialize as serializeCookie } from 'cookie-es';

// ---------------------------------------------------------------------------
// H3Event accessor — browser-safe (no h3-v2 or node:async_hooks import)
// ---------------------------------------------------------------------------

const GLOBAL_EVENT_STORAGE_KEY = Symbol.for('tanstack-start:event-storage');

interface H3EventLike {
  readonly req: Request;
  readonly res: { status?: number; statusText?: string; readonly headers: Headers; readonly errHeaders: Headers };
}

const tryGetH3Event = (): H3EventLike | undefined => {
  const storage = (globalThis as Record<symbol, { getStore?: () => { h3Event?: H3EventLike } | undefined } | undefined>)[GLOBAL_EVENT_STORAGE_KEY];
  return storage?.getStore?.()?.h3Event;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Virtual module IDs used internally by TanStack Start's build tooling.
 *
 * @example
 * ```ts
 * import { VIRTUAL_MODULES } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * console.log(VIRTUAL_MODULES.startManifest) // 'tanstack-start-manifest:v'
 * ```
 */
export const VIRTUAL_MODULES = {
  startManifest: 'tanstack-start-manifest:v',
  injectedHeadScripts: 'tanstack-start-injected-head-scripts:v',
  serverFnResolver: '#tanstack-start-server-fn-resolver',
  pluginAdapters: '#tanstack-start-plugin-adapters',
} as const;

/**
 * HTTP headers used by TanStack Start's internal protocols.
 *
 * @example
 * ```ts
 * import { HEADERS } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * console.log(HEADERS.TSS_SHELL) // 'X-TSS_SHELL'
 * ```
 */
export const HEADERS = {
  TSS_SHELL: 'X-TSS_SHELL',
} as const;

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/**
 * No-op replacement for the real `StartServer` component.
 *
 * @param _props - Accepts `{ router }` for type compatibility with the real component.
 * @returns `null` — nothing to render in tests.
 *
 * @example
 * ```tsx
 * import { StartServer } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * const result = StartServer({ router: testRouter })
 * // result === null
 * ```
 */
export const StartServer = (_props: { router: AnyRouter }): null => null;

// ---------------------------------------------------------------------------
// Throwing stubs — server infrastructure that cannot run in tests
// ---------------------------------------------------------------------------

const throwNotAvailable = (name: string): never => {
  throw new Error(`[react-start-testing] ${name}() is not available in tests`);
};

/**
 * Throws — `createStartHandler` requires a full server runtime.
 *
 * @param _cbOrOptions - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { createStartHandler } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => createStartHandler({ handler: () => {} })).toThrow()
 * ```
 */
export const createStartHandler = (_cbOrOptions: HandlerCallback<AnyRouter> | CreateStartHandlerOptions): never => throwNotAvailable('createStartHandler');

/**
 * Throws — `requestHandler` requires a full server runtime.
 *
 * @param _handler - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { requestHandler } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => requestHandler(() => new Response())).toThrow()
 * ```
 */
export const requestHandler = (_handler: (...args: unknown[]) => unknown): never => throwNotAvailable('requestHandler');

/**
 * Throws — `defaultStreamHandler` requires a full server runtime.
 *
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { defaultStreamHandler } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => defaultStreamHandler({} as any)).toThrow()
 * ```
 */
export const defaultStreamHandler: HandlerCallback<AnyRouter> = () => throwNotAvailable('defaultStreamHandler');

/**
 * Throws — `defaultRenderHandler` requires a full server runtime.
 *
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { defaultRenderHandler } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => defaultRenderHandler({} as any)).toThrow()
 * ```
 */
export const defaultRenderHandler: HandlerCallback<AnyRouter> = () => throwNotAvailable('defaultRenderHandler');

/**
 * Throws — `createRequestHandler` requires a full server runtime.
 *
 * @param _opts - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { createRequestHandler } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => createRequestHandler({})).toThrow()
 * ```
 */
export const createRequestHandler = (_opts: unknown): never => throwNotAvailable('createRequestHandler');

/**
 * Identity wrapper — returns the callback unchanged.
 *
 * @param handler - The handler callback to pass through.
 * @returns The same `handler` unchanged.
 *
 * @example
 * ```ts
 * import { defineHandlerCallback } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * const cb = () => new Response()
 * expect(defineHandlerCallback(cb)).toBe(cb)
 * ```
 */
export const defineHandlerCallback = <TRouter extends AnyRouter>(handler: HandlerCallback<TRouter>): HandlerCallback<TRouter> => handler;

/**
 * Throws — `useSession` requires Node crypto and a real request context.
 *
 * @param _config - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { useSession } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => useSession({ password: 'x' })).toThrow()
 * ```
 */
export const useSession = (_config: SessionConfig): never => throwNotAvailable('useSession');

/**
 * Throws — `getSession` requires Node crypto and a real request context.
 *
 * @param _config - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { getSession } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => getSession({ password: 'x' })).toThrow()
 * ```
 */
export const getSession = (_config: SessionConfig): never => throwNotAvailable('getSession');

/**
 * Throws — `updateSession` requires Node crypto and a real request context.
 *
 * @param _config - Ignored; throws immediately.
 * @param _update - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { updateSession } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => updateSession({ password: 'x' })).toThrow()
 * ```
 */
export const updateSession = (_config: SessionConfig, _update?: unknown): never => throwNotAvailable('updateSession');

/**
 * Throws — `sealSession` requires Node crypto.
 *
 * @param _config - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { sealSession } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => sealSession({ password: 'x' })).toThrow()
 * ```
 */
export const sealSession = (_config: SessionConfig): never => throwNotAvailable('sealSession');

/**
 * Throws — `unsealSession` requires Node crypto.
 *
 * @param _config - Ignored; throws immediately.
 * @param _sealed - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { unsealSession } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => unsealSession({ password: 'x' }, 'sealed')).toThrow()
 * ```
 */
export const unsealSession = (_config: SessionConfig, _sealed: string): never => throwNotAvailable('unsealSession');

/**
 * Throws — `clearSession` requires Node crypto and a real request context.
 *
 * @param _config - Ignored; throws immediately.
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { clearSession } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => clearSession({ password: 'x' })).toThrow()
 * ```
 */
export const clearSession = (_config: Partial<SessionConfig>): never => throwNotAvailable('clearSession');

/**
 * Throws — `transformReadableStreamWithRouter` requires a real server runtime.
 *
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { transformReadableStreamWithRouter } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => transformReadableStreamWithRouter({} as any)).toThrow()
 * ```
 */
export const transformReadableStreamWithRouter = (..._args: unknown[]): never => throwNotAvailable('transformReadableStreamWithRouter');

/**
 * Throws — `transformPipeableStreamWithRouter` requires a real server runtime.
 *
 * @returns Never — always throws.
 *
 * @example
 * ```ts
 * import { transformPipeableStreamWithRouter } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(() => transformPipeableStreamWithRouter({} as any)).toThrow()
 * ```
 */
export const transformPipeableStreamWithRouter = (..._args: unknown[]): never => throwNotAvailable('transformPipeableStreamWithRouter');

// ---------------------------------------------------------------------------
// No-op stubs — safe to call in tests, return sensible defaults
// ---------------------------------------------------------------------------

/**
 * No-op — sets up internal SSR utilities. Nothing to do in tests.
 *
 * @param _opts - Ignored.
 *
 * @example
 * ```ts
 * import { attachRouterServerSsrUtils } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * attachRouterServerSsrUtils({}) // no-op
 * ```
 */
export const attachRouterServerSsrUtils = (..._args: unknown[]): void => {};

/**
 * Get the current response status code.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), reads the H3Event's response status.
 * @returns The status code, or `200` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getResponseStatus } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponseStatus()).toBe(200)
 * ```
 */
export const getResponseStatus = (): number => {
  const event = tryGetH3Event();
  if (event) return event.res.status ?? 200;
  return 200;
};

/**
 * Set the response status code.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), mutates the H3Event's response status.
 * @param code - HTTP status code.
 * @param text - HTTP status text.
 *
 * @example
 * ```ts
 * import { setResponseStatus } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setResponseStatus(404, 'Not Found') // no-op outside runtime
 * ```
 */
export const setResponseStatus = (code?: number, text?: string): void => {
  const event = tryGetH3Event();
  if (!event) return;
  if (code !== undefined) event.res.status = code;
  if (text !== undefined) event.res.statusText = text;
};

/**
 * Get the full incoming request URL.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), reads from the H3Event's request.
 * @param _opts - Forwarding options (unused in shim).
 * @returns The request URL, or `http://localhost/` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getRequestUrl } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestUrl().href).toBe('http://localhost/')
 * ```
 */
export const getRequestUrl = (_opts?: { xForwardedHost?: boolean; xForwardedProto?: boolean }): URL => {
  const event = tryGetH3Event();
  if (event) return new URL(event.req.url);
  return new URL('http://localhost/');
};

/**
 * Get the incoming request object.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), returns the H3Event's request.
 * @returns The `Request`, or a minimal localhost request outside a runtime context.
 *
 * @example
 * ```ts
 * import { getRequest } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequest().url).toBe('http://localhost/')
 * ```
 */
export const getRequest = (): Request => {
  const event = tryGetH3Event();
  if (event) return event.req;
  return new Request('http://localhost/');
};

/**
 * Get a single request header by name.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), reads from the H3Event's request headers.
 * @param name - The header name.
 * @returns The header value, or `undefined`.
 *
 * @example
 * ```ts
 * import { getRequestHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestHeader('content-type')).toBeUndefined()
 * ```
 */
export const getRequestHeader = (name: string): string | undefined => {
  const event = tryGetH3Event();
  if (event) return event.req.headers.get(name) ?? undefined;
  return undefined;
};

/**
 * Get all request headers.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), returns the H3Event's request headers as a record.
 * @returns A record of header name-value pairs, or `{}` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getRequestHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestHeaders()).toEqual({})
 * ```
 */
export const getRequestHeaders = (): Record<string, string | undefined> => {
  const event = tryGetH3Event();
  if (event) return Object.fromEntries(event.req.headers);
  return {};
};

/**
 * Get the client IP address.
 *
 * @param _opts - Forwarding options (unused — IP requires server socket info).
 * @returns Always `undefined`.
 *
 * @example
 * ```ts
 * import { getRequestIP } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestIP()).toBeUndefined()
 * ```
 */
export const getRequestIP = (_opts?: { xForwardedFor?: boolean }): string | undefined => undefined;

/**
 * Get the request hostname.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), reads from the H3Event's Host header.
 * @param _opts - Forwarding options (unused in shim).
 * @returns The hostname, or `'localhost'` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getRequestHost } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestHost()).toBe('localhost')
 * ```
 */
export const getRequestHost = (_opts?: { xForwardedHost?: boolean }): string => {
  const event = tryGetH3Event();
  if (event) return event.req.headers.get('host') ?? 'localhost';
  return 'localhost';
};

/**
 * Get the request protocol.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), derives protocol from the request URL.
 * @param _opts - Forwarding options (unused in shim).
 * @returns `'http'` or `'https'`, defaulting to `'http'` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getRequestProtocol } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestProtocol()).toBe('http')
 * ```
 */
export const getRequestProtocol = (_opts?: { xForwardedProto?: boolean }): string => {
  const event = tryGetH3Event();
  if (event) return new URL(event.req.url).protocol.replace(':', '');
  return 'http';
};

/**
 * Get all cookies from the incoming request.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), parses the Cookie header from the H3Event's request.
 * @returns A record of cookie name-value pairs, or `{}` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getCookies } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getCookies()).toEqual({})
 * ```
 */
export const getCookies = (): Record<string, string> => {
  const event = tryGetH3Event();
  if (!event) return {};
  const parsed = parseCookieHeader(event.req.headers.get('cookie') ?? '');
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(parsed)) {
    if (value !== undefined) result[name] = value;
  }
  return result;
};

/**
 * Get a single cookie value by name from the incoming request.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), parses the Cookie header from the H3Event's request.
 * @param name - The cookie name.
 * @returns The cookie value, or `undefined`.
 *
 * @example
 * ```ts
 * import { getCookie } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getCookie('session')).toBeUndefined()
 * ```
 */
export const getCookie = (name: string): string | undefined => getCookies()[name];

/**
 * Set a cookie on the response.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), appends a Set-Cookie header to the H3Event's response.
 * @param name - Cookie name.
 * @param value - Cookie value.
 * @param options - Serialization options from `cookie-es`.
 *
 * @example
 * ```ts
 * import { setCookie } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setCookie('session', 'abc123') // no-op outside runtime
 * ```
 */
export const setCookie = (name: string, value: string, options?: CookieSerializeOptions): void => {
  const event = tryGetH3Event();
  if (!event) return;
  event.res.headers.append('set-cookie', serializeCookie(name, value, options));
};

/**
 * Delete a cookie by setting it to expire immediately.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), appends a Set-Cookie header with `maxAge: 0`.
 * @param name - Cookie name.
 * @param options - Serialization options from `cookie-es`.
 *
 * @example
 * ```ts
 * import { deleteCookie } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * deleteCookie('session') // no-op outside runtime
 * ```
 */
export const deleteCookie = (name: string, options?: CookieSerializeOptions): void => {
  setCookie(name, '', { ...options, maxAge: 0 });
};

/**
 * Get the full response object (status, headers, errHeaders).
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), returns the H3Event's response state.
 * @returns The response shape, or a default `{ status: 200, statusText: 'OK', ... }` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getResponse } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponse().status).toBe(200)
 * ```
 */
export const getResponse = (): { status: number; statusText: string; headers: Headers; errHeaders: Headers } => {
  const event = tryGetH3Event();
  if (event) {
    return {
      status: event.res.status ?? 200,
      statusText: event.res.statusText ?? 'OK',
      headers: event.res.headers,
      errHeaders: event.res.errHeaders,
    };
  }
  return { status: 200, statusText: 'OK', headers: new Headers(), errHeaders: new Headers() };
};

/**
 * Get a single response header by name.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), reads from the H3Event's response headers.
 * @param name - The header name.
 * @returns The header value, or `undefined`.
 *
 * @example
 * ```ts
 * import { getResponseHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponseHeader('x-custom')).toBeUndefined()
 * ```
 */
export const getResponseHeader = (name: string): string | undefined => {
  const event = tryGetH3Event();
  if (event) return event.res.headers.get(name) ?? undefined;
  return undefined;
};

/**
 * Get all response headers.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), returns the H3Event's response headers as a record.
 * @returns A record of header name-value pairs, or `{}` outside a runtime context.
 *
 * @example
 * ```ts
 * import { getResponseHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponseHeaders()).toEqual({})
 * ```
 */
export const getResponseHeaders = (): Record<string, string | undefined> => {
  const event = tryGetH3Event();
  if (event) return Object.fromEntries(event.res.headers);
  return {};
};

/**
 * Set a response header.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), mutates the H3Event's response headers.
 * @param name - Header name.
 * @param value - Header value or array of values.
 *
 * @example
 * ```ts
 * import { setResponseHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setResponseHeader('x-custom', 'value') // no-op outside runtime
 * ```
 */
export const setResponseHeader = (name: string, value: string | string[]): void => {
  const event = tryGetH3Event();
  if (!event) return;
  if (Array.isArray(value)) {
    event.res.headers.delete(name);
    for (const v of value) event.res.headers.append(name, v);
  } else {
    event.res.headers.set(name, value);
  }
};

/**
 * Set multiple response headers.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), mutates the H3Event's response headers.
 * @param headers - Record of header name-value pairs.
 *
 * @example
 * ```ts
 * import { setResponseHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setResponseHeaders({ 'x-custom': 'value' }) // no-op outside runtime
 * ```
 */
export const setResponseHeaders = (headers: Record<string, string | string[] | undefined>): void => {
  const event = tryGetH3Event();
  if (!event) return;
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) setResponseHeader(name, value);
  }
};

/**
 * Remove a response header.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), deletes from the H3Event's response headers.
 * @param name - Header name to remove.
 *
 * @example
 * ```ts
 * import { removeResponseHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * removeResponseHeader('x-custom') // no-op outside runtime
 * ```
 */
export const removeResponseHeader = (name: string): void => {
  const event = tryGetH3Event();
  if (event) event.res.headers.delete(name);
};

/**
 * Clear response headers.
 *
 * @remarks Inside {@link createStartTestRuntime}.run(), clears the H3Event's response headers.
 * @param headerNames - Specific headers to clear; omit to clear all.
 *
 * @example
 * ```ts
 * import { clearResponseHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * clearResponseHeaders() // no-op outside runtime
 * ```
 */
export const clearResponseHeaders = (headerNames?: string[]): void => {
  const event = tryGetH3Event();
  if (!event) return;
  if (headerNames && headerNames.length > 0) {
    for (const name of headerNames) event.res.headers.delete(name);
  } else {
    for (const name of event.res.headers.keys()) event.res.headers.delete(name);
  }
};

/**
 * Returns `undefined` — no request context available for query validation in tests.
 *
 * @param _schema - Ignored.
 * @returns `undefined`
 *
 * @example
 * ```ts
 * import { getValidatedQuery } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * const result = await getValidatedQuery(mySchema)
 * expect(result).toBeUndefined()
 * ```
 */
export const getValidatedQuery = (_schema: unknown): undefined => undefined;
