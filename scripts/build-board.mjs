import { build } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, lstat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "public/board-assets");
if (!output.startsWith(resolve(root, "public") + sep)) throw new Error("Unexpected board output directory.");
try { if ((await lstat(output)).isSymbolicLink()) throw new Error("Board output must not be a symlink."); }
catch (error) { if (error.code !== "ENOENT") throw error; }
// This task owns only generated board assets; source and saved user data are elsewhere.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const result = await build({
  absWorkingDir: root, entryPoints: ["board/main.jsx"], outdir: output,
  entryNames: "app", chunkNames: "chunks/[name]-[hash]", assetNames: "assets/[name]-[hash]",
  bundle: true, splitting: true, format: "esm", platform: "browser", target: "es2022",
  conditions: ["production"], minify: true, sourcemap: false, metafile: true,
  legalComments: "linked", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env.IS_PREACT": "false" },
  loader: { ".woff2": "file", ".woff": "file", ".ttf": "file", ".svg": "file" },
});
const editor = join(root, "node_modules/@excalidraw/excalidraw");
await cp(join(editor, "dist/prod/fonts"), join(output, "fonts"), { recursive: true });
// The editor resolves its font-subsetting workers relative to import.meta.url.
for (const entry of await readdir(join(editor, "dist/prod"), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".js")) await cp(join(editor, "dist/prod", entry.name), join(output, entry.name));
}
for (const name of ["LICENSE", "LICENSE.txt", "LICENSE.md"]) {
  try { await cp(join(editor, name), join(output, "EXCALIDRAW-LICENSE.txt")); break; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const editorPackage = JSON.parse(await readFile(join(editor, "package.json"), "utf8"));
await writeFile(join(output, "build-info.json"), JSON.stringify({
  editor: editorPackage.version, generated: true,
  outputs: Object.fromEntries(Object.entries(result.metafile.outputs).map(([path, info]) => [path, info.bytes])),
}, null, 2) + "\n");
console.log(`Built independent board assets with Excalidraw ${editorPackage.version}; fonts and licences are self-hosted.`);
