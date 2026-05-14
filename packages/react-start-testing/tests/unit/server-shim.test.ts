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
    expect(() => {
      setResponseStatus(404, 'Not Found');
    }).not.toThrow();
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
    expect(getRequestHeaders()).toStrictEqual({});
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
    expect(getCookies()).toStrictEqual({});
  });

  it('setCookie does not throw', () => {
    expect(() => {
      setCookie('key', 'val');
    }).not.toThrow();
  });

  it('deleteCookie does not throw', () => {
    expect(() => {
      deleteCookie('key');
    }).not.toThrow();
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
    expect(getResponseHeaders()).toStrictEqual({});
  });

  it('setResponseHeader does not throw', () => {
    expect(() => {
      setResponseHeader('x-custom', 'value');
    }).not.toThrow();
  });

  it('setResponseHeaders does not throw', () => {
    expect(() => {
      setResponseHeaders({ 'x-custom': 'value' });
    }).not.toThrow();
  });

  it('removeResponseHeader does not throw', () => {
    expect(() => {
      removeResponseHeader('x-custom');
    }).not.toThrow();
  });

  it('clearResponseHeaders does not throw', () => {
    expect(() => {
      clearResponseHeaders();
    }).not.toThrow();
  });

  it('getValidatedQuery returns undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- stub intentionally returns undefined
    expect(getValidatedQuery({})).toBeUndefined();
  });

  it('attachRouterServerSsrUtils does not throw', () => {
    expect(() => {
      attachRouterServerSsrUtils({});
    }).not.toThrow();
  });
});

describe('server-shim throwing stubs', () => {
  it.each([
    ['createStartHandler', () => createStartHandler({} as never)],
    ['requestHandler', () => requestHandler(() => new Response())],
    ['defaultStreamHandler', () => defaultStreamHandler({} as never)],
    ['defaultRenderHandler', () => defaultRenderHandler({} as never)],
    ['createRequestHandler', () => createRequestHandler({})],
    ['transformReadableStreamWithRouter', () => transformReadableStreamWithRouter()],
    ['transformPipeableStreamWithRouter', () => transformPipeableStreamWithRouter()],
    ['useSession', () => useSession({ password: 'x' })],
    ['getSession', () => getSession({ password: 'x' })],
    ['updateSession', () => updateSession({ password: 'x' })],
    ['sealSession', () => sealSession({ password: 'x' })],
    ['unsealSession', () => unsealSession({ password: 'x' }, 'sealed')],
    ['clearSession', () => clearSession({ password: 'x' })],
  ] as const)('%s throws with descriptive message', (name, fn) => {
    expect(fn).toThrow(`[react-start-testing] ${name}() is not available in tests`);
  });
});

describe('server-shim identity wrappers', () => {
  it('defineHandlerCallback returns the same callback', () => {
    const cb = (() => new Response()) as never;
    expect(defineHandlerCallback(cb)).toBe(cb);
  });
});

describe('server-shim constants', () => {
  it('exports expected virtual module IDs', () => {
    expect(VIRTUAL_MODULES).toStrictEqual({
      startManifest: 'tanstack-start-manifest:v',
      injectedHeadScripts: 'tanstack-start-injected-head-scripts:v',
      serverFnResolver: '#tanstack-start-server-fn-resolver',
      pluginAdapters: '#tanstack-start-plugin-adapters',
    });
  });

  it('exports expected header constants', () => {
    expect(HEADERS).toStrictEqual({ TSS_SHELL: 'X-TSS_SHELL' });
  });
});

describe('server-shim StartServer component', () => {
  it('returns null', () => {
    expect(StartServer({ router: {} as never })).toBeNull();
  });
});
