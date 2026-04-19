import { existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
];
const REACT_START_TESTING_SHIM = fileURLToPath(new URL('../react-start-testing/src/shim.ts', import.meta.url));
const VIRTUAL_CLOUDFLARE_WORKERS = '\0tanstack-router-testing:cloudflare-workers';
const VIRTUAL_PARAGLIDE_RUNTIME = '\0tanstack-router-testing:paraglide-runtime';
const VIRTUAL_PARAGLIDE_MESSAGES = '\0tanstack-router-testing:paraglide-messages';
const VIRTUAL_STATIC_SERVER_FUNCTIONS = '\0tanstack-router-testing:static-server-functions';
const VIRTUAL_PRISMA_QUERY_COMPILER = '\0tanstack-router-testing:prisma-query-compiler';
const VIRTUAL_PRISMA_QUERY_COMPILER_WASM = '\0tanstack-router-testing:prisma-query-compiler-wasm';
const VIRTUAL_PRISMA_UTIL = '\0tanstack-router-testing:prisma-util';
const VIRTUAL_FIREBASE_APP = '\0tanstack-router-testing:firebase-app';
const VIRTUAL_FIREBASE_AUTH = '\0tanstack-router-testing:firebase-auth';
const VIRTUAL_KITCHEN_SINK_QUERY_CLIENT = '\0tanstack-router-testing:kitchen-sink-query-client';

const findVendorAppRoot = (importer: string): string | undefined => {
  let dir = dirname(importer);
  while (dir !== '/' && !dir.endsWith('/vendor')) {
    if (existsSync(resolve(dir, 'src'))) return dir;
    dir = dirname(dir);
  }
  return undefined;
};

const resolveMonorepoPackage = (source: string): string | null => {
  const packageMap: Record<string, string> = {
    '@router-mono-react-query/app': 'vendor/examples/react/router-monorepo-react-query/packages/app/src/index',
    '@router-mono-react-query/post-feature': 'vendor/examples/react/router-monorepo-react-query/packages/post-feature/src/index',
    '@router-mono-react-query/post-query': 'vendor/examples/react/router-monorepo-react-query/packages/post-query/src/index',
    '@router-mono-react-query/router': 'vendor/examples/react/router-monorepo-react-query/packages/router/src/index',
    '@router-mono-simple-lazy/app': 'vendor/examples/react/router-monorepo-simple-lazy/packages/app/src/index',
    '@router-mono-simple-lazy/post-feature': 'vendor/examples/react/router-monorepo-simple-lazy/packages/post-feature/src/index',
    '@router-mono-simple-lazy/post-feature/post-id-page': 'vendor/examples/react/router-monorepo-simple-lazy/packages/post-feature/src/PostIdPage',
    '@router-mono-simple-lazy/post-feature/post-list': 'vendor/examples/react/router-monorepo-simple-lazy/packages/post-feature/src/PostList',
    '@router-mono-simple-lazy/router': 'vendor/examples/react/router-monorepo-simple-lazy/packages/router/src/index',
    '@router-mono-simple/app': 'vendor/examples/react/router-monorepo-simple/packages/app/src/index',
    '@router-mono-simple/post-feature': 'vendor/examples/react/router-monorepo-simple/packages/post-feature/src/index',
    '@router-mono-simple/router': 'vendor/examples/react/router-monorepo-simple/packages/router/src/index',
  };
  const target = packageMap[source];
  return target === undefined ? null : resolveExisting(resolve(fileURLToPath(new URL('../..', import.meta.url)), target));
};

const resolveExisting = (candidate: string): string | null => {
  const [bare = candidate, query] = candidate.split('?', 2);
  const querySuffix = query === undefined ? '' : `?${query}`;
  const candidates = [bare, ...(bare.endsWith('.js') ? [bare.slice(0, -3)] : [])];

  for (const base of candidates) {
    for (const extension of EXTENSIONS) {
      const file = `${base}${extension}`;
      if (existsSync(file) && statSync(file).isFile()) return `${file}${querySuffix}`;
    }
    if (existsSync(base) && statSync(base).isDirectory()) {
      for (const extension of EXTENSIONS.filter(Boolean)) {
        const indexFile = resolve(base, `index${extension}`);
        if (existsSync(indexFile) && statSync(indexFile).isFile()) return `${indexFile}${querySuffix}`;
      }
    }
  }

  return null;
};

/**
 * Resolve vendored app-local aliases to concrete files.
 *
 * Each TanStack Start vendored app declares `~/*: ./src/*` in its own
 * tsconfig; we don't want 110 separate configs in this workspace, so
 * this plugin walks up from the importer until it finds a directory
 * containing a `src/` child, then rewrites aliases to existing files.
 */
