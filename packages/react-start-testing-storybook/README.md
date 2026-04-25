# @tanstack-router-testing/react-start-testing-storybook

Storybook decorator for TanStack Start: wrap CSF3 stories in a router context with server function mocks.

## Install

```bash
pnpm add -D @tanstack-router-testing/react-start-testing-storybook
```

## Usage

```ts
// .storybook/preview.ts
import { withTanStackStart } from '@tanstack-router-testing/react-start-testing-storybook';

export const decorators = [withTanStackStart()];
```

```tsx
// OrderDetail.stories.tsx
export const Default: Story = {
  parameters: {
    tanstackStart: {
      routeTree,
      initialEntries: ['/orders/42'],
      serverFnMocks: [[listOrders, async () => [{ id: 1, total: 42 }]]],
    },
  },
};
```

## Documentation

See the [main docs](../../docs/api-reference.md#react-start-testing-storybook).

## License

[MIT](../../LICENSE)
