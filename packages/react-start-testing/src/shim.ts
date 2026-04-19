import type {
  AnyFunctionMiddleware,
  AnyRequestMiddleware,
  AnyStartInstanceOptions,
  CompiledFetcherFnOptions,
  CustomFetch,
  FunctionMiddlewareServerFnResult,
  Method,
  MiddlewareFn,
  NextFn,
  ServerFn,
  ServerFnBaseOptions,
  ServerFnBuilder,
  ServerFnMiddlewareOptions,
  ServerFnMiddlewareResult,
  createMiddleware as upstreamCreateMiddleware,
  createServerFn as upstreamCreateServerFn,
  createStart as upstreamCreateStart,
} from '@tanstack/start-client-core';
import type { ClientFnMeta, ServerFnMeta } from '@tanstack/start-client-core';
import type { ClientOnlyFn, IsomorphicFn, IsomorphicFnBase, ServerOnlyFn } from '@tanstack/start-fn-stubs';

import { getEnv, getMiddlewareEntry, getServerFnEntry, registerMiddleware, registerServerFn, runInEnv } from '@tanstack-router-testing/router-testing-core';
import { isRedirect, useRouter } from '@tanstack/react-router';
import { parseRedirect } from '@tanstack/router-core';
import { mergeHeaders } from '@tanstack/router-core/ssr/client';
import { TSS_SERVER_FUNCTION, createNullProtoObject, execValidator, flattenMiddlewares, safeObjectMerge } from '@tanstack/start-client-core';
import { getStartContext } from '@tanstack/start-storage-context';
import * as React from 'react';

export * from '@tanstack/start-client-core';

type AnyFn = (...args: any[]) => any;
type MiddlewareType = 'request' | 'function';
type CreateServerFnShim = typeof upstreamCreateServerFn;
type CreateMiddlewareShim = typeof upstreamCreateMiddleware;
interface ServerExecutionResult {
  result?: unknown;
  error?: unknown;
  context?: unknown;
}
type TestServerFnMiddlewareResult = ServerFnMiddlewareResult & {
  _callSiteFetch?: CustomFetch;
};
type GlobalWithStartOptions = typeof globalThis & {
  __TSS_START_OPTIONS__?: AnyStartInstanceOptions | undefined;
  window?: Window & {
    __TSS_START_OPTIONS__?: AnyStartInstanceOptions | undefined;
  };
};

let serverFnId = 0;
const TSS_SERVER_FUNCTION_FACTORY = Symbol.for('TSS_SERVER_FUNCTION_FACTORY');

const currentEnv = (): 'client' | 'server' => {
  const env = getEnv();
  if (env) return env;
  return globalThis.window === undefined ? 'server' : 'client';
};

const setStartOptions = (options: AnyStartInstanceOptions): void => {
  const global = globalThis as GlobalWithStartOptions;
  global.__TSS_START_OPTIONS__ = options;
  if (global.window) {
    global.window.__TSS_START_OPTIONS__ = options;
  }
};

const getStartOptions = (): AnyStartInstanceOptions | undefined => {
  const startContext = getStartContext({ throwIfNotFound: false });
  if (startContext?.startOptions) return startContext.startOptions as AnyStartInstanceOptions;

  const global = globalThis as GlobalWithStartOptions;
  return global.window?.__TSS_START_OPTIONS__ ?? global.__TSS_START_OPTIONS__;
};

export const __setStartOptionsForTesting = (options: AnyStartInstanceOptions): void => {
  setStartOptions(options);
};

const toPromise = async <T>(value: T | Promise<T>): Promise<T> => value;

