# API Reference

Comprehensive reference for every public export of the TanStack Router/Start Testing Library, organized by package.

---

## `@tanstack-router-testing/router-testing-core`

Framework-agnostic primitives that the `@tanstack-router-testing/react-*` packages build on. No React, Solid, or Vue code -- only utilities any framework adapter can compose.

### Types

#### `TestEnv`

```ts
type TestEnv = 'server' | 'client';
```

The environments an isomorphic function can run under.

- `'server'` -- server-only code paths (direct DB access, filesystem, etc.).
- `'client'` -- client-only code paths (`fetch()` to an API route, etc.).

---

#### `CreateTestHistoryOptions`

```ts
interface CreateTestHistoryOptions {
  readonly initialEntries?: readonly string[];
  readonly initialIndex?: number;
}
```

Options for `createTestHistory`. Forwards to `@tanstack/history`'s `createMemoryHistory` with test-friendly defaults.

| Property | Type | Default | Description |
|---|---|---|---|
| `initialEntries` | `readonly string[]` | `['/']` | Initial history entries. The last entry is active unless `initialIndex` is set. |
| `initialIndex` | `number` | `initialEntries.length - 1` | Index into `initialEntries` to start at. Note: upstream uses a truthiness check, so passing `0` falls back to the last entry. Use a single-element array instead. |

---

#### `AnyFn`

```ts
type AnyFn = (...args: readonly unknown[]) => unknown;
```

Loose function shape used as the key/handler type in the server-fn and middleware registries. Concrete typing lives in `@tanstack-router-testing/react-start-testing`.

---

#### `ServerFnEntry`

```ts
interface ServerFnEntry {
  readonly original: AnyFn;
  mock: AnyFn | undefined;
}
```

Registry entry for a single server function.

| Property | Type | Description |
|---|---|---|
| `original` | `AnyFn` | The original handler registered via `createServerFn().handler(original)`. Never mutated after registration. |
| `mock` | `AnyFn \| undefined` | When set, in-process dispatch calls this instead of `original`. |

---

#### `MiddlewareEntry`

```ts
interface MiddlewareEntry {
  readonly originalClient: AnyFn | undefined;
  readonly originalServer: AnyFn | undefined;
  mockClient: AnyFn | undefined;
  mockServer: AnyFn | undefined;
}
```

Registry entry for a single middleware object.

| Property | Type | Description |
|---|---|---|
| `originalClient` | `AnyFn \| undefined` | Original `.client()` implementation. `undefined` means the middleware has no client phase. |
| `originalServer` | `AnyFn \| undefined` | Original `.server()` implementation. |
| `mockClient` | `AnyFn \| undefined` | Replaces the client phase during in-process dispatch. |
| `mockServer` | `AnyFn \| undefined` | Replaces the server phase during in-process dispatch. |

---

#### `MiddlewareMockOptions`

```ts
interface MiddlewareMockOptions {
  readonly client?: AnyFn;
  readonly server?: AnyFn;
}
```

Options for `setMiddlewareMock`. Provide `client`, `server`, or both. Omitted keys leave the corresponding phase unchanged.

---

#### `CallMiddlewareOptions`

```ts
interface CallMiddlewareOptions {
  readonly phase: 'server' | 'client';
  readonly context?: unknown;
  readonly request?: Request;
}
```

Options for `callMiddleware`.

| Property | Type | Default | Description |
|---|---|---|---|
| `phase` | `'server' \| 'client'` | -- | Which middleware phase to invoke. |
| `context` | `unknown` | `{}` | Initial context passed to the middleware. |
| `request` | `Request` | Synthetic test request | Request object available inside the middleware. |

---

#### `CallMiddlewareResult`

```ts
interface CallMiddlewareResult {
  readonly context: unknown;
}
```

Result of calling a middleware in isolation. Contains the context after the middleware (and its `next()` call) has run.

---

### Functions

#### `createTestHistory(options?)`

```ts
function createTestHistory(options?: CreateTestHistoryOptions): RouterHistory;
```

Build a `RouterHistory` backed by an in-memory stack, suitable for `createRouter({ history })` in tests.

Thin wrapper around `createMemoryHistory` -- its only job is to provide a default `initialEntries` of `['/']` so tests that don't care about the starting path can omit it entirely.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `options` | `CreateTestHistoryOptions` | Memory-history options. Optional. |

**Returns:** `RouterHistory` -- accepted directly by `@tanstack/react-router`'s `createRouter`.

**Example:**

```ts
import { createRouter } from '@tanstack/react-router';
import { createTestHistory } from '@tanstack-router-testing/router-testing-core';
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  history: createTestHistory({ initialEntries: ['/orders/42'] }),
});
```

---

#### `getEnv()`

