# @tanstack-router-testing/react-router-testing

Test helpers for `@tanstack/react-router`: create test routers, render with a provider, inspect route state.

## Install

```bash
pnpm add -D @tanstack-router-testing/react-router-testing
```

## Usage

```tsx
import { createRootRoute, createRoute } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: () => ({ greeting: 'hello' }),
  component: () => <div>{indexRoute.useLoaderData().greeting}</div>,
});
const routeTree = rootRoute.addChildren([indexRoute]);

const harness = createRouterHarness({ routeTree });
await harness.load();
const { findByText } = render(<harness.TestRouterProvider />);
await findByText('hello');
harness.cleanup();
```

## Documentation

See the [main docs](../../docs/api-reference.md#react-router-testing).

## License

[MIT](../../LICENSE)