const executeMiddleware = async (
  middlewares: (AnyFunctionMiddleware | AnyRequestMiddleware)[],
  env: 'client' | 'server',
  opts: ServerFnMiddlewareOptions,
): Promise<ServerFnMiddlewareResult> => {
  const globalMiddlewares = (getStartOptions()?.functionMiddleware ?? []) as (AnyFunctionMiddleware | AnyRequestMiddleware)[];
  let flattenedMiddlewares = flattenMiddlewares([...globalMiddlewares, ...middlewares]);

  if (env === 'server') {
    const startContext = getStartContext({ throwIfNotFound: false });
    if (startContext?.executedRequestMiddlewares) {
      flattenedMiddlewares = flattenedMiddlewares.filter(middleware => !startContext.executedRequestMiddlewares.has(middleware));
    }
  }

  const callNextMiddleware: NextFn = async ctx => {
    const nextMiddleware = flattenedMiddlewares.shift();
    if (!nextMiddleware) return ctx;

    try {
      const middlewareOptions = nextMiddleware.options as { readonly type?: MiddlewareType; readonly server?: unknown };

      if (env === 'server' && middlewareOptions.type === 'request') {
        const requestMiddleware = middlewareOptions.server as AnyFn | undefined;
        if (!requestMiddleware) {
          return await callNextMiddleware(ctx);
        }

        const request = getRequestFromContext(ctx);
        const pathname = getPathnameFromRequest(request);
        const startContext = getStartContext({ throwIfNotFound: false });
        startContext?.executedRequestMiddlewares.add(nextMiddleware);

        const requestNext = async (userCtx: { readonly context?: unknown } | undefined = {}) => {
          const nextCtx = {
            ...ctx,
            request,
            pathname,
            context: safeObjectMerge(toOptionalRecord(ctx.context), toOptionalRecord(userCtx.context)),
          };
          const result = await callNextMiddleware(nextCtx as ServerFnMiddlewareResult);
          if (result.error) throw result.error;

          return {
            request,
            pathname,
            context: result.context,
            response: result.result instanceof Response ? result.result : new Response(null),
          };
        };

        const result = await requestMiddleware({
          request,
          pathname,
          context: ctx.context,
          serverFnMeta: ctx.serverFnMeta,
          next: requestNext,
        });

        if (result instanceof Response) {
          return { ...ctx, result };
        }

        return {
          ...ctx,
          request,
          pathname,
          context: safeObjectMerge(toOptionalRecord(ctx.context), toOptionalRecord((result as { readonly context?: unknown } | undefined)?.context)),
          result: (result as { readonly response?: Response } | undefined)?.response ?? ctx.result,
        };
      }

      if ('inputValidator' in nextMiddleware.options && nextMiddleware.options.inputValidator && env === 'server') {
        ctx.data = await execValidator(nextMiddleware.options.inputValidator, ctx.data);
      }

      let middlewareFn: MiddlewareFn | undefined;
      if (env === 'client' && 'client' in nextMiddleware.options) {
        middlewareFn = nextMiddleware.options.client as unknown as MiddlewareFn | undefined;
      } else if (env === 'server' && 'server' in nextMiddleware.options) {
        middlewareFn = nextMiddleware.options.server as unknown as MiddlewareFn | undefined;
      }

      if (!middlewareFn) {
        return await callNextMiddleware(ctx);
      }

      const userNext = async (userCtx: TestServerFnMiddlewareResult | undefined = {} as TestServerFnMiddlewareResult) => {
        const callCtx = ctx as TestServerFnMiddlewareResult;
        const nextCtx = {
          ...ctx,
          ...userCtx,
          context: safeObjectMerge(ctx.context, userCtx.context),
          sendContext: safeObjectMerge(ctx.sendContext, userCtx.sendContext),
          headers: mergeHeaders(ctx.headers, userCtx.headers),
          _callSiteFetch: callCtx._callSiteFetch,
          fetch: callCtx._callSiteFetch ?? userCtx.fetch ?? ctx.fetch,
          result: userCtx.result !== undefined ? userCtx.result : userCtx instanceof Response ? userCtx : ctx.result,
          error: userCtx.error ?? ctx.error,
        };

        const result = await callNextMiddleware(nextCtx as ServerFnMiddlewareResult);
        if (result.error) throw result.error;
        return result;
      };

      const result = await middlewareFn({
        ...ctx,
        next: userNext,
      });

      if (isRedirect(result)) {
        return { ...ctx, error: result };
      }

      if (result instanceof Response) {
        return { ...ctx, result };
      }

      if (!result) {
        throw new Error('User middleware returned undefined. You must call next() or return a result in your middlewares.');
      }

      return result;
    } catch (error) {
      return { ...ctx, error };
    }
  };

  return callNextMiddleware({
    ...opts,
    headers: opts.headers ?? {},
    sendContext: opts.sendContext ?? {},
    context: opts.context ?? createNullProtoObject(),
    _callSiteFetch: opts.fetch,
  } as ServerFnMiddlewareResult);
};

const getRequestFromContext = (ctx: ServerFnMiddlewareOptions): Request => {
  const existing = (ctx as ServerFnMiddlewareOptions & { readonly request?: Request }).request;
  if (existing) return existing;

  const startContext = getStartContext({ throwIfNotFound: false });
  return startContext?.request ?? new Request('http://tanstack-router-testing.test/');
};

