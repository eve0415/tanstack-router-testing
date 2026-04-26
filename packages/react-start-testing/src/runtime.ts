import type { TestEnv } from '@tanstack-router-testing/router-testing-core';
import type { AnyRouter } from '@tanstack/react-router';
import type { AnyStartInstanceOptions } from '@tanstack/start-client-core';
import type { StartHandlerType, StartStorageContext } from '@tanstack/start-storage-context';

import { runWithStartContext } from '@tanstack/start-storage-context';

import { clearStartMocks } from './clearStartMocks.ts';
import { runInStartEnv } from './isomorphic.ts';
import { __setStartOptionsForTesting } from './shim.ts';

/**
 * Configuration for {@link createStartTestRuntime}.
 *
 * @remarks
 * At most one of `startInstance` and `startOptions` should be provided. If both
 * are given, `startOptions` takes precedence. When neither is supplied the
 * runtime creates an empty options object.
 */
export interface StartTestRuntimeOptions {
  /**
   * A Start instance whose `getOptions()` method is called once during
   * runtime creation. Ignored when {@link startOptions} is also provided.
   */
  readonly startInstance?: {
    readonly getOptions: () => AnyStartInstanceOptions | Promise<AnyStartInstanceOptions>;
  };
  /** Explicit Start options to use instead of resolving from a `startInstance`. */
  readonly startOptions?: AnyStartInstanceOptions;
  /**
   * The incoming request available to server functions via `getRequest()`.
   * Accepts a full `Request`, a URL string, or a `URL` object.
   * Defaults to `http://tanstack-router-testing.test/`.
   */
  readonly request?: Request | string | URL;
  /** The TanStack Router instance made available via `getRouter()` inside server functions. */
  readonly router?: AnyRouter;
  /** Initial middleware context. Merged into each call's context before global request middlewares run. */
  readonly context?: unknown;
  /** Default simulated environment. Defaults to `'server'`. */
  readonly env?: TestEnv;
  /** Default handler type passed to the storage context. Defaults to `'serverFn'`. */
  readonly handlerType?: StartHandlerType;
}

/**
 * Per-invocation overrides passed to {@link StartTestRuntime.run} and
 * {@link StartTestRuntime.call}.
 *
 * @remarks
 * Every property mirrors a field from {@link StartTestRuntimeOptions}. When
 * provided here it takes precedence over the runtime-level default for that
 * single invocation only.
 */
export interface StartTestRunOptions {
  /** Override the request for this invocation. */
  readonly request?: Request | string | URL;
  /** Override the middleware context for this invocation. */
  readonly context?: unknown;
  /** Override the simulated environment (`'server'` or `'client'`) for this invocation. */
  readonly env?: TestEnv;
  /** Override the handler type for this invocation. */
  readonly handlerType?: StartHandlerType;
}

/**
 * A test runtime that simulates the TanStack Start server environment.
 *
 * @remarks
 * Created by {@link createStartTestRuntime}. Provides the storage context,
 * request, and environment that server functions expect at runtime. Call
 * {@link cleanup} (or {@link clearStartMocks}) in `afterEach` to restore all
 * mocks.
 */
export interface StartTestRuntime {
  /** The `Request` object available to server functions via `getRequest()`. */
  readonly request: Request;
  /** The resolved Start options used by the runtime. */
  readonly startOptions: AnyStartInstanceOptions;
  /**
   * Run an arbitrary function inside the Start storage context.
   *
   * @typeParam T - The return type of `fn`.
   * @param fn - The function to execute.
   * @param options - Optional per-invocation overrides. See {@link StartTestRunOptions}.
   * @returns A `Promise` resolving to the return value of `fn`.
   */
  readonly run: <T>(fn: () => T | Promise<T>, options?: StartTestRunOptions) => Promise<T>;
  /**
   * Invoke a server function (or any callable) with explicit arguments inside
   * the Start storage context.
   *
   * @typeParam TArgs - Tuple of argument types.
   * @typeParam TReturn - The return type of `fn`.
   * @param fn - The function to call.
   * @param args - Arguments forwarded to `fn`.
   * @param options - Optional per-invocation overrides. See {@link StartTestRunOptions}.
   * @returns A `Promise` resolving to the awaited return value of `fn`.
   */
  readonly call: <TArgs extends readonly unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn | Promise<TReturn>,
    args: TArgs,
    options?: StartTestRunOptions,
  ) => Promise<Awaited<TReturn>>;
  /**
   * Remove all server-function and middleware mocks. Equivalent to calling
   * {@link clearStartMocks}.
   */
  readonly cleanup: () => void;
}

/**
 * Create a {@link StartTestRuntime} for executing server functions in a
 * simulated TanStack Start environment.
 *
 * @param options - Runtime configuration. See {@link StartTestRuntimeOptions}.
 * @returns A `Promise` resolving to a {@link StartTestRuntime} instance.
 *
 * @example
 * ```ts
 * import { createServerFn } from '@tanstack/react-start';
 * import {
 *   createStartTestRuntime,
 *   mockServerFn,
 * } from '@tanstack-router-testing/react-start-testing';
 *
 * const runtime = await createStartTestRuntime({
 *   request: 'http://localhost:3000/api/orders',
 *   env: 'server',
 * });
 *
 * const listOrders = createServerFn()
 *   .validator((input: { userId: string }) => input)
 *   .handler(async ({ data }) => [{ id: '1', userId: data.userId }]);
 *
 * mockServerFn(listOrders, async ({ data }) => [
 *   { id: 'mock-1', userId: data.userId },
 * ]);
 *
 * const orders = await runtime.call(listOrders, [{ data: { userId: 'u1' } }]);
 * // orders === [{ id: 'mock-1', userId: 'u1' }]
 *
 * runtime.cleanup();
 * ```
 *
 * @remarks
 * The runtime resolves Start options from either `startOptions` or
 * `startInstance.getOptions()`, sets up the Start storage context, and
 * executes global request middlewares before each invocation.
 */
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
    call: <TArgs extends readonly unknown[], TReturn>(fn: (...args: TArgs) => TReturn | Promise<TReturn>, args: TArgs, runOptions?: StartTestRunOptions) =>
      runtime.run(() => fn(...args), runOptions) as Promise<Awaited<TReturn>>,
    cleanup: clearStartMocks,
  };

  return runtime;
};

const toRequest = (request: Request | string | URL | undefined): Request => {
  if (request instanceof Request) return request;
  const url = request?.toString() ?? 'http://tanstack-router-testing.test/';
  return new Request(url);
};

const executeGlobalRequestMiddlewares = async (storage: StartStorageContext, initialContext: unknown): Promise<unknown> => {
  const middlewares = [...((storage.startOptions?.requestMiddleware ?? []) as { readonly options?: { readonly server?: unknown } }[])];
  const { pathname } = new URL(storage.request.url);

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
