import { createRootRoute, createRoute } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { cleanupAllHarnesses, createRouterHarness } from '../../src/index.ts';

const makeTree = () => {
  const root = createRootRoute();
  const index = createRoute({ getParentRoute: () => root, path: '/' });
  return root.addChildren([index]);
};

describe('harness tracking and cleanup', () => {
  it('cleanup() is idempotent — calling twice does not throw', () => {
    const harness = createRouterHarness({ routeTree: makeTree() });
    harness.cleanup();
    expect(() => {
      harness.cleanup();
    }).not.toThrow();
  });

  it('cleanupAllHarnesses() cleans all active harnesses', () => {
    const h1 = createRouterHarness({ routeTree: makeTree() });
    const h2 = createRouterHarness({ routeTree: makeTree() });

    cleanupAllHarnesses();

    expect(() => {
      h1.cleanup();
    }).not.toThrow();
    expect(() => {
      h2.cleanup();
    }).not.toThrow();
  });

  it('cleanupAllHarnesses() is safe to call when no harnesses exist', () => {
    expect(() => {
      cleanupAllHarnesses();
    }).not.toThrow();
  });

  it('multiple harnesses tracked independently', () => {
    createRouterHarness({ routeTree: makeTree() });
    const h2 = createRouterHarness({ routeTree: makeTree() });
    const h3 = createRouterHarness({ routeTree: makeTree() });

    cleanupAllHarnesses();

    expect(() => {
      h2.cleanup();
    }).not.toThrow();
    expect(() => {
      h3.cleanup();
    }).not.toThrow();
  });
});
