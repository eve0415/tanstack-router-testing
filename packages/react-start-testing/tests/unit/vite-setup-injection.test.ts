// @vitest-environment node
import type { Plugin, UserConfig } from 'vite';

import { describe, expect, it } from 'vitest';

import { tanstackStartTesting } from '../../src/vite.ts';

type TestConfig = UserConfig & { test?: { setupFiles?: string[] } };

const getTestPluginConfig = (plugins: readonly Plugin[], inputConfig: Record<string, unknown> = {}): TestConfig | undefined => {
  const plugin = plugins.find((p: Plugin) => p.name === '@tanstack/react-start/testing');
  const configHook = plugin?.config as ((config: Record<string, unknown>) => TestConfig | undefined) | undefined;
  return configHook?.(inputConfig);
};

describe('tanstackStartTesting vite plugin', () => {
  it('injects a setupFiles entry pointing to the generated route tree', () => {
    const config = getTestPluginConfig(tanstackStartTesting());
    expect(config?.test?.setupFiles).toContain('src/routeTree.gen.ts');
  });

  it('respects custom generatedRouteTree path', () => {
    const config = getTestPluginConfig(tanstackStartTesting({ generatedRouteTree: 'src/custom.gen.ts' }));
    expect(config?.test?.setupFiles).toContain('src/custom.gen.ts');
  });

  it('preserves the alias when aliasReactStart is not false', () => {
    const config = getTestPluginConfig(tanstackStartTesting());
    expect(config?.resolve?.alias).toBeDefined();
  });

  it('omits aliases and rsc runtime when aliasReactStart is false', () => {
    const plugins = tanstackStartTesting({ aliasReactStart: false });
    const pluginNames = plugins.map(p => p.name);
    expect(pluginNames).not.toContain('@tanstack/react-start/testing');
    expect(pluginNames).not.toContain('@tanstack/react-start/testing-rsc-runtime');
    expect(pluginNames).toContain('tanstack-start-testing:browser-compat');
    expect(pluginNames).toContain('tanstack-start-testing:virtual-stubs');
  });

  it('omits setupFiles when browser mode is enabled', () => {
    const config = getTestPluginConfig(tanstackStartTesting(), { test: { browser: { enabled: true } } });
    expect(config?.test?.setupFiles).toBeUndefined();
  });

  it('still applies the alias in browser mode', () => {
    const config = getTestPluginConfig(tanstackStartTesting(), { test: { browser: { enabled: true } } });
    expect(config?.resolve?.alias).toBeDefined();
  });
});
