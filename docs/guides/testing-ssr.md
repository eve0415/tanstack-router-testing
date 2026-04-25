# SSR Render and Hydration Testing

## Problem

Server-side rendering involves creating a router, rendering it to HTML on the server, and hydrating it on the client. You need to verify that routes render correct HTML and that hydration produces no errors.

## Setup

The SSR harness lives under the `./ssr` subpath export.

```ts
import { createRouterSsrHarness } from '@tanstack-router-testing/react-router-testing/ssr';
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { describe, it, expect } from 'vitest';
```

## Defining Routes for SSR Tests

SSR tests need a `createRouter` factory function, not a pre-built router instance.

```tsx
const rootRoute = createRootRoute({
  component: () => (
    <div id="root">
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <h1>Home</h1>,
  loader: () => ({ title: 'Home Page' }),
});

const routeTree = rootRoute.addChildren([indexRoute]);

const createTestRouter = () =>
  createRouter({
    routeTree,
    defaultPendingMinMs: 0,
  });
```

## String Mode (Default)

Renders the entire page to a single HTML string using `renderToString`.

```ts
describe('SSR string mode', () => {
  it('renders the index route', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createTestRouter,
      request: 'http://localhost:3000/',
    });

    expect(harness.html).toContain('<h1>Home</h1>');
    expect(harness.mode).toBe('string');
    expect(harness.response.status).toBe(200);
  });
});
```

## Stream Mode

Renders via `renderToReadableStream`, producing a streamable response.

```ts
describe('SSR stream mode', () => {
  it('streams the index route', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createTestRouter,
      request: 'http://localhost:3000/',
      mode: 'stream',
    });

    expect(harness.html).toContain('<h1>Home</h1>');
    expect(harness.mode).toBe('stream');

    // The response is a streaming Response object
    expect(harness.response.body).toBeDefined();
  });
});
```

## Inspecting the Response

The harness exposes the full `Response` and `Headers` from the SSR render.

```ts
it('returns correct response headers', async () => {
  const harness = await createRouterSsrHarness({
    createRouter: createTestRouter,
    request: 'http://localhost:3000/',
  });

  expect(harness.response.status).toBe(200);
  // responseHeaders is the mutable Headers object the handler wrote to
  expect(harness.responseHeaders).toBeInstanceOf(Headers);
});
```

## Client Hydration with hydrate()

After SSR, call `hydrate()` to simulate client-side hydration. It returns the hydrated router and any console errors that occurred during hydration.

```ts
describe('hydration', () => {
  it('hydrates without errors', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createTestRouter,
      request: 'http://localhost:3000/',
    });

    const { router, errors, unmount } = await harness.hydrate();

    expect(errors).toHaveLength(0);
    expect(router.state.location.pathname).toBe('/');

    unmount();
  });

  it('hydrates with a custom createRouter', async () => {
    const harness = await createRouterSsrHarness({
      createRouter: createTestRouter,
      request: 'http://localhost:3000/',
    });

    // Hydrate with a different router factory (e.g., with different context)
    const { errors, unmount } = await harness.hydrate({
      createRouter: () =>
        createRouter({
          routeTree,
          defaultPendingMinMs: 0,
          context: { hydrated: true },
        }),
    });

    expect(errors).toHaveLength(0);
    unmount();
  });
});
```

## Request Variants

The `request` option accepts a `Request` object, a URL string, or a `URL` instance.

```ts
// URL string
await createRouterSsrHarness({
  createRouter: createTestRouter,
  request: 'http://localhost:3000/about',
});

// URL object
await createRouterSsrHarness({
  createRouter: createTestRouter,
  request: new URL('http://localhost:3000/about'),
});

// Full Request with headers
await createRouterSsrHarness({
  createRouter: createTestRouter,
  request: new Request('http://localhost:3000/about', {
    headers: { 'Accept-Language': 'en-US' },
  }),
});
```

## Common Pitfalls

- **Pass a factory, not an instance** -- `createRouter` must be a function that returns a new router each time. The SSR harness calls it once for the server render and again (optionally) for hydration.
- **Call `unmount()` after hydrate** -- The `hydrate()` result includes an `unmount` function. Call it in test teardown to clean up the React root.
- **Hydration errors are captured, not thrown** -- Console errors during hydration are collected in the `errors` array. Check `errors.length` rather than wrapping hydrate in try/catch.
- **jsdom required** -- SSR hydration tests need a DOM environment. Configure Vitest with `environment: 'jsdom'` in your test config.
- **Default request URL** -- If you omit `request`, the harness uses `http://tanstack-router-testing.test/`. Pass an explicit URL to test specific routes.