```ts
function getEnv(): TestEnv | undefined;
```

Read the currently-simulated environment.

**Returns:** The current `TestEnv`, or `undefined` if none is set.

**Example:**

```ts
import { getEnv, runInEnv } from '@tanstack-router-testing/router-testing-core';

await runInEnv('server', () => {
  expect(getEnv()).toBe('server');
});
expect(getEnv()).toBeUndefined();
```

---

#### `setEnv(env)`

```ts
function setEnv(env: TestEnv | undefined): void;
```

Imperatively set the current environment. Prefer `runInEnv` over this -- it guarantees restoration after the scope ends, even when the callback throws. Direct calls to `setEnv` are intended for test-lifecycle hooks (`beforeEach`/`afterEach`) where the caller manages restoration explicitly.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `TestEnv \| undefined` | The environment to simulate, or `undefined` to clear. |

---

#### `runInEnv(env, fn)`

```ts
function runInEnv<T>(env: TestEnv, fn: () => T | Promise<T>): Promise<T>;
```

Run `fn` under a fixed environment, then restore the previous value. Restoration happens whether `fn` resolves, rejects, or throws synchronously. Nested calls work: each call saves and restores the exact prior value.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `TestEnv` | The environment to simulate for the duration of `fn`. |
| `fn` | `() => T \| Promise<T>` | The callback to execute. May return a value or a `Promise`. |

**Returns:** `Promise<T>` -- resolves to the value returned by `fn`.

**Example:**

```ts
const data = await runInEnv('server', async () => {
  return db.users.findMany();
});
```

---

#### `registerServerFn(fn, original)`

```ts
function registerServerFn(fn: AnyFn, original: AnyFn): ServerFnEntry;
```

Register a server function so tests can find, mock, or invoke its original handler. Idempotent: registering the same `fn` twice returns the existing entry.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `fn` | `AnyFn` | The server-fn callable (value returned by `createServerFn().handler(original)`). |
| `original` | `AnyFn` | The original handler passed to `.handler()`. |

**Returns:** `ServerFnEntry` -- the registry entry for `fn`.

**Example:**

```ts
const listOrders = createServerFn({ method: 'GET' }).handler(listOrdersImpl);
registerServerFn(listOrders, listOrdersImpl);
```

---

#### `getServerFnEntry(fn)`

```ts
function getServerFnEntry(fn: AnyFn): ServerFnEntry | undefined;
```

Fetch a server-fn's registry entry.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `fn` | `AnyFn` | The server-fn callable. |

**Returns:** The entry, or `undefined` if `fn` was never registered.

---

#### `setServerFnMock(fn, mock)`

```ts
function setServerFnMock(fn: AnyFn, mock: AnyFn | undefined): () => void;
```

Install a mock handler for a server function. Returns a disposer that restores the prior mock (or clears it) when called.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `fn` | `AnyFn` | The server-fn callable to mock. |
| `mock` | `AnyFn \| undefined` | The replacement handler. Pass `undefined` to clear the mock. |

**Returns:** `() => void` -- a no-arg function that restores the prior state.

**Throws:** If `fn` has not been registered. Mocking an unregistered fn would silently no-op.

**Example:**

```ts
const restore = setServerFnMock(listOrders, async () => [{ id: 1 }]);
// ... test body ...
restore();
```

---

#### `clearAllServerFnMocks()`

```ts
function clearAllServerFnMocks(): void;
```

Clear every registered mock. Typically called from a Vitest `afterEach` hook to prevent test bleed. Does not unregister the fns themselves -- originals are preserved.

---

#### `registerMiddleware(mw, phases)`

```ts
function registerMiddleware(
  mw: object,
  phases: {
    readonly client?: AnyFn | undefined;
    readonly server?: AnyFn | undefined;
  },
): MiddlewareEntry;
```

Register a middleware object so tests can mock its phase implementations. Idempotent.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `mw` | `object` | The middleware object (value returned by `createMiddleware`). |
| `phases` | `{ client?: AnyFn; server?: AnyFn }` | Original `.client()` and `.server()` implementations, or `undefined` for phases the middleware doesn't provide. |

**Returns:** `MiddlewareEntry` -- the registry entry for `mw`.

---

#### `getMiddlewareEntry(mw)`

```ts
function getMiddlewareEntry(mw: object): MiddlewareEntry | undefined;
```

Fetch a middleware's registry entry.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `mw` | `object` | The middleware object. |

**Returns:** The entry, or `undefined` if `mw` was never registered.

---

#### `setMiddlewareMock(mw, options)`

```ts
function setMiddlewareMock(mw: object, options: MiddlewareMockOptions): () => void;
```

