/**
 * Integration tests for {@link renderRoute}: one call wires the router,
 * applies overrides, installs server-function mocks, and renders.
 */

import { __resetServerFnRegistry, clearAllServerFnMocks, setEnv } from '@tanstack-router-testing/router-testing-core';
import { Outlet, createRootRoute, createRoute } from '@tanstack/react-router';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderRoute, runInStartEnv } from '../../src/index.ts';
import { createServerFn } from '../../src/shim.ts';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts/$postId',
  loader: () => ({ title: 'real' }),
  component: () => {
    const data = postRoute.useLoaderData();
    return <h1>{data.title}</h1>;
  },
});

const routeTree = rootRoute.addChildren([postRoute]);

describe('renderRoute', () => {
  afterEach(() => {
    cleanup();
    clearAllServerFnMocks();
    __resetServerFnRegistry();
    setEnv(undefined);
  });

  it('renders a route with a loader override applied', async () => {
    const screen = await renderRoute({
      routeTree,
      initialEntries: ['/posts/7'],
      overrides: { '/posts/$postId': { loader: () => ({ title: 'MOCK' }) } },
    });

    await expect(screen.findByText('MOCK')).resolves.toBeTruthy();
    expect(screen.harness.getLoaderData('/posts/$postId')).toStrictEqual({ title: 'MOCK' });
    screen.unmount();
  });

  it('installs server-function mocks for the render and disposes them on unmount', async () => {
    const getData = createServerFn().handler(() => 'real');
    const screen = await renderRoute({
      routeTree,
      initialEntries: ['/posts/7'],
      serverFnMocks: [[getData, () => Promise.resolve('mocked')]],
    });

    await expect(runInStartEnv('client', () => getData())).resolves.toBe('mocked');
    screen.unmount();
    await expect(runInStartEnv('client', () => getData())).resolves.toBe('real');
  });

  it('is idempotent on repeated unmount', async () => {
    const screen = await renderRoute({ routeTree, initialEntries: ['/posts/7'] });
    screen.unmount();
    expect(() => {
      screen.unmount();
    }).not.toThrow();
  });
});
