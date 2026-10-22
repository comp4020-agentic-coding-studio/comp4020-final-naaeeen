import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['docs/spatial-redesign/evidence/six-browser/dom-calibration.test.mjs'],
    fileParallelism: false,
    testTimeout: 10_000,
  },
});
