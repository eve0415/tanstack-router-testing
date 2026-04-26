/**
 * Integration test against a real vendored app's generated route tree.
 * Proves the harness can target vendored upstream code directly —
 * `.npmrc`'s `public-hoist-pattern` puts react + @tanstack/* at the
 * repo root so vendored files resolve their externals without a
 * per-app install.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

// Side-effect import wires up getParentRoute/path/id on all routes
import { routeTree } from '../../../../vendor/examples/react/basic-file-based/src/routeTree.gen.ts';
import { Route as IndexRoute } from '../../../../vendor/examples/react/basic-file-based/src/routes/index.tsx';
import { Route as PostRoute } from '../../../../vendor/examples/react/basic-file-based/src/routes/posts.$postId.tsx';
import { createRouterHarness } from '../../src/index.ts';

describe('vendored integration: examples/react/basic-file-based', () => {
  afterEach(() => {
    cleanup();
  });

  it('mounts the vendored generated route tree and renders the index route', async () => {
    const { TestRouterProvider } = createRouterHarness({
      routeTree,
      initialEntries: ['/'],
    });
    const { findByText } = render(<TestRouterProvider />);
    await expect(findByText('Welcome Home!')).resolves.toBeTruthy();
  });

  it('loads a real vendored file route with the route option', async () => {
    const h = createRouterHarness({
      route: IndexRoute,
    });
    await h.load();
    const { TestRouterProvider } = h;
    const { findByText } = render(<TestRouterProvider />);
    await expect(findByText('Welcome Home!')).resolves.toBeTruthy();
    h.cleanup();
  });

  it('loads a vendored file route with loaderData override', async () => {
    const stubPost = { id: '42', title: 'Test Post', body: 'body' };
    const h = createRouterHarness({
      route: PostRoute,
      params: { postId: '42' },
      loaderData: stubPost,
    });
    await h.load();
    expect(h.getLoaderData(PostRoute)).toStrictEqual(stubPost);
    h.cleanup();
  });
});
