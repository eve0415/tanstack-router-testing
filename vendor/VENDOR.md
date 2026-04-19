# Vendor

This directory contains a one-time copy of upstream apps from [`TanStack/router`](https://github.com/TanStack/router). The copy is **not synced** — every upstream bug fix, dependency bump, and API change is our problem until we explicitly re-import.

## Pinned upstream

| | |
|---|---|
| Repository | `https://github.com/TanStack/router` |
| Commit SHA | `cbf9ecfc69f1f9034befb00b1433f559ce395920` |
| Commit date | 2026-04-18 |
| Commit subject | `fix(nx): align playwright mode build target naming (#7223)` |

## Contents

| Path | Source | Apps | Purpose |
|---|---|---|---|
| `vendor/examples/react/` | `examples/react/` | 57 | React Router + Start usage examples the harness tests target |
| `vendor/e2e/react-router/` | `e2e/react-router/` | 19 | Playwright-based E2E apps for the router (no Start) |
| `vendor/e2e/react-start/` | `e2e/react-start/` | 34 | Playwright-based E2E apps for Start (primary harness target) |

Total: **110 apps**, ~22 MB.

## Workspace status

Vendored apps are **not** listed in `pnpm-workspace.yaml`. Their upstream `workspace:*` references point to packages only present in the real TanStack monorepo. Harness tests resolve those imports through the test runtime or root dev dependencies rather than adding vendored apps to this workspace.

Some upstream apps rely on their bundler plugin to create `src/routeTree.gen.ts` at dev/build time and do not commit that generated file. For testability, `scripts/gen-vendor-smoke-tests.mjs` may regenerate those route-tree files using `@tanstack/router-generator`. Treat those generated files as reproducible harness artifacts, not hand-authored vendor edits.

## Re-import procedure

When we need to refresh against upstream:

1. Remove the affected `vendor/<path>/` directory.
2. `git clone --depth 1 --filter=blob:none --sparse https://github.com/TanStack/router.git /tmp/tsrouter-src`
3. `cd /tmp/tsrouter-src && git sparse-checkout set <path> && git fetch --depth 1 origin <sha> && git checkout FETCH_HEAD`
4. Copy `<path>` back into `vendor/` and commit with message `vendor: re-import <path> from tanstack/router@<short-sha>`.
5. Update this file's **Pinned upstream** block.

No hand modifications should ever be made to vendored files inline. Test files authored by this project live outside `vendor/`; generated `routeTree.gen.ts` files may be refreshed by the harness generator when an upstream app normally produces them through its TanStack Router plugin.
