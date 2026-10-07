import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const origin = process.env.BOARD_PREVIEW_URL || "http://localhost:4099";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("This native check is loopback-only.");
await mkdir(".local/board-native", { recursive: true });
const browser = await chromium.launch({ headless: true });
const a = await browser.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["clipboard-read", "clipboard-write"] });
const b = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
const first = await a.newPage(), second = await b.newPage(), errors = [], urls = [];
first.on("pageerror", error => errors.push(error.message)); second.on("pageerror", error => errors.push(error.message)); first.on("request", request => urls.push(request.url()));
const context = page => page.evaluate(async () => (await fetch("/api/board/context", { cache: "no-store" })).json());
const houseIds = new WeakMap();
const snapshot = async page => {
  let houseId = houseIds.get(page); if (!houseId) { const me = await context(page); if (!me.home) throw new Error(`Context rejected: ${me.code || "no house"}`); houseId = me.home.id; houseIds.set(page,houseId); }
  const result = await page.evaluate(async id => (await fetch(`/api/board/snapshot?houseId=${encodeURIComponent(id)}`, { cache: "no-store" })).json(), houseId);
  if (!result.elements) throw new Error(`Snapshot rejected: ${result.code || "invalid shape"}`); return result;
};
async function wait(check, label) { const until = Date.now() + 10000; while (Date.now() < until) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 250)); } throw new Error(`Timeout: ${label}`); }
const hashes = Object.fromEntries(await Promise.all(["board/main.jsx", "board/client.js", "board/interaction.js", "board/workspace.css", "public/board-assets/app.js", "public/board-assets/app.css"].map(async path => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
await writeFile(".local/board-native/source-hashes.json", JSON.stringify(hashes, null, 2));
try {
  await first.goto(`${origin}/board/`); await first.getByLabel("Your name", { exact: true }).fill("Canvas friend"); await first.getByRole("button", { name: "Create house", exact: true }).click();
  await first.locator(".excalidraw canvas.interactive").waitFor(); assert.deepEqual(await first.evaluate(()=>[innerWidth,innerHeight]),[1920,1080]); const home = (await context(first)).home;
  await first.getByRole("button", { name: "Sticky note", exact: true }).click(); await first.getByLabel("Your note", { exact: true }).fill("An idea\nAn author-written next step"); await first.getByRole("button", { name: "Place note", exact: true }).click();
  await wait(async () => (await snapshot(first)).elements.filter(e => !e.isDeleted).length >= 2, "bound sticky saved");
  const sticky = (await snapshot(first)).elements; assert(sticky.some(e => e.type === "text" && e.containerId)); assert(sticky.some(e => e.type === "rectangle" && e.boundElements?.some(bound => bound.type === "text")));
  await first.getByLabel("Message to everyone in your house", { exact: true }).fill("Native shortcut\nSecond line"); await first.getByLabel("Message to everyone in your house", { exact: true }).press("Control+Enter");
  await wait(async () => (await snapshot(first)).chat.some(message => message.text === "Native shortcut\nSecond line"), "native chat shortcut sent"); assert.equal(await first.getByLabel("Message to everyone in your house", { exact: true }).inputValue(), "");
  await second.goto(`${origin}/board/`); await second.getByLabel("Your name", { exact: true }).fill("Drawing friend"); await second.getByLabel("House code", { exact: true }).fill(home.code); await second.getByRole("button", { name: "Join house", exact: true }).click(); await second.locator(".excalidraw canvas.interactive").waitFor(); assert.deepEqual(await second.evaluate(()=>[innerWidth,innerHeight]),[390,844]);
  await wait(async () => await second.getByText("Native shortcut\nSecond line", { exact: true }).count() === 1, "peer sees multiline chat");
  await wait(async () => await first.locator(".resident-avatar").count() === 2 && await second.locator(".resident-avatar").count() === 2, "immediate residents before pointer movement");
  const beforePaste = (await snapshot(first)).elements;
  await first.evaluate(async () => { const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 48; const context = canvas.getContext("2d"); context.fillStyle = "#86a679"; context.fillRect(0,0,64,48); const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/png")); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); });
  await first.locator(".excalidraw canvas.interactive").click({ position: { x: 550, y: 300 } }); await first.keyboard.press("Control+V");
  await wait(async () => (await snapshot(first)).elements.some(e => e.type === "image" && !e.isDeleted), "native PNG clipboard saved");
  const pasted = (await snapshot(first)).elements.find(e => e.type === "image" && !e.isDeleted); assert(pasted && pasted.fileId); assert((await snapshot(second)).files.some(file => file.id === pasted.fileId));
  const pngDownload = first.waitForEvent("download"); await first.getByRole("button",{name:"Download PNG",exact:true}).click(); const png = await pngDownload; await png.saveAs(".local/board-native/canvas-export.png"); assert.equal(png.suggestedFilename(),"house-board.png");
  const canvasDownload = first.waitForEvent("download"); await first.getByRole("button",{name:"Download canvas file",exact:true}).click(); const canvasFile = await canvasDownload; await canvasFile.saveAs(".local/board-native/canvas-export.excalidraw"); const exported = JSON.parse(await readFile(".local/board-native/canvas-export.excalidraw","utf8")); assert(exported.elements.some(e=>e.type==="image"));
  await second.getByRole("button", { name: "Collapse house chat", exact: true }).click(); await second.locator(".excalidraw canvas.interactive").click({ position: { x: 200, y: 160 } }); await second.keyboard.press("r");
  const canvas = await second.locator(".excalidraw canvas.interactive").boundingBox(); await second.mouse.move(canvas.x + 120, canvas.y + 180); await second.mouse.down(); await second.mouse.move(canvas.x + 220, canvas.y + 260, { steps: 8 }); await second.mouse.up();
  await wait(async () => (await snapshot(first)).elements.filter(e => e.type === "rectangle" && !e.isDeleted).length >= 2, "peer native rectangle saved");
  const peer = (await snapshot(first)).elements.find(e => e.type === "rectangle" && !beforePaste.some(before => before.id === e.id)); assert(peer);
  await first.locator(".excalidraw").focus();
  const undoDiagnostics = [];
  for(let attempt=0;attempt<3;attempt++) { await first.keyboard.press("Control+z"); await new Promise(resolve=>setTimeout(resolve,500)); const current = await snapshot(first); undoDiagnostics.push({attempt,elements:current.elements.map(e=>({id:e.id,type:e.type,version:e.version,isDeleted:e.isDeleted}))}); assert(current.elements.some(e=>e.id===peer.id&&!e.isDeleted),"each own undo must preserve peer"); if(current.elements.some(e=>e.id===pasted.id&&e.isDeleted))break; }
  await writeFile(".local/board-native/undo-diagnostic.json",JSON.stringify(undoDiagnostics,null,2));
  assert((await snapshot(first)).elements.some(e=>e.id===pasted.id&&e.isDeleted),"own undo tombstone"); assert((await snapshot(first)).elements.some(e => e.id === peer.id && !e.isDeleted), "own undo must preserve unrelated peer drawing");
  await first.keyboard.press("Control+Shift+z"); await wait(async () => (await snapshot(first)).elements.some(e => e.id === pasted.id && !e.isDeleted && e.version > pasted.version), "own redo newer version");
  const chat = first.locator(".chat-window"), handle = first.locator(".chat-handle"); const old = await chat.boundingBox(), grip = await handle.boundingBox(); await first.mouse.move(grip.x + 45, grip.y + 16); await first.mouse.down(); await first.mouse.move(grip.x - 220, grip.y - 100, { steps: 5 }); await first.mouse.up(); const moved = await chat.boundingBox(); assert(moved.x < old.x && moved.y < old.y);
  const resize = await first.locator(".chat-resize").boundingBox(); await first.mouse.move(resize.x + 7, resize.y + 7); await first.mouse.down(); await first.mouse.move(resize.x - 35, resize.y - 45, { steps: 5 }); await first.mouse.up(); assert((await chat.boundingBox()).width < moved.width);
  await first.screenshot({ path: ".local/board-native/desktop.png" }); await second.screenshot({ path: ".local/board-native/mobile.png" });
  assert(!urls.some(url => /house-world\.js|house-ui\.js|three\.module/.test(url)), "direct board must not import the game"); assert.equal(errors.length, 0, `browser page errors: ${errors.join("; ")}`);
  await first.reload(); await first.locator(".excalidraw canvas.interactive").waitFor(); assert((await snapshot(first)).elements.some(e => e.id === peer.id && !e.isDeleted));
  console.log(JSON.stringify({ passed: true, desktop: [1920,1080], mobile: [390,844], native: ["standalone create/join", "bound multiline sticky", "Ctrl+Enter chat", "PNG clipboard", "peer rectangle", "own undo preserves peer", "redo version", "chat drag/resize", "reload", "no game import"], screenshots: [".local/board-native/desktop.png", ".local/board-native/mobile.png"] }));
} catch (error) {
  await first.screenshot({ path: ".local/board-native/failure-desktop.png" }).catch(() => {});
  await second.screenshot({ path: ".local/board-native/failure-mobile.png" }).catch(() => {});
  await writeFile(".local/board-native/failure.json", JSON.stringify({ error: error.message, pageErrors: errors, hashes }, null, 2)); throw error;
} finally { await browser.close(); }
