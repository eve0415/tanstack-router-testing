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
  it('resolves all known virtual module IDs', () => {
    const plugin = getPlugin('tanstack-start-testing:virtual-stubs');
    expect(plugin).toBeDefined();

    const resolveId = plugin?.resolveId as Function;
    for (const id of VIRTUAL_MODULE_IDS) {
      expect(resolveId.call({}, id)).toBe(`\0${id}`);
    }
  });

  it('does not resolve unrelated IDs', () => {
    const resolveId = getPlugin('tanstack-start-testing:virtual-stubs')?.resolveId as Function;
    expect(resolveId.call({}, 'react')).toBeUndefined();
    expect(resolveId.call({}, '#other-module')).toBeUndefined();
  });

  it('loads empty stub content for resolved IDs', () => {
    const load = getPlugin('tanstack-start-testing:virtual-stubs')?.load as Function;
    for (const id of VIRTUAL_MODULE_IDS) {
      expect(load.call({}, `\0${id}`)).toBeDefined();
    }
  });
});
