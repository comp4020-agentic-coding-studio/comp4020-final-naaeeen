import { fork, spawnSync, type ForkOptions } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import { SERVER_NODE_ARGS } from "../src/server-runtime.ts";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const expectedArgs = ["--max-semi-space-size=16"];
const resourceURL = new URL("../tools/board-resource.mjs", import.meta.url);
type Launch = { modulePath: string; args: string[]; options: ForkOptions };

// Inspect the real instrument launch without running its CLI, server or workload.
function resourceLaunch(serverArgs: readonly string[] = SERVER_NODE_ARGS): Launch {
  const source = readFileSync(resourceURL, "utf8");
  const ast = ts.createSourceFile("board-resource.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const calls: string[] = [], runtimeImports: ts.ImportDeclaration[] = [];
  function collect(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === "../src/server-runtime.ts") runtimeImports.push(node);
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "fork") calls.push(node.getText(ast));
    ts.forEachChild(node, collect);
  }
  collect(ast);
  expect(calls).toHaveLength(1);
  expect(runtimeImports).toHaveLength(1);
  const bindings = runtimeImports[0]!.importClause?.namedBindings;
  expect(bindings && ts.isNamedImports(bindings) ? bindings.elements.map(binding => binding.getText(ast)) : [])
    .toEqual(["SERVER_NODE_ARGS"]);
  const evaluate = new Function("fork", "fileURLToPath", "join", "dir", "protocolHash", "root", "process", "SERVER_NODE_ARGS",
    "return (" + calls[0]!.replaceAll("import.meta.url", JSON.stringify(resourceURL.href)) + ");");
  return evaluate((modulePath: string, args: string[], options: ForkOptions) => ({ modulePath, args, options }),
    fileURLToPath, join, "/resource-fixture", "protocol-fixture", root,
    { env: { NODE_ENV: "development", RUNTIME_BUDGET_PROBE: "preserved" }, execArgv: ["--max-old-space-size=64"] }, serverArgs);
}

function nodeArguments(args: string[]) {
  const child = spawnSync(process.execPath, [...args, "-e", "process.stdout.write(JSON.stringify(process.execArgv))"], {
    encoding: "utf8", env: { ...process.env, NODE_OPTIONS: undefined },
  });
  expect(child.status, child.stderr).toBe(0);
  return JSON.parse(child.stdout) as string[];
}

describe("server young-generation launch budget", () => {
  test("the shared server arguments are immutable and specify only the young-generation budget", () => {
    expect(SERVER_NODE_ARGS).toEqual(expectedArgs);
    expect(Object.isFrozen(SERVER_NODE_ARGS)).toBe(true);
    expect(Reflect.set(SERVER_NODE_ARGS, 0, "--max-old-space-size=64")).toBe(false);
    expect(SERVER_NODE_ARGS).toEqual(expectedArgs);
  });

  test("importing the shared arguments does not flag the generator or mutate its environment", () => {
    const runtimeURL = new URL("../src/server-runtime.ts", import.meta.url);
    const code = "const before = [...process.execArgv], options = process.env.NODE_OPTIONS;" +
      "await import(" + JSON.stringify(runtimeURL.href) + ");" +
      "process.stdout.write(JSON.stringify({before, after: process.execArgv, optionsChanged: options !== process.env.NODE_OPTIONS}));";
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      encoding: "utf8", env: { ...process.env, NODE_OPTIONS: undefined },
    });
    expect(child.status, child.stderr).toBe(0);
    const result = JSON.parse(child.stdout);
    expect(result.after).toEqual(result.before);
    expect(result.after).not.toContain(expectedArgs[0]);
    expect(result.optionsChanged).toBe(false);
  });

  test("Docker starts Node directly with the budget before the server entry point", () => {
    const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
    const command = JSON.parse(dockerfile.match(/^CMD (.+)$/m)![1]!) as string[];
    expect(command).toEqual(["node", ...expectedArgs, "src/server.ts"]);
    expect(nodeArguments(command.slice(1, -1)).slice(0, expectedArgs.length)).toEqual(expectedArgs);
    expect(dockerfile).not.toMatch(/NODE_OPTIONS/);
  });

  test("pnpm start gives Node the same budget without a resident launcher", () => {
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const command = manifest.scripts.start.split(/\s+/) as string[];
    expect(command).toEqual(["node", ...expectedArgs, "src/server.ts"]);
    expect(nodeArguments(command.slice(1, -1)).slice(0, expectedArgs.length)).toEqual(expectedArgs);
  });

  test("the resource child receives only a copied server budget and keeps its environment", () => {
    const launch = resourceLaunch();
    expect(launch.modulePath).toBe(fileURLToPath(resourceURL));
    expect(launch.args).toEqual(["--child", "--data", "/resource-fixture/data", "--protocol", "protocol-fixture"]);
    expect(launch.options.execArgv).toEqual(expectedArgs);
    expect(launch.options.execArgv).not.toBe(SERVER_NODE_ARGS);
    expect(launch.options.env).toEqual({ NODE_ENV: "test", RUNTIME_BUDGET_PROBE: "preserved" });
    expect(launch.options.cwd).toBe(root);
  });

  test("a real resource child observes its explicit budget and inherited test environment", async () => {
    const launch = resourceLaunch(), dir = mkdtempSync(join(tmpdir(), "comp4020-runtime-"));
    const probe = join(dir, "probe.mjs");
    writeFileSync(probe, "process.send({execArgv: process.execArgv, pid: process.pid, ppid: process.ppid, " +
      "nodeEnv: process.env.NODE_ENV, marker: process.env.RUNTIME_BUDGET_PROBE}); process.disconnect();\n");
    const child = fork(probe, [], launch.options);
    let stderr = "";
    child.stderr?.on("data", chunk => { stderr += String(chunk); });
    try {
      const result = await new Promise<{ execArgv: string[]; pid: number; ppid: number; nodeEnv: string; marker: string }>((resolve, reject) => {
        let message: unknown;
        child.once("message", value => { message = value; });
        child.once("error", reject);
        child.once("exit", (code, signal) => {
          if (code !== 0 || !message) reject(new Error("Runtime probe failed: " + code + "/" + signal + " " + stderr));
          else resolve(message as { execArgv: string[]; pid: number; ppid: number; nodeEnv: string; marker: string });
        });
      });
      expect(result.execArgv).toEqual(expectedArgs);
      expect(result.pid).toBe(child.pid);
      expect(result.ppid).toBe(process.pid);
      expect(result.nodeEnv).toBe("test");
      expect(result.marker).toBe("preserved");
    } finally {
      if (child.exitCode === null) child.kill();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
