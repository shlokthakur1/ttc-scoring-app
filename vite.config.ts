import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build is a single self-contained index.html (JS, CSS and fonts inlined),
// so the same file works on GitHub Pages and when opened straight from disk
// on the tournament laptop with no internet.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
  },
  test: {
    environment: 'node',
  },
});
