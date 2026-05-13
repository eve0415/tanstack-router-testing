// @vitest-environment node
import type { Plugin } from 'vite';

import { describe, expect, it } from 'vitest';

import { tanstackStartTesting } from '../../src/vite.ts';

const getPlugin = (name: string): Plugin | undefined => tanstackStartTesting().find(p => p.name === name);
const getRscPlugin = (name: string): Plugin | undefined => tanstackStartTesting({ rsc: true }).find(p => p.name === name);

describe('tanstack-start-testing:browser-compat plugin', () => {
  it('resolves @tanstack/start-storage-context to virtual stub in client environment', () => {
    const plugin = getPlugin('tanstack-start-testing:browser-compat');
    expect(plugin).toBeDefined();

    const resolveId = plugin?.resolveId as Function;
    const clientCtx = { environment: { name: 'client' } };
    expect(resolveId.call(clientCtx, '@tanstack/start-storage-context')).toBe('\0tanstack-start-storage-context-browser-stub');
  });

  it('does not intercept @tanstack/start-storage-context in non-client environments', () => {
    const resolveId = getPlugin('tanstack-start-testing:browser-compat')?.resolveId as Function;
    const ssrCtx = { environment: { name: 'ssr' } };
    expect(resolveId.call(ssrCtx, '@tanstack/start-storage-context')).toBeUndefined();
  });

  it('excludes packages with #tanstack-* imports from client pre-bundling', () => {
    const plugin = getPlugin('tanstack-start-testing:browser-compat');
    expect(plugin).toBeDefined();
    const configHook = plugin?.config as Function;
    const config = configHook.call({}) as { environments: { client: { optimizeDeps: { exclude: string[] } } } };
    expect(config.environments.client.optimizeDeps.exclude).toContain('@tanstack/start-storage-context');
    expect(config.environments.client.optimizeDeps.exclude).toContain('@tanstack/start-server-core');
    expect(config.environments.client.optimizeDeps.exclude).toContain('@tanstack/start-client-core');
  });

  it('loads a browser-safe stub module', () => {
    const load = getPlugin('tanstack-start-testing:browser-compat')?.load as Function;
    const result = load.call({}, '\0tanstack-start-storage-context-browser-stub') as string;
    expect(result).toContain('getStartContext');
    expect(result).toContain('runWithStartContext');
    expect(result).not.toContain('node:async_hooks');
  });
});

describe('@tanstack/react-start/testing-rsc-runtime plugin', () => {
  it('excludes @tanstack/react-start-rsc from client pre-bundling', () => {
    const plugin = getRscPlugin('@tanstack/react-start/testing-rsc-runtime');
    expect(plugin).toBeDefined();
    const configHook = plugin?.config as Function;
    const config = configHook.call({}) as { environments: { client: { optimizeDeps: { exclude: string[] } } } };
    expect(config.environments.client.optimizeDeps.exclude).toContain('@tanstack/react-start-rsc');
  });

  it('is not included when rsc option is false', () => {
    const plugin = tanstackStartTesting().find(p => p.name === '@tanstack/react-start/testing-rsc-runtime');
    expect(plugin).toBeUndefined();
  });
});
