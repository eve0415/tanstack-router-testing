import type { AnyRouter } from '@tanstack/react-router';
import type { Manifest } from '@tanstack/router-core';
import type { ReactElement } from 'react';

import { RouterClient } from '@tanstack/react-router/ssr/client';
import { RouterServer, createRequestHandler, renderRouterToStream, renderRouterToString } from '@tanstack/react-router/ssr/server';
import { hydrateRoot } from 'react-dom/client';

export type RouterSsrMode = 'string' | 'stream';

export interface CreateRouterSsrHarnessOptions<TRouter extends AnyRouter> {
  readonly createRouter: () => TRouter;
  readonly request?: Request | string | URL;
  readonly mode?: RouterSsrMode;
  readonly getRouterManifest?: () => Manifest | Promise<Manifest>;
}

export interface HydrateRouterSsrOptions<TRouter extends AnyRouter> {
  readonly createRouter?: () => TRouter;
  readonly container?: Document | Element;
}

export interface RouterSsrHarness<TRouter extends AnyRouter> {
  readonly request: Request;
  readonly router: TRouter;
  readonly response: Response;
  readonly responseHeaders: Headers;
  readonly html: string;
  readonly mode: RouterSsrMode;
  readonly hydrate: (options?: HydrateRouterSsrOptions<TRouter>) => Promise<{
    readonly router: TRouter;
    readonly errors: readonly unknown[];
    readonly unmount: () => void;
  }>;
}

export const createRouterSsrHarness = async <TRouter extends AnyRouter>(
  options: CreateRouterSsrHarnessOptions<TRouter>,
): Promise<RouterSsrHarness<TRouter>> => {
  const request = toRequest(options.request);
  const mode = options.mode ?? 'string';
  let router: TRouter | undefined;
  let responseHeaders: Headers | undefined;

  const handler = createRequestHandler({
    request,
    createRouter: options.createRouter,
    ...(options.getRouterManifest ? { getRouterManifest: options.getRouterManifest } : {}),
  });

  const response = await handler(ctx => {
    router = ctx.router;
    responseHeaders = ctx.responseHeaders;

    const children = <RouterServer router={ctx.router} />;
    if (mode === 'stream') {
      return renderRouterToStream({
        request: ctx.request,
        responseHeaders: ctx.responseHeaders,
        router: ctx.router,
        children,
      });
    }

    return renderRouterToString({
      responseHeaders: ctx.responseHeaders,
      router: ctx.router,
      children,
    });
  });

  if (!router || !responseHeaders) {
    throw new Error('[tanstack-router-testing] createRouterSsrHarness: request handler did not expose a router.');
  }

  const html = await response.clone().text();

  return {
    request,
    router,
    response,
    responseHeaders,
    html,
    mode,
    hydrate: hydrateOptions =>
      hydrateRouterSsr({
        html,
        createRouter: hydrateOptions?.createRouter ?? options.createRouter,
        ...(hydrateOptions?.container ? { container: hydrateOptions.container } : {}),
      }),
  };
};

const hydrateRouterSsr = async <TRouter extends AnyRouter>({
  html,
  createRouter,
  container,
}: {
  readonly html: string;
  readonly createRouter: () => TRouter;
  readonly container?: Document | Element;
}): Promise<{
  readonly router: TRouter;
  readonly errors: readonly unknown[];
  readonly unmount: () => void;
}> => {
  const target = container ?? document;
  const rootElement = target instanceof Document ? target : target.ownerDocument;

  if (!rootElement) {
    throw new Error('[tanstack-router-testing] hydrate: container is not attached to a document.');
  }

  if (target instanceof Document) {
    target.open();
    target.write(html);
    target.close();
  } else {
    target.innerHTML = html;
  }

  const errors: unknown[] = [];
  const router = createRouter();
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };

  try {
    const root = hydrateRoot(rootElement, <RouterClient router={router} /> as ReactElement);
    await new Promise<void>(resolve => {
      setTimeout(resolve, 0);
    });
    return {
      router,
      errors,
      unmount: () => root.unmount(),
    };
  } finally {
    console.error = originalError;
  }
};

const toRequest = (request: Request | string | URL | undefined): Request => {
  if (request instanceof Request) return request;
  const url = request?.toString() ?? 'http://tanstack-router-testing.test/';
  return new Request(url);
};