const getPathnameFromRequest = (request: Request): string => new URL(request.url).pathname;

const toOptionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const createServerFnMiddleware = (options: ServerFnBaseOptions<any, any, any, any, any>, getFetcher: () => AnyFn): AnyFunctionMiddleware =>
  ({
    '~types': undefined,
    options: {
      inputValidator: options.inputValidator,
      client: async ({ next, sendContext, fetch, ...ctx }: ServerFnMiddlewareOptions & { next: NextFn }) => {
        const payload = {
          ...ctx,
          context: sendContext,
          fetch,
        };
        const res = await options.extractedFn?.(payload as CompiledFetcherFnOptions & ServerFnBaseOptions<any, Method>);
        return next(res as ServerFnMiddlewareResult);
      },
      server: async ({ next, ...ctx }: ServerFnMiddlewareOptions & { next: NextFn }) => {
        const fetcher = getFetcher();
        const entry = getServerFnEntry(fetcher);
        const impl = (entry?.mock ?? entry?.original ?? options.serverFn) as ServerFn<any, any, any, any, any> | undefined;
        const result = await impl?.(ctx as never);

        return next({
          ...ctx,
          result,
        } as ServerFnMiddlewareResult) as unknown as FunctionMiddlewareServerFnResult<any, any, any, any, any>;
      },
    },
  }) as unknown as AnyFunctionMiddleware;

const createServerMeta = (): ServerFnMeta => {
  serverFnId += 1;
  const id = `tanstack-router-testing:${serverFnId}`;
  return {
    id,
    name: id,
    filename: 'tanstack-router-testing://server-fn',
  };
};

const normalizeDataOptions = (opts?: Partial<CompiledFetcherFnOptions>): Partial<CompiledFetcherFnOptions> => opts ?? {};

