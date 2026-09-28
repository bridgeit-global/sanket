import path from 'node:path';

/** Shared aliases used by every Vitest environment. */
export const sharedVitestConfig = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Keep the production `import 'server-only'` boundary intact while
      // allowing Node-based Vitest workers to import server modules.
      'server-only': path.resolve(__dirname, 'tests/mocks/server-only.ts'),
    },
  },
};
