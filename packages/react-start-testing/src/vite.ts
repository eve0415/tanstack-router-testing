import type { Config } from '@tanstack/router-plugin/vite';
import type { Plugin, UserConfig } from 'vite';

import { tanstackRouter } from '@tanstack/router-plugin/vite';

export interface TanstackStartTestingOptions {
  /**
   * Directory holding file-based routes, relative to the Vite root.
   *
   * @defaultValue `'src/routes'`
   */
  readonly routesDirectory?: string;
  /**
   * Output path for the generated route tree, relative to the Vite root.
   *
   * @defaultValue `'src/routeTree.gen.ts'`
   */
  readonly generatedRouteTree?: string;
  /**
   * Whether to alias `@tanstack/react-start` to the test runtime shim.
   *
   * @defaultValue `true`
   */
  readonly aliasReactStart?: boolean;
  /**
   * Install a small test runtime module for TanStack Start RSC imports that
   * need `virtual:tanstack-rsc-runtime` under Vitest.
   *
   * @defaultValue `false`
   */
  readonly rsc?: boolean;
  /**
   * Additional options forwarded to the underlying `tanstackRouter()` plugin.
   *
   * Explicit top-level options (`routesDirectory`, `generatedRouteTree`) take
   * precedence over values in this object. `target` is always forced to `'react'`.
   *
   * @example
   * ```ts
   * tanstackStartTesting({
   *   router: {
   *     routeFileIgnorePattern: '.*\\.test\\.(ts|tsx)$',
   *     routeTreeFileFooter: () => [
   *       "declare module '@tanstack/react-start' {",
   *       '  interface Register { router: ReturnType<typeof getRouter> }',
   *       '}',
   *     ],
   *   },
   * })
   * ```
   */
  readonly router?: Partial<Config>;
}

/**
 * Vite/Vitest plugins for TanStack Start tests.
 *
 * This keeps route-tree generation on the real TanStack router plugin path
 * while swapping the Start runtime to the in-process testing shim.
 */
export const tanstackStartTesting = (options: TanstackStartTestingOptions = {}): Plugin[] => {
  const routerPluginOptions = {
    routesDirectory: 'src/routes',
    generatedRouteTree: 'src/routeTree.gen.ts',
    ...options.router,
    ...(options.routesDirectory !== undefined ? { routesDirectory: options.routesDirectory } : {}),
    ...(options.generatedRouteTree !== undefined ? { generatedRouteTree: options.generatedRouteTree } : {}),
    target: 'react' as const,
  };
  const routerPlugins = tanstackRouter(routerPluginOptions);
  const plugins: Plugin[] = [
    ...(Array.isArray(routerPlugins) ? routerPlugins : [routerPlugins]),
    tanstackStartBrowserCompat(),
    tanstackStartVirtualStubs(),
    ...(options.rsc === true ? [tanstackStartRscTestingRuntime()] : []),
    {
      name: '@tanstack/react-start/testing',
      config(): UserConfig & { test: { setupFiles: readonly string[] } } {
        const genPath = routerPluginOptions.generatedRouteTree;
        return {
          ...(options.aliasReactStart !== false
            ? {
                resolve: {
                  alias: [
                    {
                      find: /^@tanstack\/react-start$/,
                      replacement: '@tanstack-router-testing/react-start-testing/shim',
                    },
                  ],
                },
              }
            : {}),
          test: {
            setupFiles: [genPath],
          },
        };
      },
    },
  ];
  return plugins;
};

const STORAGE_CONTEXT_STUB_ID = '\0tanstack-start-storage-context-browser-stub';
const STORAGE_CONTEXT_STUB_CODE = 'export function getStartContext() { return undefined; }\nexport function runWithStartContext(_ctx, fn) { return fn(); }';

/**
 * Stub `@tanstack/start-storage-context` in browser environments to prevent
 * `node:async_hooks` from crashing Vitest browser mode.
 *
 * @returns A Vite plugin that intercepts the import in client environments and
 *   serves a no-op module with matching exports.
 */
const tanstackStartBrowserCompat = (): Plugin => ({
  name: 'tanstack-start-testing:browser-compat',
  enforce: 'pre',
  config() {
    return {
      environments: {
        client: {
          optimizeDeps: {
            exclude: ['@tanstack/start-storage-context'],
          },
        },
      },
    };
  },
  resolveId(id) {
    return this.environment.name === 'client' && id === '@tanstack/start-storage-context' ? STORAGE_CONTEXT_STUB_ID : undefined;
  },
  load(id) {
    if (id !== STORAGE_CONTEXT_STUB_ID) return;
    return STORAGE_CONTEXT_STUB_CODE;
  },
});

const VIRTUAL_MODULE_IDS = new Set([
  '#tanstack-router-entry',
  '#tanstack-start-entry',
  '#tanstack-start-plugin-adapters',
  '#tanstack-start-server-fn-resolver',
  'virtual:tanstack-rsc-ssr-decode',
  'virtual:tanstack-rsc-browser-decode',
  'tanstack-start-manifest:v',
  'tanstack-start-injected-head-scripts:v',
]);

/**
 * Resolve all known `#tanstack-*` and `virtual:tanstack-*` module IDs to
 * empty virtual stubs so they don't cause unresolved import errors in tests.
 *
 * @returns A Vite plugin that resolves and loads no-op stubs for TanStack
 *   Start's internal virtual modules.
 */
const tanstackStartVirtualStubs = (): Plugin => ({
  name: 'tanstack-start-testing:virtual-stubs',
  config() {
    return {
      resolve: {
        alias: [...VIRTUAL_MODULE_IDS].map(id => ({
          find: id,
          replacement: `\0${id}`,
        })),
      },
    };
  },
  load(id) {
    return id.startsWith('\0') && VIRTUAL_MODULE_IDS.has(id.slice(1)) ? 'export default {}; export {};' : undefined;
  },
});

const VIRTUAL_RSC_RUNTIME = 'virtual:tanstack-rsc-runtime';
const RESOLVED_VIRTUAL_RSC_RUNTIME = '\0@tanstack/react-start/testing/rsc-runtime';

const tanstackStartRscTestingRuntime = (): Plugin => ({
  name: '@tanstack/react-start/testing-rsc-runtime',
  resolveId(id) {
    return id === VIRTUAL_RSC_RUNTIME ? RESOLVED_VIRTUAL_RSC_RUNTIME : undefined;
  },
  load(id) {
    if (id !== RESOLVED_VIRTUAL_RSC_RUNTIME) return;
    return `
      import ReactDOMServer from 'react-dom/server';

      export function renderToReadableStream(node) {
        const html = ReactDOMServer.renderToString(node);
        const encoder = new TextEncoder();
        return new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(html));
            controller.close();
          }
        });
      }
    `;
  },
});
