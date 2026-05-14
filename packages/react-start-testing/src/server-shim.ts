import type { AnyRouter } from '@tanstack/router-core';
import type { HandlerCallback } from '@tanstack/router-core/ssr/server';
import type { CreateStartHandlerOptions, SessionConfig } from '@tanstack/start-server-core';

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
export function StartServer(_props: { router: AnyRouter }): null {
  return null;
}

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
export function createStartHandler(_cbOrOptions: HandlerCallback<AnyRouter> | CreateStartHandlerOptions): never {
  throwNotAvailable('createStartHandler');
}

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
export function requestHandler(_handler: (...args: any[]) => any): never {
  throwNotAvailable('requestHandler');
}

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
export const defaultStreamHandler: HandlerCallback<AnyRouter> = () => {
  throwNotAvailable('defaultStreamHandler');
};

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
export const defaultRenderHandler: HandlerCallback<AnyRouter> = () => {
  throwNotAvailable('defaultRenderHandler');
};

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
export function createRequestHandler(_opts: any): never {
  throwNotAvailable('createRequestHandler');
}

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
export function defineHandlerCallback<TRouter extends AnyRouter>(handler: HandlerCallback<TRouter>): HandlerCallback<TRouter> {
  return handler;
}

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
 * await expect(useSession({ password: 'x' })).rejects.toThrow()
 * ```
 */
export async function useSession(_config: SessionConfig): Promise<never> {
  throwNotAvailable('useSession');
}

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
 * await expect(getSession({ password: 'x' })).rejects.toThrow()
 * ```
 */
export async function getSession(_config: SessionConfig): Promise<never> {
  throwNotAvailable('getSession');
}

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
 * await expect(updateSession({ password: 'x' })).rejects.toThrow()
 * ```
 */
export async function updateSession(_config: SessionConfig, _update?: unknown): Promise<never> {
  throwNotAvailable('updateSession');
}

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
 * await expect(sealSession({ password: 'x' })).rejects.toThrow()
 * ```
 */
export async function sealSession(_config: SessionConfig): Promise<never> {
  throwNotAvailable('sealSession');
}

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
 * await expect(unsealSession({ password: 'x' }, 'sealed')).rejects.toThrow()
 * ```
 */
export async function unsealSession(_config: SessionConfig, _sealed: string): Promise<never> {
  throwNotAvailable('unsealSession');
}

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
 * await expect(clearSession({ password: 'x' })).rejects.toThrow()
 * ```
 */
export async function clearSession(_config: Partial<SessionConfig>): Promise<never> {
  throwNotAvailable('clearSession');
}

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
export function transformReadableStreamWithRouter(..._args: any[]): never {
  throwNotAvailable('transformReadableStreamWithRouter');
}

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
export function transformPipeableStreamWithRouter(..._args: any[]): never {
  throwNotAvailable('transformPipeableStreamWithRouter');
}

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
export function attachRouterServerSsrUtils(..._args: any[]): void {}

/**
 * Returns `200` — the default HTTP status code.
 *
 * @returns `200`
 *
 * @example
 * ```ts
 * import { getResponseStatus } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponseStatus()).toBe(200)
 * ```
 */
export function getResponseStatus(): number {
  return 200;
}

/**
 * No-op — sets the response status code. Does nothing in tests.
 *
 * @param _code - Ignored.
 * @param _text - Ignored.
 *
 * @example
 * ```ts
 * import { setResponseStatus } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setResponseStatus(404, 'Not Found') // no-op
 * ```
 */
export function setResponseStatus(_code?: number, _text?: string): void {}

/**
 * Returns a localhost URL — no real request context in tests.
 *
 * @param _opts - Ignored.
 * @returns `new URL('http://localhost/')`
 *
 * @example
 * ```ts
 * import { getRequestUrl } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestUrl().href).toBe('http://localhost/')
 * ```
 */
export function getRequestUrl(_opts?: { xForwardedFor?: boolean }): URL {
  return new URL('http://localhost/');
}

/**
 * Returns a minimal `Request` pointing at localhost.
 *
 * @returns `new Request('http://localhost/')`
 *
 * @example
 * ```ts
 * import { getRequest } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequest().url).toBe('http://localhost/')
 * ```
 */
export function getRequest(): Request {
  return new Request('http://localhost/');
}

/**
 * Returns `undefined` — no request headers available in tests.
 *
 * @param _name - Ignored.
 * @returns `undefined`
 *
 * @example
 * ```ts
 * import { getRequestHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestHeader('content-type')).toBeUndefined()
 * ```
 */
export function getRequestHeader(_name: string): string | undefined {
  return undefined;
}

/**
 * Returns an empty object — no request headers available in tests.
 *
 * @returns `{}`
 *
 * @example
 * ```ts
 * import { getRequestHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestHeaders()).toEqual({})
 * ```
 */
export function getRequestHeaders(): Record<string, string | undefined> {
  return {};
}

