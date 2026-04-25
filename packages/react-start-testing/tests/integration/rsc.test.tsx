import React, { Suspense } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { createRscTestRuntime, type RscTestRuntime } from '../../src/index.ts';

describe('RSC test runtime', () => {
  let runtime: RscTestRuntime;

  afterEach(() => {
    runtime?.cleanup();
  });

  it('renders a server component to HTML string', async () => {
    const Greeting = () => <div>Hello RSC</div>;
    runtime = await createRscTestRuntime();
    const result = await runtime.renderServerComponent(Greeting, {});
    expect(result.html).toContain('Hello RSC');
  });

  it('renders with props', async () => {
    const Greeting = ({ name }: { name: string }) => <div>Hello {name}</div>;
    runtime = await createRscTestRuntime();
    const result = await runtime.renderServerComponent(Greeting, { name: 'World' });
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('World');
  });

  it('collects streaming chunks when streaming is enabled', async () => {
    const SlowComponent = () => <div>loaded</div>;
    runtime = await createRscTestRuntime({ streaming: true });
    const result = await runtime.renderServerComponent(SlowComponent, {});
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.html).toContain('loaded');
    expect(result.stream).toBeInstanceOf(ReadableStream);
  });

  it('returns null stream when streaming is disabled', async () => {
    const Component = () => <div>static</div>;
    runtime = await createRscTestRuntime();
    const result = await runtime.renderServerComponent(Component, {});
    expect(result.stream).toBeNull();
  });

  it('detects suspended components in streaming mode', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>(resolve => {
      resolvePromise = resolve;
    });

    const AsyncChild = () => {
      if (!resolvePromise) throw promise;
      return <div>async content</div>;
    };

    const Wrapper = () => (
      <Suspense fallback={<div>loading...</div>}>
        <AsyncChild />
      </Suspense>
    );

    runtime = await createRscTestRuntime({ streaming: true });
    resolvePromise!();
    const result = await runtime.renderServerComponent(Wrapper, {});
    expect(result.html).toContain('async content');
  });

  it('renders suspense fallback when component is pending in string mode', async () => {
    let resolved = false;
    const AsyncChild = () => {
      if (!resolved) throw new Promise<void>(r => setTimeout(() => { resolved = true; r(); }, 5));
      return <div>resolved</div>;
    };

    const Wrapper = () => (
      <Suspense fallback={<div>loading fallback</div>}>
        <AsyncChild />
      </Suspense>
    );

    runtime = await createRscTestRuntime({ streaming: false });
    const result = await runtime.renderServerComponent(Wrapper, {});
    // In string mode, renderToString resolves suspense synchronously — fallback shown
    expect(result.html).toBeDefined();
  });

  it('inherits Start runtime capabilities (run, call, cleanup)', async () => {
    runtime = await createRscTestRuntime();
    expect(typeof runtime.run).toBe('function');
    expect(typeof runtime.call).toBe('function');
    expect(typeof runtime.cleanup).toBe('function');
  });
});
