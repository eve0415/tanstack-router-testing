#!/usr/bin/env node
/**
 * Scaffolds one smoke test per vendored app under `vendor/**` into
 * `packages/react-router-testing/tests/vendored/<category>/<app>.test.ts`.
 *
 * The generated tests:
 * 1. Import the app's `routeTree.gen.ts` if present.
 * 2. Instantiate the harness's `createTestRouter` with that tree.
 * 3. Assert route registry integrity, parent links, initial URL matching,
 *    static route matching, and mount state through the shared harness.
 *
 * Apps lacking a generated route tree get `it.todo` placeholders —
 * they're typically SSR / code-based-routing apps that need bespoke
 * fixtures.
 *
 * Usage:
 *   node scripts/gen-vendor-smoke-tests.mjs
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { Generator, getConfig } from '@tanstack/router-generator';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const TEST_ROOT = join(REPO_ROOT, 'packages/react-router-testing/tests/vendored');
const VENDOR_ROOTS = [
  { path: 'vendor/examples/react', category: 'examples-react' },
  { path: 'vendor/e2e/react-router', category: 'e2e-react-router' },
  { path: 'vendor/e2e/react-start', category: 'e2e-react-start' },
];

const ENTRYPOINT_CANDIDATES = ['src/main.tsx', 'src/main.jsx', 'src/main.ts', 'src/main.js', 'src/index.tsx', 'src/index.jsx', 'src/index.ts', 'src/index.js'];

const maybeGenerateRouteTree = async appAbs => {
  const rootRouteTree = join(appAbs, 'src/routeTree.gen.ts');
  if (existsSync(rootRouteTree)) return rootRouteTree;

  const nestedRouterRouteTree = join(appAbs, 'packages/router/src/routeTree.gen.ts');
  if (existsSync(nestedRouterRouteTree)) return nestedRouterRouteTree;

  if (!existsSync(join(appAbs, 'src/routes'))) return undefined;

  const hasTsrConfig = existsSync(join(appAbs, 'tsr.config.json'));
  const hasVirtualRoutes = existsSync(join(appAbs, 'routes.ts'));
  const inlineConfig = hasTsrConfig
    ? {}
    : {
        target: 'react',
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        ...(hasVirtualRoutes ? { virtualRouteConfig: './routes.ts' } : {}),
      };
  const config = getConfig(inlineConfig, appAbs);
  const generator = new Generator({ root: appAbs, config });
  await generator.run();

  return existsSync(rootRouteTree) ? rootRouteTree : undefined;
};

const findEntrypoint = appAbs => ENTRYPOINT_CANDIDATES.map(entry => join(appAbs, entry)).find(entry => existsSync(entry));

const renderTest = (appAbs, routeTreeAbs, entrypointAbs) => {
  const appRel = relative(REPO_ROOT, appAbs);
  const appName = appAbs.split('/').pop();
  // From tests/vendored/<category>/<app>.test.ts, go up 4 levels to repo root.
  const importPath = `../../../../../${appRel}`;

  if (!routeTreeAbs && !entrypointAbs) {
    return `/**
 * Auto-generated smoke test for vendored app \`${appRel}\`.
 * No routeTree.gen.ts or browser entrypoint was found.
 * Wire a bespoke fixture for this app shape.
 */
import { describe, it } from 'vitest';

describe('vendored smoke: ${appName}', () => {
  it.todo('bespoke harness test (no routeTree.gen)');
});
`;
  }

  if (entrypointAbs && !routeTreeAbs) {
    const entryRel = relative(appAbs, entrypointAbs);
    return `/**
 * Auto-generated smoke test for vendored app \`${appRel}\`.
 * Boots the app through its browser entrypoint.
 */
import { describe } from 'vitest';

import { assertVendoredAppEntryHarness } from '../_shared/assertVendoredAppEntryHarness.ts';

describe('vendored app entry: ${appName}', () => {
  assertVendoredAppEntryHarness(() => import('${importPath}/${entryRel}'));
});
`;
  }

  const routeTreeRel = relative(appAbs, routeTreeAbs);
  return `/**
 * Auto-generated smoke test for vendored app \`${appRel}\`.
 * Imports the generated route tree and runs shared harness assertions.
 */
import { describe } from 'vitest';

import { routeTree } from '${importPath}/${routeTreeRel}';
import { assertVendoredRouteTreeHarness } from '../_shared/assertVendoredRouteTreeHarness.ts';

describe('vendored smoke: ${appName}', () => {
  assertVendoredRouteTreeHarness(routeTree);
});
`;
};

let generated = 0;
let appEntries = 0;
let todos = 0;

for (const { path: root, category } of VENDOR_ROOTS) {
  const fullRoot = join(REPO_ROOT, root);
  if (!existsSync(fullRoot)) continue;

  for (const entry of readdirSync(fullRoot)) {
    const appPath = join(fullRoot, entry);
    const stat = statSync(appPath);
    if (!stat.isDirectory()) continue;
    if (entry.startsWith('.')) continue;

    const routeTreePath = await maybeGenerateRouteTree(appPath);
    const entrypointPath = routeTreePath ? undefined : findEntrypoint(appPath);

    const outFile = join(TEST_ROOT, category, `${entry}.test.ts`);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, renderTest(appPath, routeTreePath, entrypointPath));

    if (routeTreePath) generated += 1;
    else if (entrypointPath) appEntries += 1;
    else todos += 1;
  }
}

console.log(`[gen-vendor-smoke-tests] generated ${generated} route-tree tests, ${appEntries} app-entry tests, ${todos} todo placeholders.`);
