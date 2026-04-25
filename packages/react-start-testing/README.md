# @tanstack-router-testing/react-start-testing

Test helpers for `@tanstack/react-start`: mock server functions, override middleware, simulate server/client environments, and render RSC.

## Install

```bash
pnpm add -D @tanstack-router-testing/react-start-testing
```

## Usage

```ts
import { mockServerFn, clearStartMocks } from '@tanstack-router-testing/react-start-testing';

// Mock a server function
const dispose = mockServerFn(listOrders, async () => [{ id: '1', total: 42 }]);

// ... run your test ...

dispose(); // or clearStartMocks() in afterEach
```

### Vitest plugin

```ts
// vitest.config.ts
import { tanstackStartTesting } from '@tanstack-router-testing/react-start-testing/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tanstackStartTesting()],
  test: { environment: 'jsdom' },
});
```

## Documentation

See the [main docs](../../docs/api-reference.md#react-start-testing).

## License

[MIT](../../LICENSE)
