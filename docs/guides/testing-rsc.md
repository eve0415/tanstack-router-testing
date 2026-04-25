# RSC Testing (Streaming, Suspense)

## Problem

React Server Components render on the server and stream HTML to the client. You need to test that components produce correct output in both string and streaming modes, verify chunk behavior, and validate the rendered HTML.

## Setup

```ts
import { createRscTestRuntime } from '@tanstack-router-testing/react-start-testing';
import { describe, it, expect, afterEach } from 'vitest';
```

## Creating an RSC Test Runtime

`createRscTestRuntime()` extends the Start test runtime with `renderServerComponent()`.

```ts
describe('RSC rendering', () => {
  let runtime: Awaited<ReturnType<typeof createRscTestRuntime>>;

  afterEach(() => {
    runtime.cleanup();
  });

  it('renders a server component to string', async () => {
    runtime = await createRscTestRuntime();

    function Greeting({ name }: { name: string }) {
      return <h1>Hello, {name}!</h1>;
    }

    const { html, stream, chunks } = await runtime.renderServerComponent(
      Greeting,
      { name: 'TanStack' },
    );

    expect(html).toContain('Hello, TanStack!');
    expect(stream).toBeNull(); // null in non-streaming mode
    expect(chunks).toEqual([]); // empty in non-streaming mode
  });
});
```

## Streaming Mode

Pass `streaming: true` to render via `renderToReadableStream`. The result includes the raw stream and decoded text chunks.

```ts
it('renders with streaming enabled', async () => {
  runtime = await createRscTestRuntime({ streaming: true });

  function Article({ title, body }: { title: string; body: string }) {
    return (
      <article>
        <h1>{title}</h1>
        <p>{body}</p>
      </article>
    );
  }

  const { html, stream, chunks } = await runtime.renderServerComponent(
    Article,
    { title: 'RSC Guide', body: 'Streaming works.' },
  );

  expect(html).toContain('<h1>RSC Guide</h1>');
  expect(html).toContain('Streaming works.');
  expect(stream).toBeInstanceOf(ReadableStream);
  expect(chunks.length).toBeGreaterThan(0);
});
```

## Using the Stream Directly

The `stream` property is a cloned `ReadableStream` you can consume independently of the collected `html`.

```ts
it('provides a consumable stream', async () => {
  runtime = await createRscTestRuntime({ streaming: true });

  function Banner({ text }: { text: string }) {
    return <div className="banner">{text}</div>;
  }

  const { stream } = await runtime.renderServerComponent(Banner, {
    text: 'Welcome',
  });

  // Read the stream manually
  const reader = stream!.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let done = false;

  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) {
      result += decoder.decode(chunk.value, { stream: !done });
    }
  }

  expect(result).toContain('Welcome');
});
```

## Configuring the Runtime Environment

The RSC runtime accepts all `StartTestRuntimeOptions`, letting you set the request, environment, and context.

```ts
it('renders with a custom request context', async () => {
  runtime = await createRscTestRuntime({
    streaming: true,
    request: 'http://localhost:3000/dashboard',
    env: 'server',
    context: { user: { id: 'u1' } },
  });

  function Dashboard({ userId }: { userId: string }) {
    return <div>Dashboard for {userId}</div>;
  }

  const { html } = await runtime.renderServerComponent(Dashboard, {
    userId: 'u1',
  });

  expect(html).toContain('Dashboard for u1');
});
```

## Experimental Features

> **Note**: Boundary validation and selective hydration testing are experimental and may change in future releases.

The current RSC runtime focuses on server-side rendering. Features like Suspense boundary validation (asserting that specific `<Suspense>` boundaries resolve in the expected order) and selective hydration testing (verifying that only certain subtrees hydrate on the client) are under active development.

For now, you can test Suspense fallbacks by checking the streamed chunks:

```ts
it('captures suspense fallback in chunks (experimental)', async () => {
  runtime = await createRscTestRuntime({ streaming: true });

  // A component with a Suspense boundary
  function AsyncPage({ id }: { id: string }) {
    return (
      <div>
        <h1>Page {id}</h1>
      </div>
    );
  }

  const { html } = await runtime.renderServerComponent(AsyncPage, {
    id: '1',
  });

  expect(html).toContain('Page 1');
});
```

## Common Pitfalls

- **Cleanup is required** -- Call `runtime.cleanup()` in `afterEach`. The RSC runtime inherits from the Start test runtime and holds mock state.
- **Streaming vs. string** -- In non-streaming mode (the default), `stream` is `null` and `chunks` is empty. Only set `streaming: true` when you need to inspect individual chunks or the raw stream.
- **Props must be an object** -- `renderServerComponent(Component, props)` expects a plain object for `props`, matching the component's prop type.
- **Server environment** -- The RSC runtime defaults to `env: 'server'`. Components rendered through `renderServerComponent` run in a simulated server context where `import.meta.env.SSR` is `true`.
- **No client-side interactivity** -- `renderServerComponent` produces static HTML. It does not mount a React tree or handle events. For hydration testing, see the [SSR guide](./testing-ssr.md).
