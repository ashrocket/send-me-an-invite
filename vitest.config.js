import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['test/unit/**/*.{test,spec}.{js,mjs}'],
    passWithNoTests: true,
  },
});
