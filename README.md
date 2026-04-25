# tanstack-router-testing

A community-preview test harness for TanStack Router and TanStack Start.

> **Status:** pre-0.1.0. APIs WILL change. Treat this as a shape-finding exercise aimed at attracting feedback from TanStack users and maintainers before a formal release.

## Why this exists

TanStack Router and Start still lack a compact first-party testing API. Upstream docs and maintainer discussion point toward real router instances with memory history instead of navigation mocks, while Start users still need a sane way to keep `createServerFn`, middleware, and `createIsomorphicFn` usable under Vitest (see [#4569](https://github.com/TanStack/router/issues/4569), [#6262](https://github.com/TanStack/router/issues/6262), and [#6246](https://github.com/TanStack/router/issues/6246)).

This repo ships a set of small, focused packages that let you write fast unit and integration tests for Start apps — **without** the workarounds that usually accompany Vitest + TanStack.

## Packages

| Package                                                                                              | Purpose                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`@tanstack-router-testing/react-router-testing`](./packages/react-router-testing)                   | `createTestRouter`, `createRouterHarness`, plus `./ssr`; future shape: `@tanstack/react-router/testing`. |
| [`@tanstack-router-testing/react-start-testing`](./packages/react-start-testing)                     | `mockServerFn`, `mockMiddleware`, `runInStartEnv`, `createStartTestRuntime`, `createRscTestRuntime`, `clearStartMocks`, plus `./vite`. |
| [`@tanstack-router-testing/router-testing-core`](./packages/router-testing-core)                     | Internal registry/env runtime; not a user-facing API.                                                 |
| [`@tanstack-router-testing/react-start-testing-storybook`](./packages/react-start-testing-storybook) | Experimental Storybook decorator, outside the v1 public contribution surface.                         |

## Design principles

1. **Real router, not route stubs.** Tests should exercise `createRouter`, generated route trees, memory history, loader execution, guards, params, search, and redirects through the router itself.
2. **Production-shaped Start calls.** Server functions are called as `await fn({ data })`; the harness supplies mocks, middleware overrides, request-scoped env control, SSR/RSC-aware Vitest wiring, and leaves the call shape alone.
3. **Upstream-mergeable shape.** Public exports are intentionally close to future first-party subpaths rather than a separate community-only package model.

## Repo layout

```
packages/            # Published libraries
vendor/              # TanStack/router examples + e2e apps, imported once at a pinned SHA
apps/playground/     # Local dogfood app for watch-mode harness work
docs/                # Getting-started and per-package guides
```

## Status

| Phase | Description                                                  | Done? |
| ----- | ------------------------------------------------------------ | ----- |
| 0     | Repo scaffold — workspace, toolchain, CI                     | ✅    |
| 1     | Vendor import (110 apps @ pinned SHA)                        | ✅    |
| 2     | `router-testing-core` (env + history + registries, 26 unit)  | ✅    |
| 2.5   | Start-interception ADR                                       | ✅    |
| 3     | `react-router-testing` real-router helpers                   | ✅    |
| 4     | `react-start-testing` direct server-fn helpers               | ✅    |
| 5     | Vitest plugin (Start shim alias via `react-start-testing/vite`) | ✅    |
| 6     | `react-start-testing-storybook` (renders stories in context) | ✅    |
| 7     | Type-d suites per package + integration tests                | ✅    |
| 8     | Docs + 0.1.0 publish                                         | —     |

## Testing the harness

- `pnpm -r run test:unit` — full workspace unit suite across core,
  router, Start, plugin, Storybook, and vendored app harness tests.
- `pnpm -r run test:types` — `@ts-expect-error` assertions under
  `test-d/` fail CI if a helper's generics get looser. Enforces
  type-fidelity guarantees per the plan.
- `pnpm run test:unit:core` — fast core shard for PR feedback.
- `pnpm run test:unit:vendored` — parity check plus vendored examples,
  React Router e2e apps, and React Start e2e apps as separate shards.

### Vendored-app harness tests

`scripts/gen-vendor-smoke-tests.mjs` scaffolds one smoke test per
vendored app into
`packages/react-router-testing/tests/vendored/<category>/<app>.test.ts`.
As of the latest run:

- **108 / 110 vendored app test files pass** under Vitest.
- **472 generated vendored assertions pass** across those 108 apps. Each
  route-tree-backed app now checks route id registry integrity, parent
  links, initial URL matching, static route matching, and mounted router
  state; code-based apps boot through their browser entrypoints and assert
  they mount into a DOM root.
- **2 apps** remain `it.todo` because they are empty RSC placeholder
  directories with no package, source entrypoint, or route tree.
- **0 vendored app files fail** in the committed suite. Third-party
  app imports are installed where practical; generated or runtime-only
  modules (Cloudflare workers, Paraglide output, static server functions,
  Prisma engine boot, and browser entrypoints) are handled by explicit
  test-only Vite virtual modules.

Run the full smoke suite with:

```sh
pnpm run test:unit:vendored
```

Regenerate after a fresh vendor import with:

```sh
node scripts/gen-vendor-smoke-tests.mjs
```

The generator also runs TanStack's `@tanstack/router-generator` for
vendored file-based apps that have `src/routes` but no committed
`src/routeTree.gen.ts`, mirroring what their normal Vite/Rspack plugin
setup does during app startup.

The `~/` TS path alias used by every Start app is handled by an inline
Vite plugin in `packages/react-router-testing/vitest.config.ts` that
walks up from the importer to the nearest `src/` sibling. No per-app
tsconfig magic required. The same test plugin also handles vendored
`@/` aliases, extensionless TS/TSX resolution, selected app-generated
modules, and the local `@tanstack/react-start` shim alias.

See [`/home/node/.claude/plans/i-want-you-to-nifty-allen.md`](./docs/plan.md) (mirrored into `docs/plan.md` at the first publish) for the full build plan.

## License

[MIT](./LICENSE)
