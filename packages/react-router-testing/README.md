# @tanstack-router-testing/react-router-testing

Test helpers for `@tanstack/react-router`: create test routers, render with a provider, inspect route state.

## Install

```bash
pnpm add -D @tanstack-router-testing/react-router-testing
```

## Usage

Test a single file-based route with typed params:

```tsx
import { render } from '@testing-library/react';
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { Route } from './routes/posts.$postId';

const harness = createRouterHarness({
  route: Route,                  // single file route import
  params: { postId: '42' },     // fully typed from route path
});
await harness.load();
const { findByText } = render(<harness.TestRouterProvider />);
await findByText('Post 42');
harness.cleanup();
```

Or test with a full route tree:

```tsx
import { createRouterHarness } from '@tanstack-router-testing/react-router-testing';
import { routeTree } from './routeTree.gen';

const harness = createRouterHarness({ routeTree, initialEntries: ['/posts/7'] });
await harness.load();
expect(harness.getLoaderData('/posts/$postId')).toBeDefined();
harness.cleanup();
```

## Documentation

See the [main docs](../../docs/api-reference.md#react-router-testing).

## License

[MIT](../../LICENSE)