export const createServerFn: CreateServerFnShim = ((
  options: { method?: Method } | undefined,
  __opts: ServerFnBaseOptions<any, Method, any, any, any> | undefined,
) => {
  const resolvedOptions = { ...(__opts ?? options) } as ServerFnBaseOptions<any, Method, any, any, any>;
  resolvedOptions.method ??= 'GET';

  const makeBuilder = (nextOptions: ServerFnBaseOptions<any, Method, any, any, any>): ServerFnBuilder<any, Method> => {
    const builder = ((newOptions?: { method?: Method }) =>
      createServerFn(undefined, {
        ...nextOptions,
        ...newOptions,
      })) as ServerFnBuilder<any, Method> & ((newOptions?: { method?: Method }) => ServerFnBuilder<any, Method>);

    Object.assign(builder, {
      '~types': undefined,
      [TSS_SERVER_FUNCTION_FACTORY]: true,
      options: nextOptions,
      middleware: (middlewares: readonly (AnyFunctionMiddleware | AnyRequestMiddleware | ServerFnBuilder<any, Method>)[]) => {
        const newMiddleware = [...((nextOptions.middleware as (AnyFunctionMiddleware | AnyRequestMiddleware)[]) || [])];
        for (const middleware of middlewares) {
          if (middleware && TSS_SERVER_FUNCTION_FACTORY in middleware && middleware.options.middleware) {
            newMiddleware.push(...(middleware.options.middleware as (AnyFunctionMiddleware | AnyRequestMiddleware)[]));
          } else {
            newMiddleware.push(middleware as AnyFunctionMiddleware | AnyRequestMiddleware);
          }
        }
        const res = createServerFn(undefined, {
          ...nextOptions,
          middleware: newMiddleware,
        }) as ServerFnBuilder<any, Method>;
        (res as unknown as Record<symbol, unknown>)[TSS_SERVER_FUNCTION_FACTORY] = true;
        return res;
      },
      inputValidator: (inputValidator: unknown) =>
        createServerFn(undefined, {
          ...nextOptions,
          inputValidator,
        }),
      handler: (...args: unknown[]) => {
        const extractedFromTransform = args.length > 1 ? (args[0] as AnyFn) : undefined;
        const serverFn = (args.length > 1 ? args[1] : args[0]) as ServerFn<any, Method, any, any, any>;
        const serverFnMeta = createServerMeta();
        const clientMeta: ClientFnMeta = { id: serverFnMeta.id };
        let fetcher: AnyFn;
        let resolvedMiddleware: (AnyFunctionMiddleware | AnyRequestMiddleware)[] = [];

        const executeServer = async (opts?: Partial<CompiledFetcherFnOptions> & { request?: Request }): Promise<ServerExecutionResult> => {
          const callOpts = normalizeDataOptions(opts) as Partial<CompiledFetcherFnOptions> & { request?: Request };
          const startContext = getStartContext({ throwIfNotFound: false });
          const request = callOpts.request ?? startContext?.request ?? new Request('http://tanstack-router-testing.test/_serverFn');
          const result: ServerFnMiddlewareResult = await runInEnv('server', () =>
            executeMiddleware(resolvedMiddleware, 'server', {
              ...callOpts,
              data: callOpts.data,
              method: nextOptions.method,
              serverFnMeta,
              signal: callOpts.signal ?? new AbortController().signal,
              context: safeObjectMerge(callOpts.context ?? createNullProtoObject(), startContext?.contextAfterGlobalMiddlewares),
              request,
              pathname: getPathnameFromRequest(request),
            } as ServerFnMiddlewareOptions),
          );

          return {
            result: result.result,
            error: result.error,
            context: result.sendContext,
          };
        };

        const extractedFn = Object.assign(
          async (opts?: CompiledFetcherFnOptions & ServerFnBaseOptions<any, Method>): Promise<unknown> => {
            if (extractedFromTransform) {
              return await extractedFromTransform(opts);
            }
            return await executeServer(opts);
          },
          {
            url: `/_serverFn/${serverFnMeta.id}`,
            serverFnMeta,
          },
        );

        const handlerOptions = {
          ...nextOptions,
          extractedFn,
          serverFn,
        };
        resolvedMiddleware = [
          ...((handlerOptions.middleware ?? []) as (AnyFunctionMiddleware | AnyRequestMiddleware)[]),
          createServerFnMiddleware(handlerOptions, () => fetcher),
        ];

        fetcher = Object.assign(
          async (opts?: Partial<CompiledFetcherFnOptions>): Promise<unknown> => {
            const callOpts = normalizeDataOptions(opts);
            if (currentEnv() === 'server') {
              const result = await executeServer(callOpts);
              const redirect = parseRedirect(result.error);
              if (redirect) throw redirect;
              if (result.error) throw result.error;
              return result.result;
            }

            const result = await runInEnv('client', () =>
              executeMiddleware(resolvedMiddleware, 'client', {
                ...extractedFn,
                ...handlerOptions,
                data: callOpts.data,
                headers: callOpts.headers,
                signal: callOpts.signal ?? new AbortController().signal,
                fetch: callOpts.fetch ?? getStartOptions()?.serverFns?.fetch,
                context: createNullProtoObject(),
                serverFnMeta: clientMeta,
              } as ServerFnMiddlewareOptions),
            );

            const redirect = parseRedirect(result.error);
            if (redirect) throw redirect;
            if (result.error) throw result.error;
            return result.result;
          },
          {
            ...extractedFn,
            [TSS_SERVER_FUNCTION]: true,
            method: nextOptions.method,
            __executeServer: executeServer,
          },
        );

        registerServerFn(fetcher, serverFn as unknown as AnyFn);
        return fetcher;
      },
    });

    return builder;
  };

  return makeBuilder(resolvedOptions);
}) as CreateServerFnShim;

const createPhaseWrapper =
  (mw: object, phase: 'client' | 'server'): AnyFn =>
  async (ctx: unknown) => {
    const entry = getMiddlewareEntry(mw);
    const impl = phase === 'client' ? (entry?.mockClient ?? entry?.originalClient) : (entry?.mockServer ?? entry?.originalServer);
    if (!impl) return (ctx as { next?: AnyFn }).next?.();
    return impl(ctx as never);
  };

export const createMiddleware: CreateMiddlewareShim = ((options: { type?: MiddlewareType } | undefined, __opts: Record<string, unknown> | undefined) => {
  const makeBuilder = (resolvedOptions: Record<string, unknown>) => {
    const mw: Record<string, unknown> = {};
    const originalClient = resolvedOptions.client as AnyFn | undefined;
    const originalServer = resolvedOptions.server as AnyFn | undefined;
    const optionsWithWrappedPhases = {
      ...resolvedOptions,
      ...(originalClient ? { client: createPhaseWrapper(mw, 'client') } : {}),
      ...(originalServer ? { server: createPhaseWrapper(mw, 'server') } : {}),
    };

    Object.assign(mw, {
      '~types': undefined,
      options: optionsWithWrappedPhases,
      middleware: (middlewares: unknown) =>
        createMiddleware(
          {} as never,
          {
            ...resolvedOptions,
            middleware: middlewares,
          } as never,
        ),
      inputValidator: (inputValidator: unknown) =>
        createMiddleware(
          {} as never,
          {
            ...resolvedOptions,
            inputValidator,
          } as never,
        ),
      client: (client: AnyFn) =>
        createMiddleware(
          {} as never,
          {
            ...resolvedOptions,
            client,
          } as never,
        ),
      server: (server: AnyFn) =>
        createMiddleware(
          {} as never,
          {
            ...resolvedOptions,
            server,
          } as never,
        ),
    });

    registerMiddleware(mw, {
      ...(originalClient ? { client: originalClient } : {}),
      ...(originalServer ? { server: originalServer } : {}),
    });

    return mw;
  };

  return makeBuilder({
    type: 'request' satisfies MiddlewareType,
    ...(__opts ?? options),
  }) as never;
}) as CreateMiddlewareShim;

