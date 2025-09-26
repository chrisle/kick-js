import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    silent: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    maxConcurrency: 1,
    fileParallelism: false,
  },
});