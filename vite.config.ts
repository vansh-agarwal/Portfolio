import { defineConfig } from 'vite';

// The repo is served at https://vansh-agarwal.github.io/Portfolio/
export default defineConfig({
  base: '/Portfolio/',
  // Pre-bundle deps for the dev-only render harness too, so it never hot-reloads mid-render.
  optimizeDeps: {
    entries: ['index.html', 'tools/*.html'],
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
    // three.js lives in its own lazy chunk (~160 KB gzipped); that's expected.
    chunkSizeWarningLimit: 700,
  },
});
