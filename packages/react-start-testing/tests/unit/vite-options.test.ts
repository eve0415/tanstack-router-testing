// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tanstackRouterSpy = vi.fn<() => []>(() => []);
vi.mock('@tanstack/router-plugin/vite', () => ({
  tanstackRouter: tanstackRouterSpy,
}));

const { tanstackStartTesting } = await import('../../src/vite.ts');

describe('tanstackStartTesting options', () => {
  beforeEach(() => tanstackRouterSpy.mockClear());

  it('forwards router options to tanstackRouter()', () => {
    tanstackStartTesting({
      router: {
        routeFileIgnorePattern: '.*\\.test\\.(ts|tsx)$',
        disableLogging: true,
      },
    });
    expect(tanstackRouterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        routeFileIgnorePattern: '.*\\.test\\.(ts|tsx)$',
        disableLogging: true,
      }),
    );
  });

  it('explicit top-level options take precedence over router passthrough', () => {
    tanstackStartTesting({
      routesDirectory: 'src/pages',
      router: { routesDirectory: 'src/other' },
    });
    expect(tanstackRouterSpy).toHaveBeenCalledWith(expect.objectContaining({ routesDirectory: 'src/pages' }));
  });

  it('always forces target to react', () => {
    tanstackStartTesting({
      router: { target: 'vue' },
    });
    expect(tanstackRouterSpy).toHaveBeenCalledWith(expect.objectContaining({ target: 'react' }));
  });
});
