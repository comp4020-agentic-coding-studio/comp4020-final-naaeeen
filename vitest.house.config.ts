import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["spec/house-*.test.ts"], coverage: { provider: "v8", include: ["src/house-*.ts", "public/house-geometry.js", "public/house-client.js"], reporter: ["text", "json-summary"], reportsDirectory: ".local/house-coverage" } } });