const vendorAppAliasPlugin = () => ({
  name: 'tanstack-router-testing:vendor-app-alias',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined): string | null {
    if (source === 'cloudflare:workers') return VIRTUAL_CLOUDFLARE_WORKERS;
    if (source === '@tanstack/start-static-server-functions') return VIRTUAL_STATIC_SERVER_FUNCTIONS;
    if (source === '@prisma/client/runtime/query_compiler_bg.sqlite.mjs') return VIRTUAL_PRISMA_QUERY_COMPILER;
    if (source === '@prisma/client/runtime/query_compiler_bg.sqlite.wasm-base64.mjs') return VIRTUAL_PRISMA_QUERY_COMPILER_WASM;
    if (source === 'firebase/app') return VIRTUAL_FIREBASE_APP;
    if (source === 'firebase/auth') return VIRTUAL_FIREBASE_AUTH;
    if (source === '@/paraglide/runtime' || source === '@/paraglide/runtime.js') return VIRTUAL_PARAGLIDE_RUNTIME;
    if (source === '@/paraglide/messages' || source === '@/paraglide/messages.js') return VIRTUAL_PARAGLIDE_MESSAGES;
    if (source.startsWith('@router-mono-')) return resolveMonorepoPackage(source);

    if (importer === undefined) return null;
    if (!importer.includes('/vendor/')) return null;
    if (
      (source === '../main' || source === '../main.js') &&
      importer.includes('/vendor/examples/react/kitchen-sink-react-query-file-based/src/utils/queryOptions.ts')
    ) {
      return VIRTUAL_KITCHEN_SINK_QUERY_CLIENT;
    }
    if (!source.startsWith('~/') && !source.startsWith('@/') && !source.startsWith('convex/_generated/')) return null;

    const appRoot = findVendorAppRoot(importer);
    if (!appRoot) return null;

    if (source.startsWith('convex/_generated/')) {
      return resolveExisting(resolve(appRoot, source));
    }

    const rel = source.slice(2);
    if ((rel === 'utils/prisma' || rel === 'utils/prisma.js') && appRoot.endsWith('basic-auth')) {
      return VIRTUAL_PRISMA_UTIL;
    }
    return resolveExisting(resolve(appRoot, 'src', rel)) ?? resolveExisting(resolve(appRoot, rel));
  },
  load(id: string): string | null {
    if (id === VIRTUAL_CLOUDFLARE_WORKERS) {
      return 'export const env = new Proxy({}, { get: (_target, key) => process.env[String(key)] ?? "" });';
    }
    if (id === VIRTUAL_PARAGLIDE_RUNTIME) {
      return `
let currentLocale = 'en';
export const locales = ['en', 'de'];
export function getLocale() { return currentLocale; }
export function setLocale(locale) { currentLocale = locale; return currentLocale; }
export function shouldRedirect() { return false; }
`;
    }
    if (id === VIRTUAL_PARAGLIDE_MESSAGES) {
      return `
const message = (key) => (...args) => args.length ? key + ' ' + args.join(' ') : key;
export const m = new Proxy({}, { get: (_target, key) => message(String(key)) });
`;
    }
    if (id === VIRTUAL_STATIC_SERVER_FUNCTIONS) {
      return `
import { createMiddleware } from '@tanstack/react-start';
export const staticFunctionMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => next());
`;
    }
    if (id === VIRTUAL_PRISMA_QUERY_COMPILER) {
      return 'export default {};';
    }
    if (id === VIRTUAL_PRISMA_QUERY_COMPILER_WASM) {
      return 'export const wasm = "";';
    }
    if (id === VIRTUAL_PRISMA_UTIL) {
      return `
export const prismaClient = {
  user: {
    async findUnique() { return null; },
    async create(args) { return { id: 'test-user', ...(args?.data ?? {}) }; },
    async update(args) { return { id: args?.where?.id ?? 'test-user', ...(args?.data ?? {}) }; },
  },
};
export async function hashPassword(password) { return 'hashed:' + password; }
`;
    }
    if (id === VIRTUAL_FIREBASE_APP) {
      return 'export function initializeApp(config) { return { config }; }';
    }
    if (id === VIRTUAL_FIREBASE_AUTH) {
      return `
export class GithubAuthProvider {}
export function getAuth() { return { currentUser: null }; }
export function onAuthStateChanged(_auth, callback) { callback(null); return () => {}; }
export async function signInWithPopup() { return { user: { uid: 'test-user' } }; }
export async function signOut() {}
`;
    }
    if (id === VIRTUAL_KITCHEN_SINK_QUERY_CLIENT) {
      return `
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient();
`;
    }
    return null;
  },
});

export default defineConfig({
  plugins: [vendorAppAliasPlugin()],
  resolve: {
    alias: [
      {
        find: /^@tanstack\/react-start$/,
        replacement: REACT_START_TESTING_SHIM,
      },
    ],
    preserveSymlinks: false,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.?(c|m)[jt]s?(x)', 'tests/**/*.test.?(c|m)[jt]s?(x)'],
    setupFiles: ['./tests/setup/vendored-env.ts'],
    server: {
      deps: {
        inline: [/\/vendor\//, /react-tweet/],
      },
    },
  },
});