/**
 * Returns `undefined` — no client IP available in tests.
 *
 * @param _opts - Ignored.
 * @returns `undefined`
 *
 * @example
 * ```ts
 * import { getRequestIP } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestIP()).toBeUndefined()
 * ```
 */
export function getRequestIP(_opts?: { xForwardedFor?: boolean }): string | undefined {
  return undefined;
}

/**
 * Returns `'localhost'`.
 *
 * @param _opts - Ignored.
 * @returns `'localhost'`
 *
 * @example
 * ```ts
 * import { getRequestHost } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestHost()).toBe('localhost')
 * ```
 */
export function getRequestHost(_opts?: { xForwardedFor?: boolean }): string {
  return 'localhost';
}

/**
 * Returns `'http'`.
 *
 * @param _opts - Ignored.
 * @returns `'http'`
 *
 * @example
 * ```ts
 * import { getRequestProtocol } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getRequestProtocol()).toBe('http')
 * ```
 */
export function getRequestProtocol(_opts?: { xForwardedFor?: boolean }): string {
  return 'http';
}

/**
 * Returns `undefined` — no cookies available in tests.
 *
 * @param _name - Ignored.
 * @returns `undefined`
 *
 * @example
 * ```ts
 * import { getCookie } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getCookie('session')).toBeUndefined()
 * ```
 */
export function getCookie(_name: string): string | undefined {
  return undefined;
}

/**
 * Returns an empty object — no cookies available in tests.
 *
 * @returns `{}`
 *
 * @example
 * ```ts
 * import { getCookies } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getCookies()).toEqual({})
 * ```
 */
export function getCookies(): Record<string, string> {
  return {};
}

/**
 * No-op — sets a cookie. Does nothing in tests.
 *
 * @param _name - Ignored.
 * @param _value - Ignored.
 * @param _options - Ignored.
 *
 * @example
 * ```ts
 * import { setCookie } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setCookie('session', 'abc123') // no-op
 * ```
 */
export function setCookie(_name: string, _value: string, _options?: Record<string, unknown>): void {}

/**
 * No-op — deletes a cookie. Does nothing in tests.
 *
 * @param _name - Ignored.
 * @param _options - Ignored.
 *
 * @example
 * ```ts
 * import { deleteCookie } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * deleteCookie('session') // no-op
 * ```
 */
export function deleteCookie(_name: string, _options?: Record<string, unknown>): void {}

/**
 * Returns a default response shape with status 200.
 *
 * @returns `{ status: 200, statusText: 'OK', headers: new Headers(), errHeaders: new Headers() }`
 *
 * @example
 * ```ts
 * import { getResponse } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponse().status).toBe(200)
 * ```
 */
export function getResponse(): { status: number; statusText: string; headers: Headers; errHeaders: Headers } {
  return { status: 200, statusText: 'OK', headers: new Headers(), errHeaders: new Headers() };
}

/**
 * Returns `undefined` — no response headers set in tests.
 *
 * @param _name - Ignored.
 * @returns `undefined`
 *
 * @example
 * ```ts
 * import { getResponseHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponseHeader('x-custom')).toBeUndefined()
 * ```
 */
export function getResponseHeader(_name: string): string | undefined {
  return undefined;
}

/**
 * Returns an empty object — no response headers set in tests.
 *
 * @returns `{}`
 *
 * @example
 * ```ts
 * import { getResponseHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * expect(getResponseHeaders()).toEqual({})
 * ```
 */
export function getResponseHeaders(): Record<string, string | undefined> {
  return {};
}

/**
 * No-op — sets a response header. Does nothing in tests.
 *
 * @param _name - Ignored.
 * @param _value - Ignored.
 *
 * @example
 * ```ts
 * import { setResponseHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setResponseHeader('x-custom', 'value') // no-op
 * ```
 */
export function setResponseHeader(_name: string, _value: string | string[]): void {}

/**
 * No-op — sets multiple response headers. Does nothing in tests.
 *
 * @param _headers - Ignored.
 *
 * @example
 * ```ts
 * import { setResponseHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * setResponseHeaders({ 'x-custom': 'value' }) // no-op
 * ```
 */
export function setResponseHeaders(_headers: Record<string, string | string[] | undefined>): void {}

/**
 * No-op — removes a response header. Does nothing in tests.
 *
 * @param _name - Ignored.
 *
 * @example
 * ```ts
 * import { removeResponseHeader } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * removeResponseHeader('x-custom') // no-op
 * ```
 */
export function removeResponseHeader(_name: string): void {}

/**
 * No-op — clears response headers. Does nothing in tests.
 *
 * @param _headerNames - Ignored.
 *
 * @example
 * ```ts
 * import { clearResponseHeaders } from '@tanstack-router-testing/react-start-testing/server-shim'
 *
 * clearResponseHeaders() // no-op
 * ```
 */
export function clearResponseHeaders(_headerNames?: string[]): void {}

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
export async function getValidatedQuery(_schema: unknown): Promise<undefined> {
  return undefined;
}
