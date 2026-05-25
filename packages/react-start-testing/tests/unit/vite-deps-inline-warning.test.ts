// @vitest-environment node
import type { Plugin } from 'vite';

import { describe, expect, it, vi } from 'vitest';

const tanstackRouterSpy = vi.fn<() => []>(() => []);
vi.mock('@tanstack/router-plugin/vite', () => ({
  tanstackRouter: tanstackRouterSpy,
}));

const { tanstackStartTesting } = await import('../../src/vite.ts');

const getTestingPlugin = (): Plugin => {
  const plugin = tanstackStartTesting().find((p: Plugin) => p.name === '@tanstack/react-start/testing');
  if (!plugin) throw new Error('testing plugin not found');
  return plugin;
};

describe('deps.inline conflict detection', () => {
  it('warns when server.deps.inline contains @tanstack/start-server-core', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = getTestingPlugin();
    const configResolved = plugin.configResolved as Function;

    configResolved.call(
      {},
      {
        test: { server: { deps: { inline: ['@tanstack/start-server-core'] } } },
      },
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('aliasReactStart is incompatible'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@tanstack/start-server-core'));
    warnSpy.mockRestore();
  });

  it('warns when server.deps.inline contains @tanstack/react-start', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = getTestingPlugin();
    const configResolved = plugin.configResolved as Function;

    configResolved.call(
      {},
      {
        test: { server: { deps: { inline: ['@tanstack/react-start'] } } },
      },
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@tanstack/react-start'));
    warnSpy.mockRestore();
  });

  it('warns when server.deps.inline contains a matching RegExp', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = getTestingPlugin();
    const configResolved = plugin.configResolved as Function;

    configResolved.call(
      {},
      {
        test: { server: { deps: { inline: [/tanstack\/start-server-core/] } } },
      },
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@tanstack/start-server-core'));
    warnSpy.mockRestore();
  });

  it('does not warn when server.deps.inline has no conflicting packages', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = getTestingPlugin();
    const configResolved = plugin.configResolved as Function;

    configResolved.call(
      {},
      {
        test: { server: { deps: { inline: ['some-other-package', /vendor/] } } },
      },
    );

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not warn when test.server.deps.inline is absent', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = getTestingPlugin();
    const configResolved = plugin.configResolved as Function;

    configResolved.call({}, {});

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('is not present in router-only mode', () => {
    const plugins = tanstackStartTesting({ aliasReactStart: false });
    const plugin = plugins.find((p: Plugin) => p.name === '@tanstack/react-start/testing');
    expect(plugin).toBeUndefined();
  });
});
