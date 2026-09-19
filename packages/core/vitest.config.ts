import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "tools/iftaMatrix.mjs"],
      exclude: ["src/index.ts"],
      reporter: ["text"],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