export const createIsomorphicFn = (): IsomorphicFnBase => {
  const makeCallable = <TArgs extends any[], TServer, TClient>(
    serverImpl: ((...args: TArgs) => TServer) | undefined,
    clientImpl?: (...args: TArgs) => TClient,
  ): IsomorphicFn<TArgs, TServer, TClient> => {
    const fn = ((...args: TArgs) => {
      if (currentEnv() === 'server') return serverImpl?.(...args);
      return clientImpl?.(...args);
    }) as IsomorphicFn<TArgs, TServer, TClient>;
    return fn;
  };

  const base = (() => {}) as unknown as IsomorphicFnBase;
  return Object.assign(base, {
    server: <TArgs extends any[], TServer>(serverImpl: (...args: TArgs) => TServer): ServerOnlyFn<TArgs, TServer> => {
      const serverOnly = makeCallable<TArgs, TServer, undefined>(serverImpl) as ServerOnlyFn<TArgs, TServer>;
      return Object.assign(serverOnly, {
        client: <TClient>(clientImpl: (...args: TArgs) => TClient) => makeCallable(serverImpl, clientImpl),
      });
    },
    client: <TArgs extends any[], TClient>(clientImpl: (...args: TArgs) => TClient): ClientOnlyFn<TArgs, TClient> => {
      const clientOnly = makeCallable<TArgs, undefined, TClient>(undefined, clientImpl) as ClientOnlyFn<TArgs, TClient>;
      return Object.assign(clientOnly, {
        server: <TServer>(serverImpl: (...args: TArgs) => TServer) => makeCallable(serverImpl, clientImpl),
      });
    },
  });
};

export const createServerOnlyFn = <TFn extends AnyFn>(fn: TFn): TFn =>
  ((...args: Parameters<TFn>) => {
    if (currentEnv() === 'client') {
      throw new Error('[tanstack-router-testing] createServerOnlyFn: attempted to call a server-only function in the client test environment.');
    }
    return fn(...args);
  }) as TFn;

export const createClientOnlyFn = <TFn extends AnyFn>(fn: TFn): TFn =>
  ((...args: Parameters<TFn>) => {
    if (currentEnv() === 'server') {
      throw new Error('[tanstack-router-testing] createClientOnlyFn: attempted to call a client-only function in the server test environment.');
    }
    return fn(...args);
  }) as TFn;

export const createStart = ((getOptions: () => Promise<Omit<AnyStartInstanceOptions, '~types'>> | Omit<AnyStartInstanceOptions, '~types'>) => {
  const getAndStoreOptions = async () => {
    const options = await toPromise(getOptions());
    setStartOptions(options as AnyStartInstanceOptions);
    return options;
  };

  const initialOptions = getOptions();
  if (initialOptions instanceof Promise) {
    void initialOptions.then(options => {
      setStartOptions(options as AnyStartInstanceOptions);
    });
  } else {
    setStartOptions(initialOptions as AnyStartInstanceOptions);
  }

  return {
    getOptions: getAndStoreOptions,
    createMiddleware,
  };
}) as typeof upstreamCreateStart;

export function useServerFn<T extends (...deps: any[]) => Promise<any>>(serverFn: T): (...args: Parameters<T>) => ReturnType<T> {
  const router = useRouter();

  return React.useCallback(
    async (...args: any[]) => {
      try {
        const res = await serverFn(...args);

        if (isRedirect(res)) {
          throw res;
        }

        return res;
      } catch (error) {
        if (isRedirect(error)) {
          error.options._fromLocation = router.stores.location.get();
          return router.navigate(router.resolveRedirect(error).options);
        }

        throw error;
      }
    },
    [router, serverFn],
  ) as any;
}
