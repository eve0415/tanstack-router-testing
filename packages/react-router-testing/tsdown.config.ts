import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/ssr.tsx', 'src/cleanup.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  deps: {
    neverBundle: ['@tanstack/react-router', '@testing-library/react', 'react', 'react-dom', 'react/jsx-runtime', 'vitest'],
  },
});
