import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["spec/board-client.test.ts", "spec/board-ui.test.ts"], coverage: { provider: "v8", include: ["board/client.js", "board/interaction.js"], reporter: ["text", "json-summary"], reportsDirectory: ".local/board-client-coverage" } } });
