import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/browser.ts', 'src/shim.ts', 'src/vite.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  deps: {
    neverBundle: [
      '@tanstack/react-router',
      '@tanstack/react-start',
      '@tanstack/router-plugin',
      '@tanstack/start-client-core',
      '@tanstack/start-fn-stubs',
      '@tanstack/start-storage-context',
      '@testing-library/react',
      'vite',
      'react',
      'react-dom',
      'react-dom/client',
      'react-dom/server',
      'react/jsx-runtime',
    ],
  },
});
