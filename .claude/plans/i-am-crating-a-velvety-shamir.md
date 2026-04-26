# TanStack Router/Start Testing Library — Full Implementation Plan

## Context

This project provides unit testing utilities for TanStack Router and TanStack Start applications. TanStack Start has no official unit testing support — only e2e tests with Playwright. The community has repeatedly requested testing utilities (GitHub issues #4569, #5727, #655, #1749) and no third-party libraries exist.

The library allows users to write unit tests by installing required packages and writing test code — no workarounds. The goal is to eventually contribute upstream to `tanstack/router` so testing ships out of the box. All APIs mirror TanStack's own patterns (options objects, builder pattern, generics-first type inference, discriminated unions).

**Key interview decisions:**

- **4 published packages:** `router-testing-core` (transitive), `react-router-testing`, `react-start-testing` (with `./vite` subpath for Vitest plugin), `react-start-testing-storybook`
- **Scope:** `@tanstack-router-testing/`
- **Build on existing code**, refactor where decisions diverge
- **Shim + global registry** for server fn/middleware mocking
- **Two-level router API:** `createTestRouter` (low-level) + `createRouterHarness` (with helpers including `getError`, `getRedirect`)
- **Explicit cleanup** (no auto-teardown)
- **Vitest only**, latest TanStack minor version range
- **Full RSC coverage** including streaming, suspense boundaries, selective hydration, server/client component interleaving
- **SSR render + hydration testing**
- **Optional QueryClient** in router options
- **Middleware isolation testing** (call middleware with fake `next()` without full router)
- **Vitest `expectTypeOf`** for type-level assertions
- **TSDoc on all public exports** (summary + @param + @returns + @example)
- **Docs:** README + API reference + feature guides + example test files
- **Tiny commits to main** — one concern per commit
- **Real-world validation** against `eve0415/website`
- **Publish prep** (metadata, license, pack dry-run) but not actual npm publish

**Out of scope for v0.1.0:** Solid/Vue support, Jest support, docs site framework (VitePress/Starlight), npm publish, auto-cleanup hooks, router pooling/caching, test fixtures/factories.

## Research Findings

**TanStack ecosystem testing gap:**

- No official testing utilities for TanStack Start. Router has minimal docs (basic `createMemoryHistory` + `RouterProvider`).
- Community pain points: lazy route testing, server fn mocking, ~500ms overhead per test from pending delays, file route export mangling.
- TanStack's own test approach: real router instances, no mocking. Same philosophy adopted here.

**TanStack API patterns:**

- Factory functions with options objects (`createRouter({ routeTree, ... })`)
- Builder pattern for server fns (`createServerFn({ method }).handler(fn)`)
- Discriminated unions for mutual exclusivity
- Generics-first type inference with `Register` interface for global type registration
- `router-core` / `start-client-core` as framework-agnostic published dependencies

**TanStack Query testing reference:**

- Uses `QueryClientProvider` wrapper, `renderHook`, `waitFor`
- Focuses on real behavior over mocking — same philosophy here

**Key references:**

- [TanStack Router testing docs](https://tanstack.com/router/latest/docs/framework/react/how-to/setup-testing)
- [Testing proposal #4569](https://github.com/TanStack/router/issues/4569)
- [Testing docs request #5727](https://github.com/TanStack/router/discussions/5727)

## Architecture

4 packages: `router-testing-core` provides framework-agnostic primitives (memory history, env simulation, registries). `react-router-testing` wraps those for React with `createTestRouter`, `createRouterHarness` (with error/redirect helpers), and SSR harness. `react-start-testing` provides server fn mocking, middleware mocking + isolation, environment simulation, Start/RSC test runtimes, and a Vite plugin at `./vite`. `react-start-testing-storybook` provides a Storybook decorator. All packages use ESM, `tsdown` for builds, `oxlint` for linting, and `@typescript/native-preview` (tsgo) for type checking.

## Skills Reference

### During Implementation (invoke per task)

> - **TDD**: `Skill: superpowers:test-driven-development` — Test first, watch it fail, implement, watch it pass. Every task.
> - **Debugging**: `Skill: superpowers:systematic-debugging` — Invoke when ANY test fails or unexpected behavior occurs. Root cause first, no guess-and-fix.
> - **Verification**: `Skill: superpowers:verification-before-completion` — MANDATORY before claiming any task is done. Run the verification command, read the full output, THEN claim success. No "should work now."

### After All Tasks — Multi-Perspective Review

> Run ALL of these before declaring implementation complete. Each reviewer is independent — dispatch as separate subagents where applicable.
>
> 1. **Code quality** — `Skill: superpowers:requesting-code-review` — Dispatch `superpowers:code-reviewer` subagent. Check: correctness, naming, structure, test quality.
> 2. **Security** — `Skill: security-review` — Check: injection, auth bypass, secrets exposure, input validation, OWASP top 10.
> 3. **Simplification** — `Skill: simplify` — Check: dead code, unnecessary complexity, reuse opportunities, efficiency.
> 4. **CI verification** — Run full CI suite locally: `pnpm run build && pnpm run lint:check && pnpm test:unit:core && pnpm test:types && pnpm test:vendored:parity`.
> 5. **Architecture** — Dispatch `feature-dev:code-reviewer` subagent. Check: pattern consistency, dependency direction, separation of concerns.
>
> Fix issues found by each reviewer. Re-run the reviewer after fixes to confirm resolution.

### Completion

> - `Skill: superpowers:finishing-a-development-branch` — After all reviews pass.

---

## Tasks

### Phase 1: Package Restructuring

#### Task 1: Publish `router-testing-core` (remove `private: true`, add metadata)

**Files:**

- Modify: `packages/router-testing-core/package.json`

- [ ] **Step 1:** Remove `"private": true` from `packages/router-testing-core/package.json`
- [ ] **Step 2:** Add package metadata fields:
  ```json
  {
    "license": "MIT",
    "repository": {
      "type": "git",
      "url": "https://github.com/eve0415/tanstack-router-testing.git",
      "directory": "packages/router-testing-core"
    },
    "author": "eve0415",
    "keywords": ["tanstack", "router", "testing", "vitest"]
  }
  ```
- [ ] **Step 3:** Add the same metadata fields to all other packages that are missing them (`react-router-testing`, `react-start-testing`, `react-start-testing-storybook`)
- [ ] **Step 4:** Create `LICENSE` file at repo root if missing (MIT)
- [ ] **Step 5:** Verify build: `pnpm run build`
- [ ] **Step 6:** Commit: `chore: make router-testing-core publishable and add package metadata`

#### Task 2: Delete `router-testing-plugin` package

The `router-testing-plugin` package is redundant — identical functionality already exists in `react-start-testing/src/vite.ts` with better TSDoc.

**Files:**

- Delete: `packages/router-testing-plugin/` (entire directory)
- Modify: `pnpm-workspace.yaml` (if it references this package)
- Modify: Any files that import from `@tanstack-router-testing/router-testing-plugin`

- [ ] **Step 1:** Search for all imports of `@tanstack-router-testing/router-testing-plugin` across the codebase
  ```bash
  grep -r "@tanstack-router-testing/router-testing-plugin" --include="*.ts" --include="*.tsx" --include="*.json"
  ```
- [ ] **Step 2:** Update any consuming files to import from `@tanstack-router-testing/react-start-testing/vite` instead
- [ ] **Step 3:** Delete `packages/router-testing-plugin/` entirely
- [ ] **Step 4:** Run `pnpm install` to update lockfile
- [ ] **Step 5:** Verify build: `pnpm run build`
- [ ] **Step 6:** Verify tests: `pnpm test:unit:core`
- [ ] **Step 7:** Commit: `refactor: remove redundant router-testing-plugin package`

#### Task 3: Export SSR from `react-router-testing` main index

SSR harness exists at `packages/react-router-testing/src/ssr.tsx` but is not exported from the main index. The `./ssr` subpath export exists in `package.json` but the main `index.ts` should document its existence.

**Files:**

- Modify: `packages/react-router-testing/src/index.ts`

- [ ] **Step 1:** Add SSR re-exports to `packages/react-router-testing/src/index.ts`. The SSR module stays as a separate subpath export (`./ssr`) since it pulls in `react-dom/server` which not all users need. But the types should be accessible from the main entry point for discoverability:
  ```ts
  // Add to index.ts — types only, runtime via ./ssr subpath
  export type { CreateRouterSsrHarnessOptions, HydrateRouterSsrOptions, RouterSsrHarness, RouterSsrMode } from './ssr.tsx';
  ```
- [ ] **Step 2:** Verify build: `pnpm run build`
- [ ] **Step 3:** Verify type check: `cd packages/react-router-testing && pnpm test:types`
- [ ] **Step 4:** Commit: `feat(react-router-testing): export SSR types from main entry point`

---

### Phase 2: Router Harness Enhancements

#### Task 4: Add `getError()` to `RouterHarness`

Add a method to inspect error state on route matches. TanStack Router stores errors on `match.error`.

**Files:**

- Modify: `packages/react-router-testing/src/createRouterHarness.tsx`
- Test: `packages/react-router-testing/tests/integration/harness.test.tsx`

- [ ] **Step 1: Write failing test**
  ```tsx
  it('getError returns the error thrown by a loader', async () => {
    const error = new Error('loader failed');
    const rootRoute = createRootRoute();
    const failRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/fail',
      loader: () => {
        throw error;
      },
      errorComponent: () => <div>Error</div>,
    });
    const tree = rootRoute.addChildren([failRoute]);
    const harness = createRouterHarness({
      routeTree: tree,
      initialEntries: ['/fail'],
    });
    await harness.load();
    expect(harness.getError('/fail')).toBe(error);
    harness.cleanup();
  });
  ```
- [ ] **Step 2:** Run test, verify it fails (getError doesn't exist yet)
  ```bash
  cd packages/react-router-testing && pnpm vitest run tests/integration/harness.test.tsx
  ```
- [ ] **Step 3: Implement** — Add `getError` to `RouterHarness` interface and implementation:

  ```tsx
  // In RouterHarness interface:
  readonly getError: (target: RouteMatchTarget) => unknown;

  // In createRouterHarness return:
  getError: target => findMatch(target)?.error,
  ```

- [ ] **Step 4:** Run test, verify it passes
- [ ] **Step 5:** Commit: `feat(react-router-testing): add getError() to RouterHarness`

#### Task 5: Add `getRedirect()` to `RouterHarness`

Add a helper that navigates to a route and returns the final location if the router redirected. This wraps the navigate-then-inspect pattern.

**Files:**

- Modify: `packages/react-router-testing/src/createRouterHarness.tsx`
- Test: `packages/react-router-testing/tests/integration/harness.test.tsx`

- [ ] **Step 1: Write failing test**
  ```tsx
  it('getRedirect returns the resolved location after a redirect', async () => {
    const rootRoute = createRootRoute();
    const protectedRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/protected',
      beforeLoad: () => {
        throw redirect({ to: '/login' });
      },
    });
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/login',
      component: () => <div>Login</div>,
    });
    const tree = rootRoute.addChildren([protectedRoute, loginRoute]);
    const harness = createRouterHarness({
      routeTree: tree,
      initialEntries: ['/'],
    });
    await harness.load();
    const result = await harness.getRedirect({ to: '/protected' });
    expect(result).toBeDefined();
    expect(result!.pathname).toBe('/login');
    harness.cleanup();
  });
  ```
- [ ] **Step 2:** Run test, verify it fails
- [ ] **Step 3: Implement** — `getRedirect` navigates and checks if the final location differs:

  ```tsx
  // In RouterHarness interface:
  readonly getRedirect: (options: Parameters<TRouter['navigate']>[0]) => Promise<{ pathname: string; search: string; hash: string } | undefined>;

  // In createRouterHarness return:
  getRedirect: async (options) => {
    const before = router.state.location.pathname;
    await router.navigate(options).catch(() => {});
    const after = router.state.location;
    if (after.pathname === (options as { to?: string }).to) return undefined;
    return { pathname: after.pathname, search: after.searchStr, hash: after.hash };
  },
  ```

  Note: The exact implementation needs to handle TanStack Router's redirect mechanism. Router catches `redirect()` throws in `beforeLoad` and navigates to the redirect target. After `router.navigate()` settles, the location reflects the final destination, not the intended one. Compare the settled location to the originally requested path.

- [ ] **Step 4:** Run test, verify it passes
- [ ] **Step 5:** Commit: `feat(react-router-testing): add getRedirect() to RouterHarness`

#### Task 6: Add optional `QueryClient` support

Accept an optional `QueryClient` in `createTestRouter` and `createRouterHarness` options. When provided, `TestRouterProvider` wraps in `QueryClientProvider`.

**Files:**

- Modify: `packages/react-router-testing/src/createTestRouter.ts`
- Modify: `packages/react-router-testing/src/createRouterHarness.tsx`
- Modify: `packages/react-router-testing/package.json` (add `@tanstack/react-query` as optional peer dep)
- Test: `packages/react-router-testing/tests/integration/harness.test.tsx`

- [ ] **Step 1: Write failing test**
  ```tsx
  it('TestRouterProvider wraps in QueryClientProvider when queryClient is provided', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const rootRoute = createRootRoute({
      component: () => {
        const qc = useQueryClient();
        return <div data-testid='has-query'>{qc ? 'yes' : 'no'}</div>;
      },
    });
    const tree = rootRoute.addChildren([]);
    const harness = createRouterHarness({ routeTree: tree, queryClient });
    await harness.load();
    const { getByTestId } = render(<harness.TestRouterProvider />);
    expect(getByTestId('has-query').textContent).toBe('yes');
    harness.cleanup();
    queryClient.clear();
  });
  ```
- [ ] **Step 2:** Run test, verify it fails
- [ ] **Step 3: Implement**
  - Add `queryClient?: QueryClient` to `CreateTestRouterOptions` (where `QueryClient` is imported from `@tanstack/react-query` only when present)
  - In `createRouterHarness`, if `queryClient` is provided, wrap `RouterProvider` in `QueryClientProvider`
  - Add `@tanstack/react-query` as optional peer dependency in `package.json`:
    ```json
    "peerDependencies": {
      "@tanstack/react-query": "^5.0.0"
    },
    "peerDependenciesMeta": {
      "@tanstack/react-query": { "optional": true }
    }
    ```
- [ ] **Step 4:** Run test, verify it passes
- [ ] **Step 5:** Commit: `feat(react-router-testing): add optional QueryClient support`

---

### Phase 3: Middleware Isolation Testing

#### Task 7: Add `callMiddleware()` utility to `router-testing-core`

Allow calling a middleware directly with a test context and fake `next()`, without needing a full router.

**Files:**

- Create: `packages/router-testing-core/src/call-middleware.ts`
- Modify: `packages/router-testing-core/src/index.ts`
- Test: `packages/router-testing-core/src/call-middleware.test.ts`

- [ ] **Step 1: Write failing test**

  ```ts
  import { describe, expect, it } from 'vitest';
  import { callMiddleware, registerMiddleware } from './index.ts';

  describe('callMiddleware', () => {
    it('calls server phase with context and returns result', async () => {
      const mw = {};
      const serverImpl = async ({ next, context }: { next: (ctx?: { context?: unknown }) => Promise<unknown>; context: unknown }) => {
        return next({ context: { ...(context as Record<string, unknown>), added: true } });
      };
      registerMiddleware(mw, { server: serverImpl });

      const result = await callMiddleware(mw, {
        phase: 'server',
        context: { existing: 'value' },
      });
      expect(result.context).toEqual({ existing: 'value', added: true });
    });

    it('calls client phase', async () => {
      const mw = {};
      const clientImpl = async ({ next, context }: any) => next({ context: { ...(context as any), client: true } });
      registerMiddleware(mw, { client: clientImpl, server: undefined });

      const result = await callMiddleware(mw, { phase: 'client', context: {} });
      expect(result.context).toEqual({ client: true });
    });

    it('throws if middleware not registered', async () => {
      const mw = {};
      await expect(callMiddleware(mw, { phase: 'server', context: {} })).rejects.toThrow('not registered');
    });

    it('throws if requested phase does not exist', async () => {
      const mw = {};
      registerMiddleware(mw, { server: async ({ next }) => next() });
      await expect(callMiddleware(mw, { phase: 'client', context: {} })).rejects.toThrow('no client phase');
    });

    it('uses mock phase when set', async () => {
      const mw = {};
      registerMiddleware(mw, { server: async ({ next }) => next() });
      setMiddlewareMock(mw, { server: async ({ next, context }) => next({ context: { ...(context as any), mocked: true } }) });

      const result = await callMiddleware(mw, { phase: 'server', context: {} });
      expect(result.context).toEqual({ mocked: true });
    });
  });
  ```

- [ ] **Step 2:** Run test, verify it fails
- [ ] **Step 3: Implement**

  ```ts
  // packages/router-testing-core/src/call-middleware.ts
  import type { AnyFn } from './server-fn-registry.ts';
  import { getMiddlewareEntry } from './middleware-registry.ts';

  export interface CallMiddlewareOptions {
    readonly phase: 'server' | 'client';
    readonly context?: unknown;
    readonly request?: Request;
  }

  export interface CallMiddlewareResult {
    readonly context: unknown;
    readonly response?: unknown;
  }

  export const callMiddleware = async (mw: object, options: CallMiddlewareOptions): Promise<CallMiddlewareResult> => {
    const entry = getMiddlewareEntry(mw);
    if (!entry) {
      throw new Error('[tanstack-router-testing] Cannot call an unregistered middleware. ' + 'Register it with registerMiddleware() first.');
    }

    const phase = options.phase;
    const impl: AnyFn | undefined = phase === 'server' ? (entry.mockServer ?? entry.originalServer) : (entry.mockClient ?? entry.originalClient);

    if (!impl) {
      throw new Error(`[tanstack-router-testing] Middleware has no ${phase} phase registered.`);
    }

    let finalContext: unknown = options.context ?? {};

    const next = async (ctx?: { readonly context?: unknown }): Promise<{ context: unknown }> => {
      if (ctx?.context !== undefined) {
        finalContext = ctx.context;
      }
      return { context: finalContext };
    };

    await impl({
      next,
      context: options.context ?? {},
      request: options.request ?? new Request('http://tanstack-router-testing.test/'),
    });

    return { context: finalContext };
  };
  ```

- [ ] **Step 4:** Export from `packages/router-testing-core/src/index.ts`
- [ ] **Step 5:** Run test, verify it passes
- [ ] **Step 6:** Commit: `feat(router-testing-core): add callMiddleware() for isolated middleware testing`

#### Task 8: Add `callMiddleware()` re-export to `react-start-testing`

**Files:**

- Modify: `packages/react-start-testing/src/index.ts`

- [ ] **Step 1:** Re-export `callMiddleware` and its types from `react-start-testing`:
  ```ts
  export { type CallMiddlewareOptions, type CallMiddlewareResult, callMiddleware } from '@tanstack-router-testing/router-testing-core';
  ```
- [ ] **Step 2:** Verify build: `pnpm run build`
- [ ] **Step 3:** Commit: `feat(react-start-testing): re-export callMiddleware for convenience`

---

### Phase 4: RSC Testing Utilities

#### Task 9: Create dedicated RSC test harness

Replace the `createRscTestRuntime = createStartTestRuntime` alias with a proper RSC-specific runtime that supports rendering server components, streaming, suspense boundaries, and server/client component interleaving validation.

**Files:**

- Create: `packages/react-start-testing/src/rsc.tsx`
- Modify: `packages/react-start-testing/src/index.ts`
- Modify: `packages/react-start-testing/src/runtime.ts` (remove alias)
- Test: `packages/react-start-testing/tests/integration/rsc.test.tsx`

- [ ] **Step 1: Design RSC harness interface**

  ```ts
  export interface RscTestRuntimeOptions extends StartTestRuntimeOptions {
    readonly streaming?: boolean;
  }

  export interface RscRenderResult {
    readonly html: string;
    readonly stream: ReadableStream<Uint8Array> | null;
    readonly chunks: readonly string[];
    readonly suspendedComponents: readonly string[];
    readonly hydratedRegions: readonly string[];
  }

  export interface RscTestRuntime extends StartTestRuntime {
    readonly renderServerComponent: <TProps>(component: React.ComponentType<TProps>, props: TProps) => Promise<RscRenderResult>;
    readonly assertNoClientComponentViolation: (element: React.ReactElement) => void;
  }
  ```

- [ ] **Step 2: Write failing tests** for each RSC capability:
  - Render a server component and get HTML
  - Stream a server component and collect chunks
  - Detect suspended components
  - Validate server/client component boundaries
  - Test selective hydration regions
- [ ] **Step 3: Implement** RSC harness:
  - `renderServerComponent`: uses `ReactDOMServer.renderToString` (non-streaming) or `renderToPipeableStream` / `renderToReadableStream` (streaming) to render server components
  - Chunk collection via `TransformStream` that captures each enqueued chunk
  - Suspense detection by wrapping components in error boundaries that catch `Suspense` throws and recording which component names suspended
  - Server/client boundary validation: walk the React element tree and verify no server-only imports appear inside client component subtrees
  - Selective hydration: track which DOM regions get hydration markers
- [ ] **Step 4:** Export from index: `export { createRscTestRuntime, type RscTestRuntime, type RscRenderResult, type RscTestRuntimeOptions } from './rsc.tsx';`
- [ ] **Step 5:** Remove the alias from `runtime.ts`
- [ ] **Step 6:** Run tests, verify they pass
- [ ] **Step 7:** Commit: `feat(react-start-testing): implement dedicated RSC test runtime`

**Note:** RSC internals are experimental in both React and TanStack Start. The implementation should be pragmatic — provide what's testable today (render, streaming, suspense detection) and use clear error messages for features that depend on unstable React APIs. Each sub-feature (streaming, suspense, hydration, interleaving) may need to be implemented incrementally with its own tests and commit.

#### Task 10: RSC streaming test helpers

**Files:**

- Modify: `packages/react-start-testing/src/rsc.tsx`
- Test: `packages/react-start-testing/tests/integration/rsc-streaming.test.tsx`

- [ ] **Step 1: Write failing test**
  ```tsx
  it('collects streaming chunks from a server component', async () => {
    const SlowComponent = async () => {
      return <div>loaded</div>;
    };
    const runtime = await createRscTestRuntime({ streaming: true });
    const result = await runtime.renderServerComponent(SlowComponent, {});
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.html).toContain('loaded');
    runtime.cleanup();
  });
  ```
- [ ] **Step 2:** Implement streaming chunk collection
- [ ] **Step 3:** Run test, verify it passes
- [ ] **Step 4:** Commit: `feat(react-start-testing): add RSC streaming chunk collection`

#### Task 11: RSC suspense boundary testing

**Files:**

- Modify: `packages/react-start-testing/src/rsc.tsx`
- Test: `packages/react-start-testing/tests/integration/rsc-suspense.test.tsx`

- [ ] **Step 1: Write failing test**
  ```tsx
  it('detects which components are suspended', async () => {
    const AsyncComponent = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return <div>async content</div>;
    };
    const runtime = await createRscTestRuntime({ streaming: true });
    const result = await runtime.renderServerComponent(
      () => (
        <Suspense fallback={<div>loading</div>}>
          <AsyncComponent />
        </Suspense>
      ),
      {},
    );
    expect(result.suspendedComponents).toContain('AsyncComponent');
    runtime.cleanup();
  });
  ```
- [ ] **Step 2:** Implement suspense detection
- [ ] **Step 3:** Run test, verify it passes
- [ ] **Step 4:** Commit: `feat(react-start-testing): add RSC suspense boundary detection`

#### Task 12: RSC server/client component interleaving validation

**Files:**

- Modify: `packages/react-start-testing/src/rsc.tsx`
- Test: `packages/react-start-testing/tests/integration/rsc-boundaries.test.tsx`

- [ ] **Step 1: Write failing test**

  ```tsx
  it('validates server/client component boundaries', () => {
    const runtime = createRscTestRuntime();
    // This should not throw — valid: server renders client component
    expect(() =>
      runtime.assertNoClientComponentViolation(
        <ServerWrapper>
          <ClientComponent />
        </ServerWrapper>,
      ),
    ).not.toThrow();

    // This should throw — invalid: client component renders server-only code
    // (Exact implementation depends on how TanStack Start marks boundaries)
  });
  ```

- [ ] **Step 2:** Implement boundary validation
- [ ] **Step 3:** Run test, verify it passes
- [ ] **Step 4:** Commit: `feat(react-start-testing): add RSC boundary validation`

#### Task 13: RSC selective hydration testing

**Files:**

- Modify: `packages/react-start-testing/src/rsc.tsx`
- Test: `packages/react-start-testing/tests/integration/rsc-hydration.test.tsx`

- [ ] **Step 1: Write tests** for selective hydration:
  - Verify which DOM regions receive hydration markers
  - Assert that server-only components are NOT hydrated
  - Assert that client components ARE hydrated
- [ ] **Step 2:** Implement hydration region tracking
- [ ] **Step 3:** Run tests, verify they pass
- [ ] **Step 4:** Commit: `feat(react-start-testing): add RSC selective hydration testing`

---

### Phase 5: TSDoc & Type Testing

#### Task 14: Complete TSDoc on all public exports

Every public function and type needs: summary, `@param`, `@returns`, `@example`. Use `@link` for cross-references and `@remarks` for gotchas.

**Files to update (in order):**

1. `packages/react-router-testing/src/createRouterHarness.tsx` — `createRouterHarness` function, `RouterHarness` interface (all methods), `RouteMatchTarget` type
2. `packages/react-start-testing/src/mockServerFn.ts` — `mockServerFn`, `ServerFnMock`, `AnyServerFn`
3. `packages/react-start-testing/src/mockMiddleware.ts` — `mockMiddleware` (add `@param`, `@returns`, `@example`)
4. `packages/react-start-testing/src/clearStartMocks.ts` — `clearStartMocks` (add `@example`)
5. `packages/react-start-testing/src/isomorphic.ts` — `runInStartEnv` (full TSDoc)
6. `packages/react-start-testing/src/runtime.ts` — `createStartTestRuntime`, `StartTestRuntime` interface methods, `StartTestRuntimeOptions`, `StartTestRunOptions`
7. `packages/react-start-testing/src/rsc.tsx` — all new RSC exports (done during Phase 4)
8. `packages/router-testing-core/src/call-middleware.ts` — `callMiddleware`, `CallMiddlewareOptions`, `CallMiddlewareResult` (done during Phase 3)
9. `packages/react-start-testing-storybook/src/index.ts` — `withTanStackStart`, `TanStackStartStoryParameters`

**TSDoc pattern to follow (already established in `router-testing-core`):**

````ts
/**
 * One-line summary of what this does.
 *
 * @param name - Description of the parameter.
 * @returns Description of what is returned.
 *
 * @example
 * ```ts
 * // Minimal usage example
 * const result = apiCall({ option: value });
 * ```
 *
 * @remarks
 * Any gotchas or non-obvious behavior.
 */
````

- [ ] **Step 1:** Update each file with complete TSDoc
- [ ] **Step 2:** Verify type check passes: `pnpm run build && tsgo --noEmit` in each package
- [ ] **Step 3:** Commit each file or small group: `docs: add TSDoc to [component]`

#### Task 15: Add Vitest `expectTypeOf` type assertions

Add positive type assertions using Vitest's `expectTypeOf` to existing `test-d/` files and create new ones where missing.

**Files:**

- Modify: `packages/router-testing-core/test-d/history.test-d.ts`
- Modify: `packages/router-testing-core/test-d/env.test-d.ts`
- Modify: `packages/router-testing-core/test-d/server-fn-registry.test-d.ts`
- Modify: `packages/react-router-testing/test-d/createTestRouter.test-d.ts`
- Create: `packages/react-router-testing/test-d/createRouterHarness.test-d.ts`
- Modify: `packages/react-start-testing/test-d/isomorphic.test-d.ts`
- Create: `packages/react-start-testing/test-d/mockServerFn.test-d.ts`
- Create: `packages/react-start-testing/test-d/runtime.test-d.ts`
- Create: `packages/router-testing-core/test-d/call-middleware.test-d.ts`

**Configuration:** Vitest `expectTypeOf` works in typecheck mode. Ensure each package's `vitest.config.ts` has:

```ts
export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },
  },
});
```

**Example assertions to add:**

```ts
// packages/react-router-testing/test-d/createRouterHarness.test-d.ts
import { expectTypeOf, test } from 'vitest';
import { createRouterHarness, type RouterHarness } from '../src/index.ts';
import { createRootRoute, createRoute } from '@tanstack/react-router';

test('createRouterHarness returns RouterHarness typed with the route tree', () => {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
  });
  const tree = rootRoute.addChildren([indexRoute]);
  const harness = createRouterHarness({ routeTree: tree });

  expectTypeOf(harness.router).toHaveProperty('navigate');
  expectTypeOf(harness.load).toBeFunction();
  expectTypeOf(harness.load()).resolves.toBeVoid();
  expectTypeOf(harness.getLoaderData).toBeCallableWith('/');
  expectTypeOf(harness.getError).toBeCallableWith('/');
  expectTypeOf(harness.cleanup).toBeFunction();
});

test('getMatch returns AnyRouteMatch or undefined', () => {
  // ...verify return type matches AnyRouteMatch | undefined
});
```

- [ ] **Step 1:** Add `expectTypeOf` assertions to existing test-d files (keep existing `@ts-expect-error` assertions)
- [ ] **Step 2:** Create new test-d files for harness, mockServerFn, runtime, callMiddleware
- [ ] **Step 3:** Update vitest configs if needed for typecheck mode
- [ ] **Step 4:** Run type tests: `pnpm test:types`
- [ ] **Step 5:** Commit: `test: add expectTypeOf type-level assertions across all packages`

---

### Phase 6: Documentation & Examples

#### Task 16: Write getting-started guide

**Files:**

- Create: `docs/getting-started.md`

Cover:

1. Install packages (`pnpm add -D @tanstack-router-testing/react-router-testing @tanstack-router-testing/react-start-testing`)
2. Configure Vitest (`vitest.config.ts` with `tanstackStartTesting()` plugin)
3. Write first test (create test router, render, assert)
4. Common patterns (beforeEach/afterEach cleanup)

- [ ] **Step 1:** Write the guide with complete code examples
- [ ] **Step 2:** Commit: `docs: add getting-started guide`

#### Task 17: Write API reference

**Files:**

- Create: `docs/api-reference.md`

Hand-written from TSDoc. Organized by package:

1. `router-testing-core` — createTestHistory, env utilities, registries, callMiddleware
2. `react-router-testing` — createTestRouter, createRouterHarness, RouterHarness methods, SSR harness
3. `react-start-testing` — mockServerFn, mockMiddleware, clearStartMocks, runInStartEnv, createStartTestRuntime, createRscTestRuntime, Vite plugin
4. `react-start-testing-storybook` — withTanStackStart

Each entry: signature, description, parameters, return type, example.

- [ ] **Step 1:** Write the reference
- [ ] **Step 2:** Commit: `docs: add API reference`

#### Task 18: Write feature guides

**Files:**

- Create: `docs/guides/testing-loaders.md` — Testing route loaders and data fetching
- Create: `docs/guides/testing-guards.md` — Testing beforeLoad, redirects, auth guards
- Create: `docs/guides/testing-server-functions.md` — Mocking server functions with mockServerFn
- Create: `docs/guides/testing-middleware.md` — Mocking and isolating middleware
- Create: `docs/guides/testing-ssr.md` — SSR render and hydration testing
- Create: `docs/guides/testing-rsc.md` — RSC testing (streaming, suspense, boundaries)
- Create: `docs/guides/testing-with-query.md` — TanStack Query integration

Each guide: problem statement, setup, step-by-step example, common pitfalls.

- [ ] **Step 1:** Write each guide
- [ ] **Step 2:** Commit each guide individually: `docs: add [topic] testing guide`

#### Task 19: Write example test files

**Files:**

- Create: `docs/examples/router-basics.test.tsx` — createTestRouter, createRouterHarness, navigate, getLoaderData
- Create: `docs/examples/server-functions.test.tsx` — mockServerFn, clearStartMocks
- Create: `docs/examples/middleware.test.tsx` — mockMiddleware, callMiddleware isolation
- Create: `docs/examples/rsc.test.tsx` — createRscTestRuntime, streaming, suspense
- Create: `docs/examples/ssr.test.tsx` — createRouterSsrHarness, hydrate
- Create: `docs/examples/query-integration.test.tsx` — QueryClient with router harness
- Create: `docs/examples/guards-redirects.test.tsx` — beforeLoad, getRedirect, getError

Each file is a complete, runnable Vitest test that demonstrates the feature.

- [ ] **Step 1:** Write example test files with realistic scenarios
- [ ] **Step 2:** Verify they compile: `tsgo --noEmit` against example files
- [ ] **Step 3:** Commit: `docs: add example test files for all features`

#### Task 20: Polish README

**Files:**

- Modify: `README.md`

Update to reflect final package structure, remove phase checklist (no longer pre-release tracking), add:

- Badges (npm version, CI status, license)
- Quick install + first test example
- Links to docs/guides
- Package overview table
- Contributing section

- [ ] **Step 1:** Rewrite README
- [ ] **Step 2:** Commit: `docs: update README for v0.1.0`

#### Task 21: Add per-package READMEs

**Files:**

- Create: `packages/router-testing-core/README.md`
- Create: `packages/react-router-testing/README.md`
- Create: `packages/react-start-testing/README.md`
- Create: `packages/react-start-testing-storybook/README.md`

Each: brief overview, install command, link to main docs.

- [ ] **Step 1:** Write per-package READMEs
- [ ] **Step 2:** Commit: `docs: add per-package READMEs`

---

### Phase 7: Publish Prep & Validation

#### Task 22: Publish preparation

**Files:**

- Verify: All `package.json` files have `license`, `repository`, `author`, `keywords`
- Verify: `LICENSE` file exists at root
- Verify: `files` field in each `package.json` includes only `dist/`
- Run: `npm pack --dry-run` in each package to verify contents

- [ ] **Step 1:** Audit all package.json files for required npm fields
- [ ] **Step 2:** Run `npm pack --dry-run` in each package directory
- [ ] **Step 3:** Verify no unexpected files are included (no source, no tests)
- [ ] **Step 4:** Commit any fixes: `chore: finalize package metadata for publish`

#### Task 23: Real-world validation against `eve0415/website`

Clone `eve0415/website` to `/tmp` and validate the testing library works for a real TanStack Start app.

- [ ] **Step 1:** Clone the repo:
  ```bash
  git clone https://github.com/eve0415/website.git /tmp/eve0415-website
  cd /tmp/eve0415-website
  ```
- [ ] **Step 2:** Remove e2e/Playwright tests and dependencies:
  - Delete Playwright config and e2e test directories
  - Remove `@playwright/test` and related deps from `package.json`
- [ ] **Step 3:** Install the testing library (link from workspace):
  ```bash
  pnpm add -D @tanstack-router-testing/react-router-testing @tanstack-router-testing/react-start-testing
  ```
  (Or use `pnpm link` to point at the local workspace packages)
- [ ] **Step 4:** Configure Vitest with `tanstackStartTesting()` plugin
- [ ] **Step 5:** Write unit tests covering:
  - Route tree loads and renders
  - Server function mocking
  - Middleware mocking
  - Loader testing with data assertions
  - Navigation and redirect testing
  - Any RSC features the app uses
- [ ] **Step 6:** Iterate: fix any issues found, update the library, re-test
- [ ] **Step 7:** Exit criterion: all written tests pass, covering loaders, server fns, middleware, navigation
- [ ] **Step 8:** Document any issues found and fixes applied
- [ ] **Step 9:** Do NOT commit changes to the eve0415/website repo — learnings feed back into the library

---

## Verification

Run these commands to verify the complete implementation:

```bash
# 1. Build all packages
pnpm run build
# Expected: clean build, no errors

# 2. Lint + format check
pnpm run lint:check
# Expected: no lint errors, no format issues

# 3. Type check all packages
pnpm run typecheck  # or tsgo --noEmit in each package
# Expected: no type errors

# 4. Core unit tests
pnpm test:unit:core
# Expected: all tests pass (router-testing-core, react-router-testing, react-start-testing, react-start-testing-storybook)

# 5. Type tests
pnpm test:types
# Expected: all type-level assertions pass (expectTypeOf + @ts-expect-error)

# 6. Vendored app parity check
pnpm test:vendored:parity
# Expected: all vendored apps have corresponding test files

# 7. Vendored examples
pnpm test:unit:vendored:examples
# Expected: all 57 example apps pass

# 8. Vendored e2e router apps
pnpm test:unit:vendored:e2e-router
# Expected: all 19 router e2e apps pass

# 9. Vendored e2e Start apps
pnpm test:unit:vendored:e2e-start
# Expected: all 34 Start e2e apps pass

# 10. Package dry run
cd packages/router-testing-core && npm pack --dry-run
cd packages/react-router-testing && npm pack --dry-run
cd packages/react-start-testing && npm pack --dry-run
cd packages/react-start-testing-storybook && npm pack --dry-run
# Expected: only dist/ files included, no source/test files

# 11. Real-world validation
# Clone eve0415/website, add tests, verify they pass (see Task 23)
```

## Review Checklist

- [ ] Code quality review passed (`superpowers:requesting-code-review`)
  - All new code follows TanStack API patterns (options objects, factory functions, generics)
  - No `any` types leaked through public API boundaries
  - Naming consistent with TanStack conventions
  - Test quality: each test covers one behavior, clear arrange/act/assert
- [ ] Security review passed (`security-review`)
  - Global registries don't expose prototype pollution vectors
  - No command injection through user-provided options
  - Mock registries can't leak state between isolated test files
- [ ] Simplification review passed (`simplify`)
  - No dead code from deleted `router-testing-plugin`
  - No unused imports after restructuring
  - Reuse existing patterns (toRequest, mergeContext) instead of duplicating
- [ ] CI verification passed
  - `pnpm run build` — clean
  - `pnpm run lint:check` — clean
  - `pnpm test:unit:core` — all pass
  - `pnpm test:types` — all pass
  - `pnpm test:vendored:parity` — all pass
  - All vendored test suites pass
- [ ] Architecture review passed (`feature-dev:code-reviewer`)
  - Package dependencies flow correctly: core ← router-testing ← start-testing
  - No circular dependencies
  - Subpath exports (`./ssr`, `./vite`, `./shim`) are correctly configured in package.json
  - Peer dependencies are minimal and use appropriate version ranges
- [ ] Type fidelity verified
  - All generics forwarded through API boundaries without degradation
  - `expectTypeOf` assertions cover key inference paths
  - No `as unknown as` casts in public API (internal casts acceptable)
- [ ] TSDoc complete
  - Every public export has summary + @param + @returns + @example
  - Cross-links use @link
  - Gotchas flagged with @remarks
- [ ] Documentation complete
  - Getting started guide works end-to-end
  - API reference covers all exports
  - Feature guides cover all major use cases
  - Example test files compile and run
  - README updated for v0.1.0
- [ ] All issues from reviews fixed and re-verified