Override one or both phases of a middleware. Returns a disposer that restores the prior phase values.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `mw` | `object` | The middleware object to mock. |
| `options` | `MiddlewareMockOptions` | Phase replacements. Provided keys are swapped; omitted keys are left untouched. |

**Returns:** `() => void` -- a no-arg function that restores the prior state.

**Throws:** If `mw` has not been registered.

**Example:**

```ts
const restore = setMiddlewareMock(authMw, {
  server: async ({ next, context }) =>
    next({ context: { ...context, user: { id: 'u1' } } }),
});
// ... test body ...
restore();
```

---

#### `clearAllMiddlewareMocks()`

```ts
function clearAllMiddlewareMocks(): void;
```

Clear every registered middleware mock (both client and server phases). Originals are preserved.

---

#### `callMiddleware(mw, options)`

```ts
function callMiddleware(mw: object, options: CallMiddlewareOptions): Promise<CallMiddlewareResult>;
```

Call a registered middleware in isolation, without a full router. Invokes the specified phase (server or client) with a fake `next()` that captures context. Mocks installed via `setMiddlewareMock` take precedence over originals.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `mw` | `object` | The middleware object returned by `createMiddleware`. Must be registered first. |
| `options` | `CallMiddlewareOptions` | Phase, initial context, and optional request. |

**Returns:** `Promise<CallMiddlewareResult>` -- the resolved context after middleware execution.

**Throws:** If `mw` has not been registered, or if the specified phase has no implementation.

**Example:**

```ts
registerMiddleware(authMw, { server: authServerImpl });
const result = await callMiddleware(authMw, {
  phase: 'server',
  context: { user: null },
});
expect(result.context).toEqual({ user: null, checked: true });
```

---

## `@tanstack-router-testing/react-router-testing`

Test helpers for `@tanstack/react-router`. The public surface is intentionally small: `createTestRouter` and `createRouterHarness`, plus SSR support via the `./ssr` subpath.

### Types

#### `CreateTestRouterMemoryOptions`

```ts
interface CreateTestRouterMemoryOptions {
  readonly initialEntries?: readonly string[];
  readonly initialIndex?: number;
}
```

Memory history options used when a test does not supply its own history.

---

#### `CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>`

```ts
type CreateTestRouterOptions<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
> =
  | (Omit<RouterConstructorOptions<...>, 'history'> & CreateTestRouterMemoryOptions & { readonly history?: never })
  | (RouterConstructorOptions<...> & { readonly initialEntries?: never; readonly initialIndex?: never });
```

A discriminated union: pass either a `history` object (production-shaped) or `initialEntries`/`initialIndex` (test convenience), but not both.

---

#### `RouteMatchTarget`

```ts
type RouteMatchTarget =
  | string
  | { readonly id?: string; readonly routeId?: string; readonly fullPath?: string };
```

Identifies a route match inside the current router state. Pass a plain string to match against any of `id`, `routeId`, or `fullPath`. Pass an object to match a specific field.

When an object is given, fields are checked in precedence order: `id` > `routeId` > `fullPath`. A bare string is compared against all three, returning the first match.

> **Note:** `RouteMatchTarget` is not directly re-exported from the package entry point. Users encounter it as the parameter type for `RouterHarness` accessor methods (`getMatch`, `getLoaderData`, `getRouteContext`, `getSearch`, `getParams`, `getError`).

---

#### `RouterHarness<TRouter>`

```ts
interface RouterHarness<TRouter extends AnyRouter> {
  readonly router: TRouter;
  readonly TestRouterProvider: ComponentType;
  readonly load: () => Promise<void>;
  readonly navigate: (options: Parameters<TRouter['navigate']>[0]) => Promise<void>;
  readonly preload: (options: Parameters<TRouter['preloadRoute']>[0]) => Promise<readonly AnyRouteMatch[] | undefined>;
  readonly match: (href: string) => readonly AnyRouteMatch[];
  readonly getMatch: (target: RouteMatchTarget) => AnyRouteMatch | undefined;
  readonly getLoaderData: (target: RouteMatchTarget) => unknown;
  readonly getRouteContext: (target: RouteMatchTarget) => unknown;
  readonly getSearch: (target: RouteMatchTarget) => unknown;
  readonly getParams: (target: RouteMatchTarget) => unknown;
  readonly getError: (target: RouteMatchTarget) => unknown;
  readonly getRedirect: (options: Parameters<TRouter['navigate']>[0]) => Promise<{ readonly pathname: string; readonly search: string; readonly hash: string } | undefined>;
  readonly cleanup: () => void;
}
```

Facade returned by `createRouterHarness` for testing routes, loaders, guards, redirects, and component rendering against a real TanStack Router instance. Full route-tree type inference is preserved through `TRouter`.

**Members:**

