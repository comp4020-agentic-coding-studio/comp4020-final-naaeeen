import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomService, FixtureError, failure } from './room-service.mjs';

const allowedTransports = new Set(['sse', 'socket.io']);
const loopback = new Set(['127.0.0.1', '::ffff:127.0.0.1', '::1']);
function assertLoopback(request) {
  if (!loopback.has(request.socket.remoteAddress)) throw new FixtureError('FIXTURE_LOOPBACK_ONLY', 403);
}
function requireOrigin(request, origin) {
  if (request.headers.origin !== origin) throw new FixtureError('BAD_ORIGIN', 403);
}
async function jsonBody(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new FixtureError('JSON_REQUIRED', 400);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) throw new FixtureError('BODY_LIMIT', 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new FixtureError('INVALID_INPUT', 400);
    return value;
  } catch { throw new FixtureError('INVALID_INPUT', 400); }
}
function send(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers });
  response.end(JSON.stringify(body));
}

/** Explicit loopback-only factory; does not import any production module. */
export async function start({ transport = 'sse', port = 0, database } = {}) {
  if (!allowedTransports.has(transport)) throw new Error('transport must be sse or socket.io');
  const service = new RoomService(database);
  const activeSockets = new Set();
  let closedRead = 0;
  let closedWritten = 0;
  let baseUrl;
  let closed = false;
  const streams = new Set();
  const metrics = () => ({
    transport, acceptedMoves: service.acceptedMoves, rejectedMoves: service.rejectedMoves,
    rssMiB: process.memoryUsage().rss / 1024 / 1024,
    tcpStreamBytesRead: closedRead + [...activeSockets].reduce((sum, socket) => sum + socket.bytesRead, 0),
    tcpStreamBytesWritten: closedWritten + [...activeSockets].reduce((sum, socket) => sum + socket.bytesWritten, 0),
    connections: activeSockets.size,
  });
  const server = createServer(async (request, response) => {
    try {
      assertLoopback(request);
      const url = new URL(request.url, baseUrl);
      if (request.method === 'POST') requireOrigin(request, baseUrl);
      if (url.pathname === '/fixture/session' && request.method === 'POST') {
        const session = service.issueFixtureSession();
        send(response, 201, { identity: session.identity, fixture: true }, {
          'Set-Cookie': 'house_fixture=' + session.token + '; HttpOnly; SameSite=Strict; Path=/',
        });
        return;
      }
      // Metrics carry no session value; route is fixture-only and loopback-only.
      if (url.pathname === '/fixture/metrics' && request.method === 'GET') { send(response, 200, metrics()); return; }
      const identity = service.authenticate(request.headers.cookie);
      if (url.pathname === '/rooms' && request.method === 'POST') {
        const input = await jsonBody(request);
        if (Object.keys(input).some((key) => key !== 'capacity')) throw new FixtureError('INVALID_INPUT');
        send(response, 201, service.create(identity, input.capacity));
        return;
      }
      if (url.pathname === '/rooms/join' && request.method === 'POST') {
        const input = await jsonBody(request);
        if (Object.keys(input).some((key) => key !== 'code')) throw new FixtureError('INVALID_INPUT');
        send(response, 200, service.join(identity, input.code));
        return;
      }
      if (url.pathname === '/events' && request.method === 'GET' && transport === 'sse') {
        const roomId = url.searchParams.get('roomId');
        service.authorize(identity, roomId);
        response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        response.flushHeaders();
        const deliver = ({ snapshot }) => {
          if (closed || response.writableEnded || response.destroyed) return;
          if (response.writableLength > 1024 * 1024) { response.destroy(); return; }
          response.write('event: snapshot\ndata: ' + JSON.stringify(snapshot) + '\n\n');
        };
        const unsubscribe = service.subscribe(identity, roomId, deliver);
        streams.add(response);
        const heartbeat = setInterval(() => {
          if (!closed && !response.writableEnded && !response.destroyed) response.write(': heartbeat\n\n');
        }, 10000);
        response.on('close', () => { clearInterval(heartbeat); unsubscribe(); streams.delete(response); });
        return;
      }
      const match = /^\/rooms\/([^/]+)\/(snapshot|move|chat)$/.exec(url.pathname);
      if (match) {
        const [, roomId, command] = match;
        if (command === 'snapshot' && request.method === 'GET') { send(response, 200, service.snapshot(identity, roomId)); return; }
        if (command !== 'snapshot' && request.method === 'POST') {
          const input = await jsonBody(request);
          send(response, 200, service[command](identity, roomId, input));
          return;
        }
      }
      send(response, 404, { ok: false, code: 'NOT_FOUND' });
    } catch (error) {
      if (!response.headersSent) send(response, error.status ?? 500, failure(error));
      else response.destroy();
    }
  });
  server.on('connection', (socket) => {
    activeSockets.add(socket);
    socket.on('close', () => {
      closedRead += socket.bytesRead;
      closedWritten += socket.bytesWritten;
      activeSockets.delete(socket);
    });
  });
  let io;
  if (transport === 'socket.io') {
    io = new Server(server, {
      transports: ['websocket'], maxHttpBufferSize: 8192, serveClient: false,
      allowRequest: (request, callback) => {
        try { assertLoopback(request); requireOrigin(request, baseUrl); callback(null, true); }
        catch { callback('Fixture connection rejected', false); }
      },
    });
    io.use((socket, next) => {
      try {
        const identity = service.authenticate(socket.request.headers.cookie);
        const roomId = socket.handshake.query.roomId;
        service.authorize(identity, roomId);
        socket.data.identity = identity;
        socket.data.roomId = roomId;
        next();
      } catch { next(new Error('Fixture session or membership rejected')); }
    });
    io.on('connection', (socket) => {
      const { identity, roomId } = socket.data;
      socket.join('house:' + roomId);
      const unsubscribe = service.subscribe(identity, roomId, ({ snapshot, delta }) => {
        if (delta) socket.emit('delta', delta);
        else socket.emit('snapshot', snapshot);
      });
      for (const command of ['move', 'chat']) socket.on(command, (payload, acknowledge) => {
        if (typeof acknowledge !== 'function') return;
        try {
          // The opaque initial cookie is resolved again and membership rechecked.
          const currentIdentity = service.authenticate(socket.request.headers.cookie);
          acknowledge(service[command](currentIdentity, roomId, payload));
        } catch (error) { acknowledge(failure(error)); }
      });
      socket.on('disconnect', unsubscribe);
    });
  }
  try {
    await new Promise((accept, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', accept);
    });
    baseUrl = 'http://127.0.0.1:' + server.address().port;
  } catch (error) { service.close(); throw error; }
  return {
    transport, baseUrl, metrics,
    async close() {
      if (closed) return;
      closed = true;
      for (const response of streams) response.end();
      const closing = new Promise((resolve) => io ? io.close(resolve) : server.close(resolve));
      // Stop accepting before closing remaining HTTP/upgraded connections.
      server.closeAllConnections();
      for (const socket of activeSockets) socket.destroy();
      await closing;
      service.close();
    },
  };
}
