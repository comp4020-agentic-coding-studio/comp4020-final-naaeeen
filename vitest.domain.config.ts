import {defineConfig} from "vitest/config";
export default defineConfig({test:{include:["spec/domain.test.ts"],globals:false,coverage:{provider:"v8",include:["src/domain.ts"]}}});
