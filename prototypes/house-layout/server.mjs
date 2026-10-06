import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const prototypeRoot = fileURLToPath(new URL('.', import.meta.url)), root = path.resolve(prototypeRoot, '../..');
const routes = new Map([
  ['/', [path.join(prototypeRoot, 'index.html'), 'text/html; charset=utf-8']],
  ['/app.js', [path.join(prototypeRoot, 'app.js'), 'text/javascript; charset=utf-8']],
  ['/style.css', [path.join(prototypeRoot, 'style.css'), 'text/css; charset=utf-8']],
  ['/model.mjs', [path.join(prototypeRoot, 'model.mjs'), 'text/javascript; charset=utf-8']],
  ['/vendor/three.module.js', [path.join(root, 'node_modules/three/build/three.module.js'), 'text/javascript; charset=utf-8']],
  ['/vendor/three.core.js', [path.join(root, 'node_modules/three/build/three.core.js'), 'text/javascript; charset=utf-8']],
]);
export const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed'); return; }
  let pathname;
  try {
    if (!request.url || request.url.includes('..') || /%2e|%2f|%5c|\\\\/i.test(request.url)) throw new Error('Invalid path');
    pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  } catch { response.writeHead(400).end('Invalid path'); return; }
  const route = routes.get(pathname); if (!route) { response.writeHead(404).end('Not found'); return; }
  try {
    const data = await readFile(route[0]);
    response.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(503).end('Prototype asset unavailable'); }
});
const port = Number(process.env.PORT ?? 4092);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1 to 65535');
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, '127.0.0.1', () => console.log('House layout prototype: http://127.0.0.1:' + port));
