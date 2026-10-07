import { defineConfig } from "vitest/config";
export default defineConfig({ test: {
  include: ["spec/board-*.test.ts"],
  coverage: { provider: "v8", include: ["src/board-*.ts", "board/*.js", "board/*.tsx", "board/*.jsx"],
    reporter: ["text", "json-summary"], reportsDirectory: ".local/board-coverage" }
} });
