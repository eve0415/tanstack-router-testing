# tanstack-router-testing

Unit testing utilities for [TanStack Router](https://tanstack.com/router) and [TanStack Start](https://tanstack.com/start).

## Quick start

```bash
pnpm add -D @tanstack-router-testing/react-router-testing @tanstack-router-testing/react-start-testing
```

Configure Vitest with the Start shim:

```ts
// vitest.config.ts
import { tanstackStartTesting } from '@tanstack-router-testing/react-start-testing/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tanstackStartTesting()],
  test: { environment: 'jsdom' },
});
```

Write your first test — import a single route file, pass it to the harness, and assert:

```tsx
// posts.$postId.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { Route } from './routes/posts.$postId';

describe('post route', () => {
  it('loads and renders a post', async () => {
    const harness = createRouterHarness({
      route: Route,
      params: { postId: '42' },    // fully typed from route path
      loaderData: { id: '42', title: 'Hello' },  // skip the real loader
    });
    await harness.load();
    const { findByText } = render(<harness.TestRouterProvider />);
    await expect(findByText('Hello')).resolves.toBeTruthy();
    harness.cleanup();
  });
});
```

Or use a full route tree for integration-level tests:

```tsx
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { routeTree } from './routeTree.gen';

const harness = createRouterHarness({ routeTree, initialEntries: ['/posts/7'] });
await harness.load();
expect(harness.getLoaderData('/posts/$postId')).toBeDefined();
harness.cleanup();
```

## Packages

| Package | Purpose |
| --- | --- |
| [`react-router-testing`](./packages/react-router-testing) | `createRouterHarness` (file route or full tree), `createTestRouter`, SSR harness |
| [`react-start-testing`](./packages/react-start-testing) | `mockServerFn`, `mockMiddleware`, `createStartTestRuntime`, RSC runtime, Vite plugin |
| [`router-testing-core`](./packages/router-testing-core) | Internal registry/env runtime (transitive dependency) |
| [`react-start-testing-storybook`](./packages/react-start-testing-storybook) | Storybook decorator for Start stories |

All packages are scoped under `@tanstack-router-testing/`.

## Design principles

1. **Real router, not route stubs.** Tests exercise `createRouter`, route trees, memory history, loaders, guards, params, search, and redirects through the router itself.
2. **Production-shaped Start calls.** Server functions are called as `await fn({ data })` — the harness supplies mocks and leaves the call shape alone.
3. **Upstream-mergeable shape.** Public exports are shaped for future first-party subpaths (`@tanstack/react-router/testing`).

## Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- **Guides:** [Loaders](./docs/guides/testing-loaders.md) | [Guards & Redirects](./docs/guides/testing-guards.md) | [Server Functions](./docs/guides/testing-server-functions.md) | [Middleware](./docs/guides/testing-middleware.md) | [SSR](./docs/guides/testing-ssr.md) | [RSC](./docs/guides/testing-rsc.md) | [Query Integration](./docs/guides/testing-with-query.md)
- [Example Tests](./docs/examples/)

## Running tests

```bash
pnpm run build              # build all packages
pnpm test:unit:core         # fast core + integration tests
pnpm test:types             # type-level assertions
pnpm test:unit:vendored     # 110 vendored TanStack app smoke tests
pnpm run lint:check         # oxlint + oxfmt
```

## Contributing

This project aims to become an upstream contribution to `tanstack/router`. Feedback, issues, and PRs welcome.

## License

[MIT](./LICENSE)
