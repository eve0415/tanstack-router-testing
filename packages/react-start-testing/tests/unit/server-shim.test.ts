// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  HEADERS,
  StartServer,
  VIRTUAL_MODULES,
  attachRouterServerSsrUtils,
  clearResponseHeaders,
  clearSession,
  createRequestHandler,
  createStartHandler,
  defaultRenderHandler,
  defaultStreamHandler,
  defineHandlerCallback,
  deleteCookie,
  getCookie,
  getCookies,
  getRequest,
  getRequestHeader,
  getRequestHeaders,
  getRequestHost,
  getRequestIP,
  getRequestProtocol,
  getRequestUrl,
  getResponse,
  getResponseHeader,
  getResponseHeaders,
  getResponseStatus,
  getSession,
  getValidatedQuery,
  removeResponseHeader,
  requestHandler,
  sealSession,
  setCookie,
  setResponseHeader,
  setResponseHeaders,
  setResponseStatus,
  transformPipeableStreamWithRouter,
  transformReadableStreamWithRouter,
  unsealSession,
  updateSession,
  useSession,
} from '../../src/server-shim.ts';

describe('server-shim no-op stubs', () => {
  it('getResponseStatus returns 200', () => {
    expect(getResponseStatus()).toBe(200);
  });

  it('setResponseStatus does not throw', () => {
    expect(() => setResponseStatus(404, 'Not Found')).not.toThrow();
  });

  it('getRequestUrl returns a localhost URL', () => {
    const url = getRequestUrl();
    expect(url).toBeInstanceOf(URL);
    expect(url.href).toBe('http://localhost/');
  });

  it('getRequest returns a Request pointing at localhost', () => {
    const req = getRequest();
    expect(req).toBeInstanceOf(Request);
    expect(req.url).toBe('http://localhost/');
  });

  it('getRequestHeader returns undefined', () => {
    expect(getRequestHeader('content-type')).toBeUndefined();
  });

  it('getRequestHeaders returns empty object', () => {
    expect(getRequestHeaders()).toEqual({});
  });

  it('getRequestIP returns undefined', () => {
    expect(getRequestIP()).toBeUndefined();
  });

  it('getRequestHost returns localhost', () => {
    expect(getRequestHost()).toBe('localhost');
  });

  it('getRequestProtocol returns http', () => {
    expect(getRequestProtocol()).toBe('http');
  });

  it('getCookie returns undefined', () => {
    expect(getCookie('session')).toBeUndefined();
  });

  it('getCookies returns empty object', () => {
    expect(getCookies()).toEqual({});
  });

  it('setCookie does not throw', () => {
    expect(() => setCookie('key', 'val')).not.toThrow();
  });

  it('deleteCookie does not throw', () => {
    expect(() => deleteCookie('key')).not.toThrow();
  });

  it('getResponse returns default shape', () => {
    const res = getResponse();
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.headers).toBeInstanceOf(Headers);
    expect(res.errHeaders).toBeInstanceOf(Headers);
  });

  it('getResponseHeader returns undefined', () => {
    expect(getResponseHeader('x-custom')).toBeUndefined();
  });

  it('getResponseHeaders returns empty object', () => {
    expect(getResponseHeaders()).toEqual({});
  });

  it('setResponseHeader does not throw', () => {
    expect(() => setResponseHeader('x-custom', 'value')).not.toThrow();
  });

  it('setResponseHeaders does not throw', () => {
    expect(() => setResponseHeaders({ 'x-custom': 'value' })).not.toThrow();
  });

  it('removeResponseHeader does not throw', () => {
    expect(() => removeResponseHeader('x-custom')).not.toThrow();
  });

  it('clearResponseHeaders does not throw', () => {
    expect(() => clearResponseHeaders()).not.toThrow();
  });

  it('getValidatedQuery returns undefined', async () => {
    expect(await getValidatedQuery({})).toBeUndefined();
  });

  it('attachRouterServerSsrUtils does not throw', () => {
    expect(() => attachRouterServerSsrUtils({})).not.toThrow();
  });
});

describe('server-shim throwing stubs', () => {
  const throwingFns = [
    ['createStartHandler', () => createStartHandler({} as any)],
    ['requestHandler', () => requestHandler(() => new Response())],
    ['defaultStreamHandler', () => defaultStreamHandler({} as any)],
    ['defaultRenderHandler', () => defaultRenderHandler({} as any)],
    ['createRequestHandler', () => createRequestHandler({})],
    ['transformReadableStreamWithRouter', () => transformReadableStreamWithRouter()],
    ['transformPipeableStreamWithRouter', () => transformPipeableStreamWithRouter()],
  ] as const;

  for (const [name, fn] of throwingFns) {
    it(`${name} throws with descriptive message`, () => {
      expect(fn).toThrow(`[react-start-testing] ${name}() is not available in tests`);
    });
  }

  const asyncThrowingFns = [
    ['useSession', () => useSession({ password: 'x' })],
    ['getSession', () => getSession({ password: 'x' })],
    ['updateSession', () => updateSession({ password: 'x' })],
    ['sealSession', () => sealSession({ password: 'x' })],
    ['unsealSession', () => unsealSession({ password: 'x' }, 'sealed')],
    ['clearSession', () => clearSession({ password: 'x' })],
  ] as const;

  for (const [name, fn] of asyncThrowingFns) {
    it(`${name} throws with descriptive message`, async () => {
      await expect(fn()).rejects.toThrow(`[react-start-testing] ${name}() is not available in tests`);
    });
  }
});

describe('server-shim identity wrappers', () => {
  it('defineHandlerCallback returns the same callback', () => {
    const cb = (() => new Response()) as any;
    expect(defineHandlerCallback(cb)).toBe(cb);
  });
});

describe('server-shim constants', () => {
  it('VIRTUAL_MODULES has expected keys', () => {
    expect(VIRTUAL_MODULES).toEqual({
      startManifest: 'tanstack-start-manifest:v',
      injectedHeadScripts: 'tanstack-start-injected-head-scripts:v',
      serverFnResolver: '#tanstack-start-server-fn-resolver',
      pluginAdapters: '#tanstack-start-plugin-adapters',
    });
  });

  it('HEADERS has TSS_SHELL', () => {
    expect(HEADERS).toEqual({ TSS_SHELL: 'X-TSS_SHELL' });
  });
});

describe('server-shim StartServer component', () => {
  it('returns null', () => {
    expect(StartServer({ router: {} as any })).toBeNull();
  });
});
