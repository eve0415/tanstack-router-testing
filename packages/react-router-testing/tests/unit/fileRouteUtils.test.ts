import { Outlet, createRootRoute, createRoute } from '@tanstack/react-router';
import { beforeAll, describe, expect, it } from 'vitest';

import { computeFullPath, neuterAncestorLoaders, walkToRoot } from '../../src/fileRouteUtils.ts';

const root = createRootRoute({ component: () => Outlet({}) });

const postsLayout = createRoute({
  getParentRoute: () => root,
  path: '/posts',
  component: () => Outlet({}),
  loader: () => ({ posts: [] }),
});

const postDetail = createRoute({
  getParentRoute: () => postsLayout,
  path: '/$postId',
  loader: ({ params }: { params: { postId: string } }) => ({
    post: { id: params.postId },
  }),
});

describe('fileRouteUtils', () => {
  beforeAll(() => {
    root.addChildren([postsLayout.addChildren([postDetail])]);
  });

  describe('walkToRoot', () => {
    it('walks from leaf to root', () => {
      expect(walkToRoot(postDetail)).toBe(root);
    });

    it('returns root when given root', () => {
      expect(walkToRoot(root)).toBe(root);
    });
  });

  describe('computeFullPath', () => {
    it('computes full path from nested route', () => {
      expect(computeFullPath(postDetail)).toBe('/posts/$postId');
    });

    it('returns / for root route', () => {
      expect(computeFullPath(root)).toBe('/');
    });

    it('computes path for single-level route', () => {
      expect(computeFullPath(postsLayout)).toBe('/posts');
    });
  });

  describe('neuterAncestorLoaders', () => {
    it('replaces ancestor loaders with undefined', () => {
      const restore = neuterAncestorLoaders(postDetail);
      expect(postsLayout.options.loader).toBeUndefined();
      expect(root.options.loader).toBeUndefined();
      restore();
    });

    it('preserves the target route loader', () => {
      const originalLoader = postDetail.options.loader;
      const restore = neuterAncestorLoaders(postDetail);
      expect(postDetail.options.loader).toBe(originalLoader);
      restore();
    });

    it('restores original loaders on cleanup', () => {
      const originalPostsLoader = postsLayout.options.loader;
      const restore = neuterAncestorLoaders(postDetail);
      restore();
      expect(postsLayout.options.loader).toBe(originalPostsLoader);
    });

    it('preserves ancestor beforeLoad for context cascading', () => {
      const beforeLoadFn = () => ({ auth: true });
      const opts = postsLayout.options as unknown as Record<string, unknown>;
      opts.beforeLoad = beforeLoadFn;
      const restore = neuterAncestorLoaders(postDetail);
      expect(postsLayout.options.beforeLoad).toBe(beforeLoadFn);
      restore();
      delete opts.beforeLoad;
    });
  });
});