| Member | Type | Description |
|---|---|---|
| `router` | `TRouter` | The underlying router instance. Useful for low-level assertions on `router.state`. |
| `TestRouterProvider` | `ComponentType` | A React component wrapping `RouterProvider` (and optionally `QueryClientProvider`). Pass to `render()`. |
| `load()` | `() => Promise<void>` | Load the router, resolving all matched route loaders and `beforeLoad` guards. Must be called before state accessors. |
| `navigate(options)` | `(...) => Promise<void>` | Navigate and wait for the transition to settle. Navigation errors reject the returned promise. |
| `preload(options)` | `(...) => Promise<AnyRouteMatch[] \| undefined>` | Preload a route's chunks and loaders without navigating. |
| `match(href)` | `(href: string) => AnyRouteMatch[]` | Match a URL against the route tree without mutating router state. Does not trigger loaders or guards. |
| `getMatch(target)` | `(...) => AnyRouteMatch \| undefined` | Find a single route match in `router.state.matches`. |
| `getLoaderData(target)` | `(...) => unknown` | Retrieve loader data for a matched route. |
| `getRouteContext(target)` | `(...) => unknown` | Retrieve the route context (populated by `beforeLoad` and parent routes). |
| `getSearch(target)` | `(...) => unknown` | Retrieve validated search params. |
| `getParams(target)` | `(...) => unknown` | Retrieve parsed route params. |
| `getError(target)` | `(...) => unknown` | Retrieve the error thrown during loading. |
| `getRedirect(options)` | `(...) => Promise<{pathname, search, hash} \| undefined>` | Navigate and detect whether a redirect occurred. Returns `undefined` if the router landed at the intended destination. |
| `cleanup()` | `() => void` | Tear down the router, cancelling pending matches and destroying the history instance. Call in `afterEach`. |

---

### SSR Types (via `./ssr` subpath)

Import from `@tanstack-router-testing/react-router-testing/ssr`.

#### `RouterSsrMode`

```ts
type RouterSsrMode = 'string' | 'stream';
```

---

#### `CreateRouterSsrHarnessOptions<TRouter>`

```ts
interface CreateRouterSsrHarnessOptions<TRouter extends AnyRouter> {
  readonly createRouter: () => TRouter;
  readonly request?: Request | string | URL;
  readonly mode?: RouterSsrMode;
  readonly getRouterManifest?: () => Manifest | Promise<Manifest>;
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `createRouter` | `() => TRouter` | -- | Factory that creates the router instance for each SSR pass. |
| `request` | `Request \| string \| URL` | `'http://tanstack-router-testing.test/'` | The incoming request to render. |
| `mode` | `RouterSsrMode` | `'string'` | Render mode: `'string'` for `renderToString`, `'stream'` for `renderToStream`. |
| `getRouterManifest` | `() => Manifest \| Promise<Manifest>` | -- | Optional manifest provider for code-split route loading. |

---

#### `HydrateRouterSsrOptions<TRouter>`

```ts
interface HydrateRouterSsrOptions<TRouter extends AnyRouter> {
  readonly createRouter?: () => TRouter;
  readonly container?: Document | Element;
}
```

Options for `RouterSsrHarness.hydrate()`.

| Property | Type | Description |
|---|---|---|
| `createRouter` | `() => TRouter` | Override the router factory for hydration. Defaults to the one passed to `createRouterSsrHarness`. |
| `container` | `Document \| Element` | DOM target for hydration. Defaults to `document`. |

---

#### `RouterSsrHarness<TRouter>`

```ts
interface RouterSsrHarness<TRouter extends AnyRouter> {
  readonly request: Request;
  readonly router: TRouter;
  readonly response: Response;
  readonly responseHeaders: Headers;
  readonly html: string;
  readonly mode: RouterSsrMode;
  readonly hydrate: (options?: HydrateRouterSsrOptions<TRouter>) => Promise<{
    readonly router: TRouter;
    readonly errors: readonly unknown[];
    readonly unmount: () => void;
  }>;
}
```

Returned by `createRouterSsrHarness`. Provides the SSR-rendered HTML and a `hydrate()` method to test client-side hydration.

| Member | Type | Description |
|---|---|---|
| `request` | `Request` | The request used for SSR. |
| `router` | `TRouter` | The server-side router instance. |
| `response` | `Response` | The full HTTP response from the request handler. |
| `responseHeaders` | `Headers` | Response headers set during SSR. |
| `html` | `string` | The rendered HTML string. |
| `mode` | `RouterSsrMode` | The render mode used. |
| `hydrate(options?)` | `(...) => Promise<{router, errors, unmount}>` | Hydrate the SSR output into a DOM container. Returns the client router, any console errors captured during hydration, and an `unmount()` function. |

---

### Functions

#### `createTestRouter(options)`

```ts
function createTestRouter<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated>,
): Router<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>;
```

Build a `Router` configured for in-memory, in-test use. Thin wrapper around `createRouter` -- defaults to memory history and `defaultPendingMinMs: 0`, then forwards every other router option verbatim.

The return type is fully generic: `router.navigate({ to })`, `router.state`, and every hook are constrained by `routeTree` in the same way they would be in production.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `options` | `CreateTestRouterOptions<...>` | Router options. Pass either `history` or `initialEntries`/`initialIndex`, not both. |

**Returns:** `Router<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>`

**Throws:** If both `history` and `initialEntries`/`initialIndex` are provided.

**Example:**

```ts
import { createTestRouter } from '@tanstack-router-testing/react-router-testing';
import { routeTree } from './routeTree.gen';

