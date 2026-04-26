// @vitest-environment node
import type { Plugin, UserConfig } from 'vite';
import { describe, expect, it } from 'vitest';

import { tanstackStartTesting } from '../../src/vite.ts';

type TestConfig = UserConfig & { test: { setupFiles: string[] } };

const getTestPluginConfig = (plugins: readonly Plugin[]): TestConfig | undefined => {
  const plugin = plugins.find((p: Plugin) => p.name === '@tanstack/react-start/testing');
  return (plugin?.config as (() => TestConfig | undefined) | undefined)?.();
};

describe('tanstackStartTesting vite plugin', () => {
  it('injects a setupFiles entry pointing to the generated route tree', () => {
    const config = getTestPluginConfig(tanstackStartTesting());
    expect(config?.test?.setupFiles).toContain('src/routeTree.gen.ts');
  });

  it('respects custom generatedRouteTree path', () => {
    const config = getTestPluginConfig(
      tanstackStartTesting({ generatedRouteTree: 'src/custom.gen.ts' }),
    );
    expect(config?.test?.setupFiles).toContain('src/custom.gen.ts');
  });

  it('preserves the alias when aliasReactStart is not false', () => {
    const config = getTestPluginConfig(tanstackStartTesting());
    expect(config?.resolve?.alias).toBeDefined();
  });

  it('omits alias but still injects setupFiles when aliasReactStart is false', () => {
    const config = getTestPluginConfig(
      tanstackStartTesting({ aliasReactStart: false }),
    );
    expect(config?.resolve).toBeUndefined();
    expect(config?.test?.setupFiles).toContain('src/routeTree.gen.ts');
  });
});
