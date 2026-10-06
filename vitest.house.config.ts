import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["spec/house-*.test.ts"], coverage: { provider: "v8", include: ["src/house-*.ts", "src/server.ts", "public/house-*.js"], reporter: ["text", "json-summary"], reportsDirectory: ".local/house-coverage" } } });
