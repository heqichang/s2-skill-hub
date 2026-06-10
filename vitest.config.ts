import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/main/**/*.ts', 'src/shared/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/main/index.ts',
        'src/main/ipc/index.ts',
        'src/main/services/index.ts',
        'src/main/services/serviceManager.ts',
        'src/main/services/config.ts',
        'src/main/services/adapters/index.ts',
        'src/preload/**',
        'src/renderer/**'
      ],
      reporter: ['text', 'html']
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main')
    }
  }
})
