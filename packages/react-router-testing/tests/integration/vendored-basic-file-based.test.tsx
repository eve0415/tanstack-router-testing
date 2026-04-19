/**
 * Integration test against a real vendored app's generated route tree.
 * Proves the harness can target vendored upstream code directly —
 * `.npmrc`'s `public-hoist-pattern` puts react + @tanstack/* at the
 * repo root so vendored files resolve their externals without a
 * per-app install.
 */

import { cleanup } from '@testing-library/react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { routeTree } from '../../../../vendor/examples/react/basic-file-based/src/routeTree.gen.ts';
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
});
