import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"tests/e2e",outputDir:".local/browser-results",workers:1,retries:0,
 reporter:[["list"]],
 use:{baseURL:process.env.APP_URL??"http://127.0.0.1:4088",trace:"off",video:"off",screenshot:"only-on-failure",
 launchOptions:{executablePath:process.env.PW_EXECUTABLE,chromiumSandbox:true,args:["--use-angle=swiftshader"]}}
});
