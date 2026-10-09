import { defineConfig } from 'vitest/config'

// Security-rules tests need the local database emulator, so they run separately:
//   npm run test:rules
export default defineConfig({
  test: { include: ['rules-tests/**/*.rules.ts'], testTimeout: 20000, hookTimeout: 30000, fileParallelism: false },
})