const router = createTestRouter({
  routeTree,
  initialEntries: ['/orders/42'],
  context: { auth: stubAuth },
});
```

---

#### `createRouterHarness(options)`

```ts
function createRouterHarness<
  TRouteTree extends AnyRoute,
  TTrailingSlash extends TrailingSlashOption = 'never',
  TDefaultStructural extends boolean = false,
  TDehydrated extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateTestRouterOptions<TRouteTree, TTrailingSlash, TDefaultStructural, TDehydrated> & {
    readonly queryClient?: object;
  },
): RouterHarness<Router<TRouteTree, TTrailingSlash, TDefaultStructural, RouterHistory, TDehydrated>>;
```

Create a `RouterHarness` containing a fully wired test router and a React provider component. Combines `createTestRouter` with a `RouterProvider` wrapper (and an optional `QueryClientProvider`), giving tests a single entry point for rendering, navigating, and asserting against route state.

**Parameters:**

All options from `CreateTestRouterOptions` plus:

| Parameter | Type | Description |
|---|---|---|
| `queryClient` | `object` | Optional `QueryClient` instance. When provided, wraps `RouterProvider` with `QueryClientProvider` from `@tanstack/react-query`. The package is lazily imported on the first `load()` call and throws with an install hint if missing. |

**Returns:** `RouterHarness<Router<...>>`

**Example:**

```tsx
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { render } from '@testing-library/react';
import { routeTree } from './routeTree.gen';

const harness = createRouterHarness({
  routeTree,
  initialEntries: ['/posts/7'],
  context: { auth: stubAuth },
});
await harness.load();

const { getByText } = render(<harness.TestRouterProvider />);
expect(getByText('Post #7')).toBeDefined();
expect(harness.getLoaderData('/posts/$postId')).toEqual({ id: 7 });

harness.cleanup();
```

---

### SSR Functions (via `./ssr` subpath)

#### `createRouterSsrHarness(options)`

```ts
function createRouterSsrHarness<TRouter extends AnyRouter>(
  options: CreateRouterSsrHarnessOptions<TRouter>,
): Promise<RouterSsrHarness<TRouter>>;
```

Create a `RouterSsrHarness` for testing server-side rendering of a TanStack Router application. Executes the request handler, captures the rendered HTML, and provides a `hydrate()` method for testing client-side hydration.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `options` | `CreateRouterSsrHarnessOptions<TRouter>` | SSR harness configuration. |

**Returns:** `Promise<RouterSsrHarness<TRouter>>` -- async because the request handler runs during creation.

**Example:**

```ts
import { createRouterSsrHarness } from '@tanstack-router-testing/react-router-testing/ssr';

const harness = await createRouterSsrHarness({
  createRouter: () => createTestRouter({ routeTree }),
  request: 'http://localhost:3000/posts/7',
  mode: 'string',
});

expect(harness.html).toContain('Post #7');
expect(harness.response.status).toBe(200);

