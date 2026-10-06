import { io } from 'socket.io-client';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function until(predicate, timeout = 2500) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeout) throw new Error('Timed out waiting for fixture observation');
    await sleep(10);
  }
}

/** Test-only synthetic client. Opaque cookie is issued by the loopback fixture route. */
export class FixtureClient {
  constructor(baseUrl, transport) {
    this.baseUrl = baseUrl;
    this.transport = transport;
    this.cookie = '';
    this.events = [];
    this.listeners = new Set();
  }

  static async create(baseUrl, transport) {
    const client = new FixtureClient(baseUrl, transport);
    const response = await fetch(baseUrl + '/fixture/session', {
      method: 'POST', headers: { Origin: baseUrl }, signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Fixture session failed: ' + response.status);
    client.cookie = response.headers.get('set-cookie').split(';')[0];
    client.identity = (await response.json()).identity;
    return client;
  }

  async request(path, body) {
    const response = await fetch(this.baseUrl + path, {
      method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(3000),
      headers: { Cookie: this.cookie, Origin: this.baseUrl, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }

  observe(event) {
    this.events.push(event);
    for (const listener of this.listeners) listener(event);
  }

  async connect(roomId) {
    this.roomId = roomId;
    this.events = [];
    if (this.transport === 'socket.io') {
      this.socket = io(this.baseUrl, {
        transports: ['websocket'], forceNew: true, reconnection: false, autoConnect: false,
        extraHeaders: { Cookie: this.cookie, Origin: this.baseUrl },
        query: { roomId },
      });
      this.socket.on('snapshot', (state) => this.observe({ type: 'snapshot', state }));
      this.socket.on('delta', (event) => this.observe({ type: 'delta', ...event }));
      await new Promise((resolve, reject) => {
        this.socket.once('connect', resolve);
        this.socket.once('connect_error', reject);
        this.socket.connect();
      });
    } else {
      this.abort = new AbortController();
      const response = await fetch(this.baseUrl + '/events?roomId=' + encodeURIComponent(roomId), {
        headers: { Cookie: this.cookie, Origin: this.baseUrl }, signal: this.abort.signal,
      });
      if (!response.ok) throw new Error('SSE rejected: ' + response.status);
      this.streamTask = this.readSse(response.body).catch((error) => {
        if (error.name !== 'AbortError') this.streamError = error;
      });
    }
    await until(() => this.events.some((event) => event.type === 'snapshot'));
  }

  async readSse(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const packet = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const line = packet.split('\n').find((part) => part.startsWith('data: '));
          if (line) this.observe({ type: 'snapshot', state: JSON.parse(line.slice(6)) });
        }
      }
    } finally { reader.releaseLock(); }
  }

  async command(type, payload) {
    if (this.transport === 'socket.io') {
      return new Promise((resolve, reject) => {
        this.socket.timeout(2500).emit(type, payload, (error, result) => error ? reject(error) : resolve(result));
      });
    }
    return (await this.request('/rooms/' + this.roomId + '/' + type, payload)).body;
  }

  async disconnect() {
    this.socket?.disconnect();
    this.abort?.abort();
    await this.streamTask;
    this.socket = undefined;
    this.abort = undefined;
    this.streamTask = undefined;
  }
}
