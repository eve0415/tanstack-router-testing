import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: ['**/dist', '**/node_modules', '**/vendor', '**/routeTree.gen.ts', 'pnpm-lock.yaml', 'packages/react-router-testing/tests/vendored'],
  arrowParens: 'avoid',
  singleQuote: true,
  jsxSingleQuote: true,
  printWidth: 160,
  experimentalSortImports: {
    order: 'asc',
    groups: [['type'], ['builtin'], ['external'], ['subpath', 'internal'], ['parent'], ['sibling'], ['index']],
  },
});
