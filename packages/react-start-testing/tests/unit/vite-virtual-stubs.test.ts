// @vitest-environment node
import type { Plugin, UserConfig } from 'vite';

import { describe, expect, it } from 'vitest';

import { tanstackStartTesting } from '../../src/vite.ts';

const VIRTUAL_MODULE_IDS = [
  '#tanstack-router-entry',
  '#tanstack-start-entry',
  '#tanstack-start-plugin-adapters',
  '#tanstack-start-server-fn-resolver',
  'virtual:tanstack-rsc-ssr-decode',
  'virtual:tanstack-rsc-browser-decode',
  'tanstack-start-manifest:v',
  'tanstack-start-injected-head-scripts:v',
];

const getPlugin = (name: string): Plugin | undefined => tanstackStartTesting().find(p => p.name === name);

describe('tanstack-start-testing:virtual-stubs plugin', () => {
  it('returns alias entries for all known virtual module IDs', () => {
    const plugin = getPlugin('tanstack-start-testing:virtual-stubs');
    expect(plugin).toBeDefined();
    const configHook = plugin?.config as Function;
    const config = configHook.call({}) as UserConfig;
    const aliases = config.resolve?.alias;
    expect(aliases).toBeDefined();
    expect(Array.isArray(aliases)).toBeTruthy();

    for (const id of VIRTUAL_MODULE_IDS) {
      expect(aliases).toContainEqual({ find: id, replacement: `\0${id}` });
    }
  });

  it('does not include unrelated aliases', () => {
    const plugin = getPlugin('tanstack-start-testing:virtual-stubs');
    expect(plugin).toBeDefined();
    const configHook = plugin?.config as Function;
    const config = configHook.call({}) as UserConfig;
    const aliases = config.resolve?.alias as { find: string; replacement: string }[];
    expect(aliases).toHaveLength(VIRTUAL_MODULE_IDS.length);
  });

  it('loads empty stub content for null-byte prefixed IDs', () => {
    const load = getPlugin('tanstack-start-testing:virtual-stubs')?.load as Function;
    for (const id of VIRTUAL_MODULE_IDS) {
      expect(load.call({}, `\0${id}`)).toBeDefined();
    }
  });
});
