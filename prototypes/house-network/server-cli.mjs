import { start } from './server.mjs';
const options = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const split = argument.indexOf('=');
  if (!argument.startsWith('--') || split < 0) throw new Error('Use --transport=sse --port=0 --database=./.local/file.sqlite');
  return [argument.slice(2, split), argument.slice(split + 1)];
}));
const server = await start({
  transport: options.transport ?? 'sse',
  port: Number(options.port ?? 0),
  ...(options.database ? { database: options.database } : {}),
});
if (process.send) process.send({ baseUrl: server.baseUrl, transport: server.transport });
else process.stdout.write(JSON.stringify({ baseUrl: server.baseUrl, transport: server.transport, fixtureOnly: true }) + '\n');
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await server.close();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
process.on('message', (message) => { if (message?.type === 'close') stop(); });
