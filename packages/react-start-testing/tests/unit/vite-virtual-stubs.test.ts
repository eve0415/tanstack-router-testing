// @vitest-environment node
import type { Plugin } from 'vite';

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
  it('has enforce: pre to run before vite:import-analysis', () => {
    const plugin = getPlugin('tanstack-start-testing:virtual-stubs');
    expect(plugin?.enforce).toBe('pre');
  });

  it('resolves known virtual module IDs to null-byte prefixed IDs', () => {
    const plugin = getPlugin('tanstack-start-testing:virtual-stubs');
    expect(plugin).toBeDefined();
    const resolveId = plugin?.resolveId as Function;

    for (const id of VIRTUAL_MODULE_IDS) {
      expect(resolveId.call({}, id)).toBe(`\0${id}`);
    }
  });

  it('returns undefined for unknown module IDs', () => {
    const resolveId = getPlugin('tanstack-start-testing:virtual-stubs')?.resolveId as Function;
    expect(resolveId.call({}, 'some-other-module')).toBeUndefined();
    expect(resolveId.call({}, '@tanstack/react-router')).toBeUndefined();
  });

  it('loads empty stub content for null-byte prefixed IDs', () => {
    const load = getPlugin('tanstack-start-testing:virtual-stubs')?.load as Function;
    for (const id of VIRTUAL_MODULE_IDS) {
      const result = load.call({}, `\0${id}`) as string;
      expect(result).toBeDefined();
      expect(result).toContain('export');
    }
  });

  it('is included when aliasReactStart is false', () => {
    const plugins = tanstackStartTesting({ aliasReactStart: false });
    expect(plugins.some(p => p.name === 'tanstack-start-testing:virtual-stubs')).toBeTruthy();
  });

  it('does not load content for non-virtual IDs', () => {
    const load = getPlugin('tanstack-start-testing:virtual-stubs')?.load as Function;
    expect(load.call({}, 'some-other-module')).toBeUndefined();
    expect(load.call({}, '\0some-other-module')).toBeUndefined();
  });
});
