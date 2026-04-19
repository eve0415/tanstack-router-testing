import type { UserConfig } from 'vite';

import { describe, expect, it } from 'vitest';

import { tanstackStartTesting } from '../src/index.ts';

const getHarnessConfig = (aliasReactStart = true) => {
  const plugins = tanstackStartTesting({ aliasReactStart });
  const plugin = plugins.find(item => item.name === '@tanstack/react-start/testing');
  if (typeof plugin?.config !== 'function') return;
  const configHook = plugin.config as unknown as (config: UserConfig, env: { command: 'serve'; mode: string }) => UserConfig | undefined;
  return configHook({}, { command: 'serve', mode: 'test' });
};

const getAlias = () => {
  const config = getHarnessConfig();
  const alias = config?.resolve?.alias;
  if (!Array.isArray(alias)) throw new Error('expected alias array');
  const [firstAlias] = alias;
  if (!(firstAlias?.find instanceof RegExp)) throw new Error('expected regex alias');
  return firstAlias as { find: RegExp; replacement: string };
};

describe('tanstackStartTesting', () => {
  it('aliases the root @tanstack/react-start import to the shim', () => {
    const alias = getAlias();

    expect(alias.find.test('@tanstack/react-start')).toBeTruthy();
    expect(alias.find.test('@tanstack/react-start/server')).toBeFalsy();
    expect(alias.replacement).toBe('@tanstack-router-testing/react-start-testing/shim');
  });

  it('allows users to opt out of the React Start alias', () => {
    expect(getHarnessConfig(false)).toBeUndefined();
  });

  it('can install the RSC test runtime plugin', () => {
    const plugins = tanstackStartTesting({ rsc: true });
    expect(plugins.some(plugin => plugin.name === '@tanstack/react-start/testing-rsc-runtime')).toBeTruthy();
  });
});
