/**
 * No-op shim for `@tanstack/react-start/server-entry`.
 *
 * Aliased automatically when {@link tanstackStartTesting} runs with
 * `aliasReactStart: true` (the default). Prevents the real server
 * bootstrap from loading during tests.
 *
 * @module
 */

/**
 * Identity passthrough matching the real `createServerEntry` signature.
 *
 * @param entry - Server entry object with a `fetch` handler.
 * @returns The same entry, unmodified.
 */
export const createServerEntry = <T extends { fetch: (...args: unknown[]) => unknown }>(entry: T): T => entry;

export default {
  fetch: () => new Response(null, { status: 200 }),
};
