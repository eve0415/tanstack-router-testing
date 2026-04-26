import type { StartTestRuntime, StartTestRuntimeOptions } from './runtime.ts';
import type { ComponentType } from 'react';

import { createElement } from 'react';
import { renderToReadableStream, renderToString } from 'react-dom/server';

import { createStartTestRuntime } from './runtime.ts';

/**
 * Configuration for {@link createRscTestRuntime}.
 *
 * @remarks
 * Extends {@link StartTestRuntimeOptions} with an additional `streaming` flag
 * that controls the server rendering mode.
 */
export interface RscTestRuntimeOptions extends StartTestRuntimeOptions {
  /**
   * When `true`, renders via `renderToReadableStream` and collects individual
   * chunks. When `false` (default), uses `renderToString` for a single
   * synchronous HTML output.
   */
  readonly streaming?: boolean;
}

/**
 * The result of rendering a React Server Component via
 * {@link RscTestRuntime.renderServerComponent}.
 */
export interface RscRenderResult {
  /** The complete HTML string produced by the render. */
  readonly html: string;
  /**
   * A cloned `ReadableStream` of the raw bytes. Only present when the runtime
   * was created with `streaming: true`; otherwise `null`.
   */
  readonly stream: ReadableStream<Uint8Array> | null;
  /**
   * Decoded text chunks collected from the stream. Empty when `streaming` is
   * `false`.
   */
  readonly chunks: readonly string[];
}

/**
 * Extended test runtime that adds React Server Component rendering on top of
 * the base {@link StartTestRuntime}.
 *
 * @remarks
 * Created by {@link createRscTestRuntime}. Inherits all members from
 * {@link StartTestRuntime} and adds {@link renderServerComponent}.
 */
export interface RscTestRuntime extends StartTestRuntime {
  /**
   * Render a React Server Component to HTML.
   *
   * @typeParam TProps - The component's props type.
   * @param component - The React component to render.
   * @param props - Props forwarded to `createElement(component, props)`.
   * @returns A `Promise` resolving to an {@link RscRenderResult} containing the
   *   rendered HTML and, when streaming is enabled, the raw stream and decoded
   *   chunks.
   */
  readonly renderServerComponent: <TProps extends Record<string, unknown>>(component: ComponentType<TProps>, props: TProps) => Promise<RscRenderResult>;
}

/**
 * Create an {@link RscTestRuntime} for rendering React Server Components in a
 * simulated TanStack Start environment.
 *
 * @param options - Runtime configuration. See {@link RscTestRuntimeOptions}.
 * @returns A `Promise` resolving to an {@link RscTestRuntime} instance.
 *
 * @example
 * ```ts
 * import { createRscTestRuntime } from '@tanstack-router-testing/react-start-testing';
 *
 * const runtime = await createRscTestRuntime({ streaming: true });
 *
 * function Greeting({ name }: { name: string }) {
 *   return <h1>Hello, {name}!</h1>;
 * }
 *
 * const { html, chunks } = await runtime.renderServerComponent(Greeting, {
 *   name: 'TanStack',
 * });
 * // html === '<h1>Hello, TanStack!</h1>'
 *
 * runtime.cleanup();
 * ```
 *
 * @remarks
 * Delegates to {@link createStartTestRuntime} for the base runtime, then layers
 * on `renderServerComponent` which uses `react-dom/server` under the hood. Set
 * `streaming: true` in options to render via `renderToReadableStream` instead of
 * the default `renderToString`.
 */
export const createRscTestRuntime = async (options: RscTestRuntimeOptions = {}): Promise<RscTestRuntime> => {
  const base = await createStartTestRuntime(options);
  const streaming = options.streaming ?? false;

  return {
    ...base,
    renderServerComponent: async <TProps extends Record<string, unknown>>(component: ComponentType<TProps>, props: TProps): Promise<RscRenderResult> => {
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
      const collectChunks = async (): Promise<void> => {
        const result = await reader.read();
        if (result.value !== undefined) {
          chunks.push(decoder.decode(result.value, { stream: !result.done }));
        }
        if (!result.done) await collectChunks();
      };
      await collectChunks();

      const html = chunks.join('');
      return { html, stream: returnStream, chunks };
    },
  };
};