// Test hydration
const { router, errors, unmount } = await harness.hydrate();
expect(errors).toHaveLength(0);
unmount();
```

---

## `@tanstack-router-testing/react-start-testing`

Test helpers for `@tanstack/react-start`. Server functions are called directly in tests, exactly as production code calls them. This package exposes mock controls, environment simulation, and test runtimes.

### Types

#### `AnyServerFn`

```ts
type AnyServerFn = (...args: never[]) => unknown;
```

Catch-all type representing any TanStack Start server function. Used as a generic constraint in `mockServerFn` and `ServerFnMock`.

---

#### `ServerFnMock<TFn>`

```ts
type ServerFnMock<TFn extends AnyServerFn> = (...args: Parameters<TFn>) => ReturnType<TFn>;
```

The mock implementation signature for a server function of type `TFn`. Full generic inference is preserved so autocomplete works identically to the real call.

---

#### `MockMiddlewareOptions`

```ts
interface MockMiddlewareOptions {
  readonly client?: AnyFn;
  readonly server?: AnyFn;
}
```

Phase override options for `mockMiddleware`. Provide `client`, `server`, or both. Omitted keys leave the corresponding phase untouched.

---

#### `StartTestRuntimeOptions`

```ts
interface StartTestRuntimeOptions {
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
```

Configuration for `createStartTestRuntime`.

| Property | Type | Default | Description |
|---|---|---|---|
| `startInstance` | `{ getOptions: () => ... }` | -- | A Start instance whose `getOptions()` is called once during creation. Ignored when `startOptions` is also provided. |
| `startOptions` | `AnyStartInstanceOptions` | `{}` | Explicit Start options. Takes precedence over `startInstance`. |
| `request` | `Request \| string \| URL` | `'http://tanstack-router-testing.test/'` | Incoming request available to server functions via `getRequest()`. |
| `router` | `AnyRouter` | -- | Router instance available via `getRouter()` inside server functions. |
| `context` | `unknown` | `{}` | Initial middleware context merged into each call's context. |
| `env` | `TestEnv` | `'server'` | Default simulated environment. |
| `handlerType` | `StartHandlerType` | `'serverFn'` | Default handler type passed to the storage context. |

---

#### `StartTestRunOptions`

```ts
interface StartTestRunOptions {
  readonly request?: Request | string | URL;
  readonly context?: unknown;
  readonly env?: TestEnv;
  readonly handlerType?: StartHandlerType;
}
```

Per-invocation overrides for `StartTestRuntime.run` and `StartTestRuntime.call`. Every property mirrors a field from `StartTestRuntimeOptions` and takes precedence for that single invocation only.

---

#### `StartTestRuntime`

```ts
interface StartTestRuntime {
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
```

A test runtime that simulates the TanStack Start server environment.

| Member | Type | Description |
|---|---|---|
| `request` | `Request` | The `Request` object available to server functions. |
| `startOptions` | `AnyStartInstanceOptions` | The resolved Start options used by the runtime. |
| `run(fn, options?)` | `<T>(...) => Promise<T>` | Run an arbitrary function inside the Start storage context with optional per-invocation overrides. |
| `call(fn, args, options?)` | `<TArgs, TReturn>(...) => Promise<Awaited<TReturn>>` | Invoke a function with explicit arguments inside the Start storage context. |
| `cleanup()` | `() => void` | Remove all server-function and middleware mocks. Equivalent to `clearStartMocks()`. |

---

#### `RscTestRuntimeOptions`

```ts
interface RscTestRuntimeOptions extends StartTestRuntimeOptions {
  readonly streaming?: boolean;
}
```

Configuration for `createRscTestRuntime`. Extends `StartTestRuntimeOptions`.

| Property | Type | Default | Description |
|---|---|---|---|
| `streaming` | `boolean` | `false` | When `true`, renders via `renderToReadableStream` and collects chunks. When `false`, uses `renderToString`. |

---

#### `RscRenderResult`

```ts
interface RscRenderResult {
  readonly html: string;
  readonly stream: ReadableStream<Uint8Array> | null;
  readonly chunks: readonly string[];
}
```

The result of rendering a React Server Component.

| Property | Type | Description |
|---|---|---|
| `html` | `string` | The complete HTML string produced by the render. |
| `stream` | `ReadableStream<Uint8Array> \| null` | Cloned readable stream. Only present when `streaming: true`; otherwise `null`. |
| `chunks` | `readonly string[]` | Decoded text chunks collected from the stream. Empty when `streaming` is `false`. |

---

#### `RscTestRuntime`

```ts
interface RscTestRuntime extends StartTestRuntime {
  readonly renderServerComponent: <TProps extends Record<string, unknown>>(
    component: ComponentType<TProps>,
    props: TProps,
  ) => Promise<RscRenderResult>;
}
```

Extended test runtime that adds React Server Component rendering on top of `StartTestRuntime`.

| Member | Type | Description |
|---|---|---|
| `renderServerComponent(component, props)` | `<TProps>(...) => Promise<RscRenderResult>` | Render a React component to HTML using `react-dom/server`. |

All members from `StartTestRuntime` are also available.

---

### Functions

#### `mockServerFn(fn, impl)`

```ts
function mockServerFn<TFn extends AnyServerFn>(
  fn: TFn,
  impl: ServerFnMock<TFn>,
): () => void;
```

Install a mock implementation for a TanStack Start server function. The mock is authored against the public callable shape, so a server function normally called as `listOrders({ data })` is mocked with that same signature. Internal context fields are normalized automatically.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `fn` | `TFn` | The server function created by `createServerFn().handler(...)`. |
| `impl` | `ServerFnMock<TFn>` | Replacement handler. Receives the same callable-shape arguments as the original. |

**Returns:** `() => void` -- a disposer that restores the original implementation.

**Example:**

```ts
import { createServerFn } from '@tanstack/react-start';
import { mockServerFn } from '@tanstack-router-testing/react-start-testing';

const listOrders = createServerFn()
  .validator((input: { userId: string }) => input)
  .handler(async ({ data }) => db.orders.findMany(data.userId));

const dispose = mockServerFn(listOrders, async ({ data }) => [
  { id: '1', userId: data.userId, total: 42 },
]);

// ... run your test ...
dispose();
```

---

#### `mockMiddleware(mw, options)`

```ts
function mockMiddleware(mw: object, options: MockMiddlewareOptions): () => void;
```

Override one or both phases of a registered middleware.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `mw` | `object` | The middleware object returned by `createMiddleware().server(...).client(...)`. |
| `options` | `MockMiddlewareOptions` | Which phases to replace. |

**Returns:** `() => void` -- a disposer that restores the original handlers.

**Throws:** If `mw` is not registered.

**Example:**

```ts
import { createMiddleware } from '@tanstack/react-start';
import { mockMiddleware } from '@tanstack-router-testing/react-start-testing';

const authMiddleware = createMiddleware()
  .server(async ({ next }) => next({ context: { user: await getUser() } }))
  .client(async ({ next }) => next());

const dispose = mockMiddleware(authMiddleware, {
  server: async ({ next }) => next({ context: { user: { id: 'test-user' } } }),
});

// ... run your test ...
dispose();
```

---

#### `clearStartMocks()`

```ts
function clearStartMocks(): void;
```

Clear every server-function and middleware mock installed by `mockServerFn` or `mockMiddleware`. This is the same function wired to `StartTestRuntime.cleanup`, so you only need to call it explicitly when installing mocks outside of a runtime.

**Example:**

```ts
import { afterEach } from 'vitest';
import { clearStartMocks } from '@tanstack-router-testing/react-start-testing';

afterEach(() => {
  clearStartMocks();
});
```

---

#### `runInStartEnv(env, fn)`

```ts
function runInStartEnv<T>(env: TestEnv, fn: () => T | Promise<T>): Promise<T>;
```

Execute `fn` with the simulated TanStack Start environment forced to `env`, then restore the prior value. Delegates to `runInEnv` from `router-testing-core`.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `TestEnv` | `'server'` or `'client'`. |
| `fn` | `() => T \| Promise<T>` | Synchronous or asynchronous function to run. |

**Returns:** `Promise<T>`

**Example:**

```ts
import { runInStartEnv } from '@tanstack-router-testing/react-start-testing';

const result = await runInStartEnv('server', () => {
  return fetchDataOnServer();
});
```

---

#### `callMiddleware(mw, options)`

Re-exported from `@tanstack-router-testing/router-testing-core`. See [`callMiddleware`](#callmiddlewaremw-options) above.

---

#### `createStartTestRuntime(options?)`

```ts
function createStartTestRuntime(
  options?: StartTestRuntimeOptions,
): Promise<StartTestRuntime>;
```

Create a `StartTestRuntime` for executing server functions in a simulated TanStack Start environment. Resolves Start options from either `startOptions` or `startInstance.getOptions()`, sets up the Start storage context, and executes global request middlewares before each invocation.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `options` | `StartTestRuntimeOptions` | Runtime configuration. Optional; defaults to an empty options object. |

**Returns:** `Promise<StartTestRuntime>` -- async because Start options may need to be resolved.

**Example:**

```ts
import { createServerFn } from '@tanstack/react-start';
import {
  createStartTestRuntime,
  mockServerFn,
} from '@tanstack-router-testing/react-start-testing';

const runtime = await createStartTestRuntime({
  request: 'http://localhost:3000/api/orders',
  env: 'server',
});

const listOrders = createServerFn()
  .validator((input: { userId: string }) => input)
  .handler(async ({ data }) => [{ id: '1', userId: data.userId }]);

mockServerFn(listOrders, async ({ data }) => [
  { id: 'mock-1', userId: data.userId },
]);

const orders = await runtime.call(listOrders, [{ data: { userId: 'u1' } }]);
// orders === [{ id: 'mock-1', userId: 'u1' }]

runtime.cleanup();
```

---

#### `createRscTestRuntime(options?)`

```ts
function createRscTestRuntime(
  options?: RscTestRuntimeOptions,
): Promise<RscTestRuntime>;
```

Create an `RscTestRuntime` for rendering React Server Components in a simulated TanStack Start environment. Delegates to `createStartTestRuntime` for the base runtime, then adds `renderServerComponent` which uses `react-dom/server`.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `options` | `RscTestRuntimeOptions` | Runtime configuration including the optional `streaming` flag. |

**Returns:** `Promise<RscTestRuntime>`

**Example:**

```tsx
import { createRscTestRuntime } from '@tanstack-router-testing/react-start-testing';

const runtime = await createRscTestRuntime({ streaming: true });

function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

const { html, chunks } = await runtime.renderServerComponent(Greeting, {
  name: 'TanStack',
});
// html === '<h1>Hello, TanStack!</h1>'

runtime.cleanup();
```

---

### Vite Plugin (via `./vite` subpath)

Import from `@tanstack-router-testing/react-start-testing/vite`.

#### `TanstackStartTestingOptions`

```ts
interface TanstackStartTestingOptions {
  readonly routesDirectory?: string;
  readonly generatedRouteTree?: string;
  readonly aliasReactStart?: boolean;
  readonly rsc?: boolean;
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `routesDirectory` | `string` | `'src/routes'` | Directory holding file-based routes, relative to the Vite root. |
| `generatedRouteTree` | `string` | `'src/routeTree.gen.ts'` | Output path for the generated route tree. |
| `aliasReactStart` | `boolean` | `true` | Whether to alias `@tanstack/react-start` to the test runtime shim. |
| `rsc` | `boolean` | `false` | Install a small test runtime module for TanStack Start RSC imports that need `virtual:tanstack-rsc-runtime` under Vitest. |

---

#### `tanstackStartTesting(options?)`

```ts
function tanstackStartTesting(
  options?: TanstackStartTestingOptions,
): readonly Plugin[];
```

Vite/Vitest plugins for TanStack Start tests. Keeps route-tree generation on the real TanStack Router plugin path while swapping the Start runtime to the in-process testing shim.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `options` | `TanstackStartTestingOptions` | Plugin configuration. Optional. |

**Returns:** `readonly Plugin[]` -- an array of Vite plugins.

**Example:**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { tanstackStartTesting } from '@tanstack-router-testing/react-start-testing/vite';

export default defineConfig({
  plugins: [
    tanstackStartTesting({
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
    }),
  ],
  test: {
    environment: 'jsdom',
  },
});
```

---

## `@tanstack-router-testing/react-start-testing-storybook`

Storybook integration for TanStack Start stories.

### Types

#### `TanStackStartStoryParameters<TRouteTree>`

```ts
// Per-pair generic binding: each tuple is typed against its own server fn.
type ServerFnMockPair<TFn extends AnyServerFn = AnyServerFn> =
  readonly [TFn, ServerFnMock<TFn>];

interface TanStackStartStoryParameters<TRouteTree extends AnyRoute = AnyRoute> {
  readonly routeTree: TRouteTree;
  readonly initialEntries?: readonly string[];
  readonly context?: Record<string, unknown>;
  readonly serverFnMocks?: readonly ServerFnMockPair[];
}
```

Story parameters consumed by `withTanStackStart`. Place under `parameters.tanstackStart` on a CSF3 story.

| Property | Type | Description |
|---|---|---|
| `routeTree` | `TRouteTree` | The route tree for the story's router. |
| `initialEntries` | `readonly string[]` | Initial navigation entries; last one is active. |
| `context` | `Record<string, unknown>` | Router context bag as declared by the root route. |
| `serverFnMocks` | `readonly ServerFnMockPair[]` | Array of `[serverFn, mockImplementation]` tuples. Each pair binds `TFn` independently, preserving type inference per server function. Installed via `mockServerFn` before the story renders and torn down afterwards. |

---

### Functions

#### `withTanStackStart()`

```ts
function withTanStackStart(): Decorator;
```

Storybook decorator that wraps the story in a `RouterContextProvider` backed by `createTestRouter`, and installs any `serverFnMocks` passed via story parameters. The decorator reads `parameters.tanstackStart` from the story context and throws if it is missing.

**Returns:** A Storybook `Decorator`.

**Example:**

```ts
// .storybook/preview.ts
import { withTanStackStart } from '@tanstack-router-testing/react-start-testing-storybook';

export const decorators = [withTanStackStart()];
```

```tsx
// OrderPage.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { routeTree } from '../src/routeTree.gen';
import { listOrders } from '../src/server/orders';
import { OrderPage } from './OrderPage';

const meta: Meta<typeof OrderPage> = {
  component: OrderPage,
};
export default meta;

type Story = StoryObj<typeof OrderPage>;

export const Default: Story = {
  parameters: {
    tanstackStart: {
      routeTree,
      initialEntries: ['/orders/42'],
      context: { auth: stubAuth },
      serverFnMocks: [[listOrders, async () => [{ id: 1, total: 42 }]]],
    },
  },
};
```
