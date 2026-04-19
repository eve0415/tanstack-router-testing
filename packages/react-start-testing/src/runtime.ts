import type { TestEnv } from '@tanstack-router-testing/router-testing-core';
import type { AnyRouter } from '@tanstack/react-router';
import type { AnyStartInstanceOptions } from '@tanstack/start-client-core';
import type { StartHandlerType, StartStorageContext } from '@tanstack/start-storage-context';

import { clearStartMocks } from './clearStartMocks.ts';
import { runInStartEnv } from './isomorphic.ts';
import { __setStartOptionsForTesting } from './shim.ts';
import { runWithStartContext } from '@tanstack/start-storage-context';

export interface StartTestRuntimeOptions {
  readonly startInstance?: {
    readonly getOptions: () => AnyStartInstanceOptions | Promise<AnyStartInstanceOptions>;
  };
  readonly startOptions?: AnyStartInstanceOptions;
  readonly request?: Request | string | URL;
  readonly router?: AnyRouter;
  readonly context?: unknown;
  readonly env?: TestEnv;
  readonly handlerType?: StartHandlerType;
}

export interface StartTestRunOptions {
  readonly request?: Request | string | URL;
  readonly context?: unknown;
  readonly env?: TestEnv;
  readonly handlerType?: StartHandlerType;
}

export interface StartTestRuntime {
  readonly request: Request;
  readonly startOptions: AnyStartInstanceOptions;
  readonly run: <T>(fn: () => T | Promise<T>, options?: StartTestRunOptions) => Promise<T>;
  readonly call: <TArgs extends readonly unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn | Promise<TReturn>,
    args: TArgs,
    options?: StartTestRunOptions,
  ) => Promise<Awaited<TReturn>>;
  readonly cleanup: () => void;
}

export const createStartTestRuntime = async (options: StartTestRuntimeOptions = {}): Promise<StartTestRuntime> => {
  const startOptions = options.startOptions ?? (await options.startInstance?.getOptions()) ?? ({} as AnyStartInstanceOptions);
  const request = toRequest(options.request);

  __setStartOptionsForTesting(startOptions);

  const createContext = (runOptions: StartTestRunOptions = {}): StartStorageContext => ({
    getRouter: () => {
      if (!options.router) {
        throw new Error('[tanstack-router-testing] createStartTestRuntime: no router was provided for this test runtime.');
      }
      return options.router as never;
    },
    request: toRequest(runOptions.request ?? request),
    startOptions,
    contextAfterGlobalMiddlewares: runOptions.context ?? options.context ?? {},
    executedRequestMiddlewares: new Set(),
    handlerType: runOptions.handlerType ?? options.handlerType ?? 'serverFn',
  });

  const runtime: StartTestRuntime = {
    request,
    startOptions,
    run: async (fn, runOptions) => {
      const env = runOptions?.env ?? options.env ?? 'server';
      const storage = createContext(runOptions);
      return runWithStartContext(storage, async () => {
        storage.contextAfterGlobalMiddlewares = await executeGlobalRequestMiddlewares(storage, storage.contextAfterGlobalMiddlewares);
        return runInStartEnv(env, fn);
      });
    },
    call: <TArgs extends readonly unknown[], TReturn>(
      fn: (...args: TArgs) => TReturn | Promise<TReturn>,
      args: TArgs,
      runOptions?: StartTestRunOptions,
    ) => runtime.run(() => fn(...args), runOptions) as Promise<Awaited<TReturn>>,
    cleanup: clearStartMocks,
  };

  return runtime;
};

export const createRscTestRuntime = createStartTestRuntime;

const toRequest = (request: Request | string | URL | undefined): Request => {
  if (request instanceof Request) return request;
  const url = request?.toString() ?? 'http://tanstack-router-testing.test/';
  return new Request(url);
};

const executeGlobalRequestMiddlewares = async (storage: StartStorageContext, initialContext: unknown): Promise<unknown> => {
  const middlewares = [...((storage.startOptions?.requestMiddleware ?? []) as Array<{ readonly options?: { readonly server?: unknown } }>)];
  const pathname = new URL(storage.request.url).pathname;

  const next = async (
    parentContext: unknown,
    ctx: { readonly context?: unknown } | undefined = {},
  ): Promise<{ readonly context: unknown; readonly response: Response }> => {
    const middleware = middlewares.shift();
    const context = mergeContext(parentContext, ctx.context);
    if (!middleware) {
      return {
        context,
        response: new Response(null),
      };
    }

    storage.executedRequestMiddlewares.add(middleware);

    const server = middleware.options?.server;
    if (typeof server !== 'function') return next(context);

    const result = await server({
      request: storage.request,
      pathname,
      context,
      next: (nextCtx?: { readonly context?: unknown }) => next(context, nextCtx),
    });

    if (result instanceof Response) {
      return { context, response: result };
    }

    return {
      context: mergeContext(context, (result as { readonly context?: unknown } | undefined)?.context),
      response: (result as { readonly response?: Response } | undefined)?.response ?? new Response(null),
    };
  };

  const result = await next(initialContext);
  return result.context;
};

const mergeContext = (left: unknown, right: unknown): unknown => {
  if (isRecord(left) && isRecord(right)) {
    return { ...left, ...right };
  }
  return right ?? left ?? {};
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
