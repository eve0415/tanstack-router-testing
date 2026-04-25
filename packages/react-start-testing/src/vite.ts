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
}

/**
 * Vite/Vitest plugins for TanStack Start tests.
 *
 * This keeps route-tree generation on the real TanStack router plugin path
 * while swapping the Start runtime to the in-process testing shim.
 */
export const tanstackStartTesting = (options: TanstackStartTestingOptions = {}): readonly Plugin[] => {
  const routerPluginOptions = {
    routesDirectory: options.routesDirectory ?? 'src/routes',
    generatedRouteTree: options.generatedRouteTree ?? 'src/routeTree.gen.ts',
    target: 'react' as const,
  };
  const routerPlugins = tanstackRouter(routerPluginOptions);
  const plugins: Plugin[] = [
    ...(Array.isArray(routerPlugins) ? routerPlugins : [routerPlugins]),
    ...(options.rsc ? [tanstackStartRscTestingRuntime()] : []),
    {
      name: '@tanstack/react-start/testing',
      config(): UserConfig | undefined {
        if (options.aliasReactStart === false) return undefined;
        return {
          resolve: {
            alias: [
              {
                find: /^@tanstack\/react-start$/,
                replacement: '@tanstack-router-testing/react-start-testing/shim',
              },
            ],
          },
        };
      },
    },
  ];
  return plugins;
};

const VIRTUAL_RSC_RUNTIME = 'virtual:tanstack-rsc-runtime';
const RESOLVED_VIRTUAL_RSC_RUNTIME = '\0@tanstack/react-start/testing/rsc-runtime';

const tanstackStartRscTestingRuntime = (): Plugin => ({
  name: '@tanstack/react-start/testing-rsc-runtime',
  resolveId(id) {
    if (id === VIRTUAL_RSC_RUNTIME) return RESOLVED_VIRTUAL_RSC_RUNTIME;
    return;
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
