/**
 * No-op shim for `@tanstack/react-start/server-entry`.
 *
 * Aliased automatically when {@link tanstackStartTesting} runs with
 * `aliasReactStart: true` (the default). Prevents the real server
 * bootstrap from loading during tests.
 *
 * @module
 */
export default {
  fetch: () => new Response(null, { status: 200 }),
};
