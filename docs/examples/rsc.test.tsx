import React, { Suspense } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRscTestRuntime } from '@tanstack-router-testing/react-start-testing';

// ---------------------------------------------------------------------------
// Server components under test
// ---------------------------------------------------------------------------

function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

function UserCard({ userId, role }: { userId: string; role: string }) {
  return (
    <div data-testid="user-card">
      <span>{userId}</span>
      <span>{role}</span>
    </div>
  );
}

function PageWithSuspense({ title }: { title: string }) {
  return (
    <main>
      <h1>{title}</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <section>Content for {title}</section>
      </Suspense>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRscTestRuntime — string mode (default)', () => {
  it('renders a server component to HTML', async () => {
    const runtime = await createRscTestRuntime();

    const { html, stream, chunks } = await runtime.renderServerComponent(
      Greeting,
      { name: 'TanStack' },
    );

    expect(html).toContain('Hello, TanStack!');
    expect(stream).toBeNull();
    expect(chunks).toEqual([]);

    runtime.cleanup();
  });

  it('renders a component with multiple props', async () => {
    const runtime = await createRscTestRuntime();

    const { html } = await runtime.renderServerComponent(UserCard, {
      userId: 'u-42',
      role: 'admin',
    });

    expect(html).toContain('u-42');
    expect(html).toContain('admin');

    runtime.cleanup();
  });
});

describe('createRscTestRuntime — streaming mode', () => {
  let runtime: Awaited<ReturnType<typeof createRscTestRuntime>>;

  afterEach(() => {
    runtime.cleanup();
  });

  it('returns a readable stream and collected chunks', async () => {
    runtime = await createRscTestRuntime({ streaming: true });

    const { html, stream, chunks } = await runtime.renderServerComponent(
      Greeting,
      { name: 'Stream' },
    );

    expect(html).toContain('Hello, Stream!');
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toBe(html);
  });

  it('streams a component that uses Suspense', async () => {
    runtime = await createRscTestRuntime({ streaming: true });

    const { html, chunks } = await runtime.renderServerComponent(
      PageWithSuspense,
      { title: 'Dashboard' },
    );

    expect(html).toContain('Dashboard');
    expect(html).toContain('Content for Dashboard');
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('each chunk is a decoded text segment', async () => {
    runtime = await createRscTestRuntime({ streaming: true });

    const { chunks } = await runtime.renderServerComponent(Greeting, {
      name: 'Chunks',
    });

    for (const chunk of chunks) {
      expect(typeof chunk).toBe('string');
    }
  });
});
