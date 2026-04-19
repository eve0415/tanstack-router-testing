/**
 * Legacy package wrapper for the upstream-shaped Start testing Vite plugin.
 *
 * @packageDocumentation
 */

import type { Plugin, UserConfig } from 'vite';

import { tanstackRouter } from '@tanstack/router-plugin/vite';

export interface TanstackStartTestingOptions {
  readonly routesDirectory?: string;
  readonly generatedRouteTree?: string;
  readonly aliasReactStart?: boolean;
  readonly rsc?: boolean;
}

export const tanstackStartTesting = (options: TanstackStartTestingOptions = {}): readonly Plugin[] => {
  const routerPlugins = tanstackRouter({
    routesDirectory: options.routesDirectory ?? 'src/routes',
    generatedRouteTree: options.generatedRouteTree ?? 'src/routeTree.gen.ts',
    target: 'react' as const,
  });

  return [
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
};

const VIRTUAL_RSC_RUNTIME = 'virtual:tanstack-rsc-runtime';
const RESOLVED_VIRTUAL_RSC_RUNTIME = '\0@tanstack/react-start/testing/rsc-runtime';

const tanstackStartRscTestingRuntime = (): Plugin => ({
  name: '@tanstack/react-start/testing-rsc-runtime',
  resolveId(id) {
    if (id === VIRTUAL_RSC_RUNTIME) return RESOLVED_VIRTUAL_RSC_RUNTIME;
    return undefined;
  },
  load(id) {
    if (id !== RESOLVED_VIRTUAL_RSC_RUNTIME) return undefined;
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

/**
 * Current package version.
 */
export const VERSION = '0.0.0';
