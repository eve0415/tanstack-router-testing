// @vitest-environment node
import type { UserConfig } from 'vite';

import { describe, expect, it } from 'vitest';

import { tanstackStartTesting } from '../../src/vite.ts';

const getTestingPluginConfig = (options = {}): UserConfig => {
  const plugin = tanstackStartTesting(options).find(p => p.name === '@tanstack/react-start/testing');
  const configHook = plugin?.config as Function;
  return configHook.call({}, {}) as UserConfig;
};

describe('@tanstack/react-start/server alias', () => {
  it('aliases @tanstack/react-start/server to the server-shim', () => {
    const config = getTestingPluginConfig();
    const aliases = config.resolve?.alias as { find: RegExp; replacement: string }[];
    const serverAlias = aliases?.find(a => a.find.toString() === String.raw`/^@tanstack\/react-start\/server$/`);
    expect(serverAlias).toBeDefined();
    expect(serverAlias?.replacement).toBe('@tanstack-router-testing/react-start-testing/server-shim');
  });

  it('includes both client and server aliases', () => {
    const config = getTestingPluginConfig();
    const aliases = config.resolve?.alias as { find: RegExp; replacement: string }[];
    expect(aliases).toHaveLength(2);
    expect(aliases?.[0]?.replacement).toBe('@tanstack-router-testing/react-start-testing/shim');
    expect(aliases?.[1]?.replacement).toBe('@tanstack-router-testing/react-start-testing/server-shim');
  });

  it('returns only router plugins when aliasReactStart is false', () => {
    const plugins = tanstackStartTesting({ aliasReactStart: false });
    const pluginNames = plugins.map(p => p.name);
    expect(pluginNames).not.toContain('@tanstack/react-start/testing');
  });

  it('forwards router options in router-only mode', () => {
    const plugins = tanstackStartTesting({
      aliasReactStart: false,
      routesDirectory: 'custom/routes',
      generatedRouteTree: 'custom/tree.gen.ts',
    });
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins.every(p => p.name !== '@tanstack/react-start/testing')).toBeTruthy();
  });

  it('ignores rsc option in router-only mode', () => {
    const plugins = tanstackStartTesting({ aliasReactStart: false, rsc: true });
    const pluginNames = plugins.map(p => p.name);
    expect(pluginNames).not.toContain('@tanstack/react-start/testing-rsc-runtime');
  });
});
