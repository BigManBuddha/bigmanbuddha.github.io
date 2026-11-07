import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { version } from './package.json';

export default defineConfig({
  // Relative base so the built site works at any URL (e.g. username.github.io/repo/).
  base: './',
  plugins: [
    react(),
    // Publishes dist/version.json so open copies of the app can spot a new release.
    {
      name: 'slate-version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    // Logic tests run in plain Node. Component tests opt into a browser-like DOM
    // with a `// @vitest-environment jsdom` comment at the top of the file.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
