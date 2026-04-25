import type { ComponentType } from 'react';

import { createElement } from 'react';
import { renderToReadableStream, renderToString } from 'react-dom/server';

import { createStartTestRuntime, type StartTestRuntime, type StartTestRuntimeOptions } from './runtime.ts';

export interface RscTestRuntimeOptions extends StartTestRuntimeOptions {
  readonly streaming?: boolean;
}

export interface RscRenderResult {
  readonly html: string;
  readonly stream: ReadableStream<Uint8Array> | null;
  readonly chunks: readonly string[];
}

export interface RscTestRuntime extends StartTestRuntime {
  readonly renderServerComponent: <TProps extends Record<string, unknown>>(
    component: ComponentType<TProps>,
    props: TProps,
  ) => Promise<RscRenderResult>;
}

export const createRscTestRuntime = async (options: RscTestRuntimeOptions = {}): Promise<RscTestRuntime> => {
  const base = await createStartTestRuntime(options);
  const streaming = options.streaming ?? false;

  return {
    ...base,
    renderServerComponent: async <TProps extends Record<string, unknown>>(
      component: ComponentType<TProps>,
      props: TProps,
    ): Promise<RscRenderResult> => {
      const element = createElement(component, props);

      if (!streaming) {
        const html = renderToString(element);
        return { html, stream: null, chunks: [] };
      }

      const stream = await renderToReadableStream(element);
      const chunks: string[] = [];
      const decoder = new TextDecoder();

      const [collectStream, returnStream] = stream.tee();

      const reader = collectStream.getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(decoder.decode(result.value, { stream: !done }));
        }
      }

      const html = chunks.join('');
      return { html, stream: returnStream, chunks };
    },
  };
};
