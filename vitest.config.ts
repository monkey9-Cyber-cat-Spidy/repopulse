import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@repopulse/scanner': path.resolve(__dirname, 'packages/scanner/src/index.ts'),
      '@repopulse/graph': path.resolve(__dirname, 'packages/graph/src/index.ts'),
      '@repopulse/truth-engine': path.resolve(__dirname, 'packages/truth-engine/src/index.ts'),
      '@repopulse/db': path.resolve(__dirname, 'packages/db/src/index.ts'),
      '@repopulse/mcp-server': path.resolve(__dirname, 'packages/mcp-server/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'packages/*/tests/']
    }
  }
});
