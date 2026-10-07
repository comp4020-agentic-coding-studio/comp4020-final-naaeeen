/** House-scoped durable board intents. Canvas preferences never enter the queue. */
export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const FATAL = new Set(["FORBIDDEN", "NO_HOUSE", "UNAUTHENTICATED", "IDENTITY_CHANGED"]);
const SUPPORTED = new Set(["rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "text", "image", "frame"]);
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export function validateImageFile(file) {
  if (!IMAGE_TYPES.has(file.type || file.mimeType)) throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Images must be at most 2 MiB. Resize the image and try again.");
}
export function safeLink(link) {
  if (!link) return null;
  try { const parsed = new URL(link); return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null; } catch { return null; }
}
export function sanitizeElements(elements) {
  return elements.filter(element => SUPPORTED.has(element.type)).map(element => {
    const { customData: _customData, ...plain } = element;
    return { ...plain, link: safeLink(element.link) };
  });
}
function winner(local, remote) {
  if (local.version !== remote.version) return local.version > remote.version ? local : remote;
  if (local.versionNonce !== remote.versionNonce) return local.versionNonce < remote.versionNonce ? local : remote;
  if (local.isDeleted !== remote.isDeleted) return local.isDeleted ? local : remote;
  return canonical(local) <= canonical(remote) ? local : remote;
}
/** Matches authority tie-breaking; retains all tombstones and fractional order. */
export function mergeBoardElements(local, incoming) {
  const map = new Map(local.map(element => [element.id, element]));
  for (const element of incoming) map.set(element.id, map.has(element.id) ? winner(map.get(element.id), element) : element);
  return [...map.values()].sort((a, b) => a.index && b.index ? a.index < b.index ? -1 : a.index > b.index ? 1 : a.id.localeCompare(b.id) : 0);
}
export function changedElements(previous, current) {
  const before = new Map(previous.map(element => [element.id, canonical(element)]));
  return current.filter(element => before.get(element.id) !== canonical(element));
}
function boardError(message, code) { return Object.assign(new Error(message), { code }); }

export function createBoardClient(options) {
  const { identityId, houseId } = options;
  const fetcher = options.fetch || globalThis.fetch.bind(globalThis);
  const storage = options.storage === undefined ? globalThis.sessionStorage : options.storage;
  const scope = `night-board:v1:${identityId}:${houseId}`;
  let queue = [], dirty = new Map(), fileData = {}, knownFiles = new Set(), timer, poll, retryTimer, socket;
  let closed = false, epoch = 0, inflight = null, initialized = false, draftVersion = 0, pointerAt = 0, subscriptionId = null, subscriptionRequest = 0;
  const state = { status: "connecting", connected: false, error: "", elements: [], files: [], chat: [], views: [], draft: "", conflicts: [], sequence: 0 };
  try {
    const cached = JSON.parse(storage?.getItem(scope) || "null");
    if (cached && cached.identityId === identityId && cached.houseId === houseId) {
      queue = cached.queue || []; dirty = new Map((cached.dirty || []).map(element => [element.id, element])); state.draft = cached.draft || ""; draftVersion = cached.draftVersion || 0; state.conflicts = cached.conflicts || []; fileData = cached.files || {};
      for (const entry of queue) if (entry.kind === "asset") fileData[entry.body.file.id] = { ...entry.body.file, created: entry.created };
      state.elements = mergeBoardElements(queue.flatMap(entry => entry.body.elements || []), [...dirty.values()]);
    }
  } catch { state.error = "This tab could not restore its pending work."; }
  const pending = () => queue.length + (dirty.size ? 1 : 0) + state.conflicts.length;
  const getState = () => ({ ...state, pending: pending(), identityId, houseId, queue: queue.map(entry => ({ id: entry.body.id, kind: entry.kind, created: entry.created })) });
  function notify() { if (!closed) options.onState?.(getState()); }
  function persist() {
    const neededFiles = new Set([...dirty.values(), ...queue.flatMap(entry => entry.body.elements || []), ...state.conflicts.map(conflict => conflict.element)].filter(element => element.type === "image").map(element => element.fileId));
    const pendingFiles = Object.fromEntries(Object.entries(fileData).filter(([id]) => neededFiles.has(id)));
    try { storage?.setItem(scope, JSON.stringify({ identityId, houseId, queue, dirty: [...dirty.values()], draft: state.draft, draftVersion, conflicts: state.conflicts, files: pendingFiles })); }
    catch { state.error = "Local pending storage is full. Keep this tab open and export your canvas before leaving."; }
  }
  function status() {
    if (state.status === "revoked") return;
    if (state.conflicts.length && !state.error) state.error = "Another resident’s update won a canvas conflict. Your edit is retained in save details for restore or export.";
    state.status = state.error ? "error" : !state.connected ? "reconnecting" : pending() ? "pending" : "saved";
    notify();
  }
  function revoke(error) {
    epoch++; state.status = "revoked"; state.connected = false; state.error = error.message || "House access changed. Reopen the board with your current identity.";
    state.elements = []; state.chat = []; state.files = []; state.views = []; state.draft = ""; state.conflicts = [];
    socket?.disconnect(); clearTimeout(timer); clearInterval(poll); clearTimeout(retryTimer);
    options.onScene?.([], true); options.onFiles?.([], true); notify();
  }
  async function request(path, body) {
    const generation = epoch, abort = new AbortController(); let timeout;
    try {
      const work = (async () => {
        const response = await fetcher(path, { credentials: "same-origin", cache: "no-store", signal: abort.signal,
          headers: { "X-House-Identity": identityId, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
          ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
        const result = await response.json();
        if (generation !== epoch || closed) throw boardError("This board session has ended.", "CLOSED");
        if (!response.ok || result.ok === false) throw boardError(result.message || "The board could not save this action.", result.code || "HTTP_ERROR");
        return result;
      })();
      return await Promise.race([work, new Promise((_, reject) => { timeout = setTimeout(() => { abort.abort(); reject(boardError("The reply did not arrive. Your original action is pending; retry keeps its ID.", "TIMEOUT")); }, options.timeoutMs || 8000); })]);
    } finally { clearTimeout(timeout); }
  }
  async function verifyContext() {
    const context = await request("/api/board/context");
    if (context.identity?.id !== identityId || context.home?.id !== houseId) throw boardError("Your identity or house membership changed. Pending work stays under its original identity.", "IDENTITY_CHANGED");
    return context;
  }
  function receiveElements(incoming) {
    if (closed || state.status === "revoked") return;
    state.elements = mergeBoardElements(state.elements, sanitizeElements(incoming || []));
    options.onScene?.(state.elements, false);
  }
  async function loadFiles(metadata) {
    const generation = epoch;
    for (const file of metadata || []) {
      if (knownFiles.has(file.id)) continue;
      try {
        const expected = `/api/board/asset?houseId=${encodeURIComponent(houseId)}&fileId=${encodeURIComponent(file.id)}`;
        const supplied = new URL(file.url, options.origin || globalThis.location?.origin || "http://localhost");
        const target = new URL(expected, supplied.origin);
        if (supplied.origin !== (options.origin || globalThis.location?.origin || "http://localhost") || supplied.pathname !== target.pathname || supplied.searchParams.get("houseId") !== houseId || supplied.searchParams.get("fileId") !== file.id || !IMAGE_TYPES.has(file.mimeType)) throw new Error("An image reference was rejected.");
        const response = await fetcher(expected, { credentials: "same-origin", cache: "no-store", headers: { "X-House-Identity": identityId }, signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw boardError("An image could not be loaded. Retry the board connection.", response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR");
        const blob = await response.blob(); validateImageFile({ type: file.mimeType, size: blob.size });
        const dataURL = await (options.readBlob || (blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); })))(blob);
        if (generation !== epoch || closed || state.status === "revoked") return;
        const loaded = { id: file.id, mimeType: file.mimeType, created: file.created, dataURL }; fileData[file.id] = loaded; knownFiles.add(file.id);
        options.onFiles?.([loaded], false);
      } catch (error) {
        if (generation !== epoch || closed) return;
        if (FATAL.has(error.code)) { revoke(error); return; }
        state.error = error.message; status();
      }
    }
  }
  function receiveSnapshot(snapshot) {
    if (closed || state.status === "revoked" || snapshot?.houseId !== houseId) return;
    if ((snapshot.sequence || 0) < state.sequence) return;
    state.sequence = Math.max(state.sequence, snapshot.sequence || 0);
    receiveElements(snapshot.elements); state.files = snapshot.files || []; state.chat = snapshot.chat || []; initialized = true;
    void loadFiles(state.files); notify();
  }
  function addChat(message) {
    if (!message || closed || state.status === "revoked" || message.at < Date.now() - 7 * 24 * 60 * 60 * 1000) return;
    state.sequence = Math.max(state.sequence, message.sequence || 0);
    state.chat = [...state.chat.filter(old => old.id !== message.id), message].sort((a, b) => a.sequence - b.sequence).slice(-100); notify();
  }
  function enqueue(kind, payload) {
    const entry = { kind, created: Date.now(), body: { id: globalThis.crypto.randomUUID(), houseId, ...payload } };
    queue.push(entry); persist(); status(); return entry;
  }
  function inspectDirty() {
    if (state.elements.length > 2000 || bytes(state.elements) > 2 * 1024 * 1024) return "The shared board reached its retained limit (2,000 objects / 2 MiB, including removed objects). New work remains pending; export it before discarding unsaved edits.";
    for (const element of dirty.values()) {
      if (bytes(element) > 32 * 1024) return "A drawing object exceeds 32 KiB. Simplify its stroke or export your work.";
      if (element.type !== "image" || element.isDeleted || !element.fileId || knownFiles.has(element.fileId) || queue.some(entry => entry.kind === "asset" && entry.body.file.id === element.fileId)) continue;
      const file = fileData[element.fileId];
      if (!file) return "This image is missing its file. The complete edit remains pending; re-add its file or export pending work.";
      if (file.id !== element.fileId || typeof file.dataURL !== "string" || !file.dataURL.startsWith(`data:${file.mimeType};base64,`)) return "This image has incomplete file data. The complete edit remains pending; re-add the image or export pending work.";
      const encoded = file.dataURL.slice(file.dataURL.indexOf(",") + 1), padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
      try { validateImageFile({ type: file.mimeType, size: Math.floor(encoded.length * 3 / 4) - padding }); }
      catch (error) { return error.message; }
    }
    return "";
  }
  function freezeDirty() {
    if (!dirty.size) return true;
    const error = inspectDirty();
    if (error) { state.error = error; persist(); status(); return false; }
    // Validate the entire batch before freezing any mutation; retain every object
    // and its available file bytes when one dependency prevents submission.
    for (const element of dirty.values()) {
      if (element.type === "image" && !element.isDeleted && element.fileId && !knownFiles.has(element.fileId) && !queue.some(entry => entry.kind === "asset" && entry.body.file.id === element.fileId)) {
        const file = fileData[element.fileId]; enqueue("asset", { file: { id: file.id, mimeType: file.mimeType, dataURL: file.dataURL } });
      }
    }
    let batch = [];
    for (const element of dirty.values()) {
      if (batch.length && bytes([...batch, element]) > 120 * 1024) { enqueue("patch", { elements: batch }); batch = []; }
      batch.push(element);
    }
    dirty.clear(); if (batch.length) enqueue("patch", { elements: batch }); persist(); return true;
  }
  async function drain() {
    if (inflight) return inflight;
    if (closed || !state.connected || state.status === "revoked") return false;
    inflight = (async () => {
      while (queue.length && !closed && state.status !== "revoked") {
        const entry = queue[0], generation = epoch;
        if (entry.kind === "patch" && (state.elements.length > 2000 || bytes(state.elements) > 2 * 1024 * 1024)) { state.error = "The shared board is full. Export pending work before discarding unsaved edits."; status(); return false; }
        if (Date.now() - entry.created > 24 * 60 * 60 * 1000) { state.error = "This pending action is over 24 hours old. Export it or discard it; automatic retry has stopped."; status(); return false; }
        try {
          const result = await request(`/api/board/${entry.kind}`, entry.body);
          if (generation !== epoch || closed) return false;
          queue.shift(); state.sequence = Math.max(state.sequence, result.sequence || 0);
          if (entry.kind === "asset") knownFiles.add(entry.body.file.id);
          if (entry.kind === "patch" && result.elements) {
            const canonicalResults = new Map(result.elements.map(element => [element.id, element]));
            for (const submitted of entry.body.elements) {
              const accepted = canonicalResults.get(submitted.id);
              if (accepted && canonical(accepted) !== canonical(submitted) && winner(accepted, submitted) === accepted) {
                state.conflicts = [...state.conflicts.filter(conflict => conflict.element.id !== submitted.id), { element: submitted, at: Date.now() }];
              } else if (accepted && canonical(accepted) === canonical(submitted)) state.conflicts = state.conflicts.filter(conflict => conflict.element.id !== submitted.id);
            }
            receiveElements(result.elements);
          }
          if (entry.kind === "chat" && state.draft === entry.submittedDraft && draftVersion === entry.draftVersion) state.draft = "";
          if (result.message) addChat(result.message);
          state.error = state.conflicts.length ? "Another resident’s update won a canvas conflict. Your original edit is retained. Restore it as a new edit or export it from save details." : ""; persist(); status();
        } catch (error) {
          if (generation !== epoch || closed || error.code === "CLOSED") return false;
          if (FATAL.has(error.code)) revoke(error);
          else { state.error = error.message || "The action is pending. Retry when connected."; status(); }
          return false;
        }
      }
      return true;
    })();
    try { return await inflight; } finally { inflight = null; status(); }
  }
  async function flush() { clearTimeout(timer); timer = null; if (!freezeDirty()) return false; return await drain(); }
  async function connect() {
    if (closed || state.status === "revoked") return;
    state.status = initialized ? "reconnecting" : "connecting"; notify();
    try {
      await verifyContext(); const snapshot = await request(`/api/board/snapshot?houseId=${encodeURIComponent(houseId)}`);
      state.connected = true; state.error = ""; receiveSnapshot(snapshot); status();
      if (options.socketFactory && !socket) {
        socket = options.socketFactory("/board");
        const valid = event => !closed && state.status !== "revoked" && event?.schemaVersion === 1 && event.subscriptionId === subscriptionId && subscriptionId !== null && (!event.houseId || event.houseId === houseId);
        socket.on("connect", async () => {
          const requestId = ++subscriptionRequest; subscriptionId = null;
          try { await verifyContext(); if (closed || state.status === "revoked" || requestId !== subscriptionRequest) return;
            socket.emit("board.subscribe", { houseId }, acknowledgement => {
              if (closed || state.status === "revoked" || requestId !== subscriptionRequest) return;
              if (acknowledgement?.ok === false) { const error = boardError(acknowledgement.message, acknowledgement.code); if (FATAL.has(error.code)) revoke(error); else { state.error = error.message; status(); } return; }
              if (acknowledgement?.schemaVersion !== 1 || typeof acknowledgement.subscriptionId !== "string") { state.error = "The board connection returned an unsupported subscription."; status(); return; }
              subscriptionId = acknowledgement.subscriptionId; state.connected = true; state.error = "";
              if (acknowledgement.snapshot) receiveSnapshot(acknowledgement.snapshot); status(); void flush();
            });
          } catch (error) { if (FATAL.has(error.code)) revoke(error); else { state.error = error.message; status(); } }
        });
        socket.on("board.snapshot", event => { if (valid(event)) receiveSnapshot(event); });
        socket.on("board.patch", event => { if (valid(event)) {
          state.sequence = Math.max(state.sequence, event.sequence); receiveElements(event.elements); status();
          if (event.elements?.some(element => element.type === "image" && !element.isDeleted && !knownFiles.has(element.fileId))) {
            void request(`/api/board/snapshot?houseId=${encodeURIComponent(houseId)}`).then(receiveSnapshot).catch(error => { if (FATAL.has(error.code)) revoke(error); else if (!closed) { state.error = error.message; status(); } });
          }
        } });
        socket.on("board.chat", event => { if (valid(event)) addChat(event.message); });
        socket.on("board.presence", event => { if (valid(event)) { state.views = event.views || []; options.onPresence?.(state.views); notify(); } });
        socket.on("board.revoked", error => { if (valid(error)) revoke(error); });
        socket.on("disconnect", () => { subscriptionId = null; subscriptionRequest++; if (closed || state.status === "revoked") return; state.connected = false; status(); });
        socket.on("connect_error", error => { if (closed || state.status === "revoked") return; state.connected = false; state.error = error.message || "Reconnecting to the shared board."; status(); });
      }
      if (!poll && options.poll !== false) { poll = setInterval(async () => { if (closed || state.status === "revoked") return; try { await verifyContext(); if (!socket?.connected) { const snapshot = await request(`/api/board/snapshot?houseId=${encodeURIComponent(houseId)}`); receiveSnapshot(snapshot); state.connected = true; state.error = ""; status(); await flush(); } } catch (error) { if (FATAL.has(error.code)) revoke(error); else { state.connected = false; state.error = error.message; status(); } } }, 15000); poll.unref?.(); }
      if (pending()) await flush();
    } catch (error) {
      if (closed || error.code === "CLOSED") return;
      if (FATAL.has(error.code)) revoke(error); else { state.connected = false; state.error = error.message; status(); }
    }
  }
  function localChange(elements, files = {}) {
    if (!initialized || closed || state.status === "revoked") return;
    const clean = sanitizeElements(elements), before = new Map(state.elements.map(element => [element.id, element]));
    const delta = changedElements(state.elements, clean).filter(element => !before.has(element.id) || winner(before.get(element.id), element) !== before.get(element.id));
    if (delta.length) {
      state.elements = mergeBoardElements(state.elements, clean);
      for (const element of delta) dirty.set(element.id, element);
    }
    // An identical scene callback can supply a file that was missing earlier.
    // Cache pending dependencies before validation, including rejected bytes for
    // local export/reload, and preserve later objects in the same callback.
    let dependenciesChanged = false;
    for (const element of dirty.values()) if (element.type === "image" && element.fileId && files[element.fileId]) {
      const nextFile = files[element.fileId], previousFile = fileData[element.fileId];
      if (previousFile !== nextFile) {
        if (!previousFile || canonical(previousFile) !== canonical(nextFile)) dependenciesChanged = true;
        fileData[element.fileId] = nextFile;
      }
    }
    if (!delta.length && !dependenciesChanged) return;
    state.error = inspectDirty(); persist(); status();
    if (state.error) return;
    if (!timer) { timer = setTimeout(() => { timer = null; void flush(); }, 350); timer.unref?.(); }
  }
  async function retry() {
    if (closed || state.status === "revoked") return false;
    try { await verifyContext(); state.connected = true; state.error = ""; status(); return await flush(); }
    catch (error) { if (FATAL.has(error.code)) revoke(error); else { state.error = error.message; status(); } return false; }
  }
  function setDraft(value) { state.draft = value; draftVersion++; persist(); notify(); }
  async function sendChat() {
    if (!state.draft.trim() || closed || state.status === "revoked") return false;
    if (state.draft.length > 4000) { state.error = "Board chat messages allow up to 4,000 characters."; status(); return false; }
    if (queue.some(entry => entry.kind === "chat" && entry.body.text === state.draft.trim())) return await retry();
    const entry = enqueue("chat", { text: state.draft.trim() }); entry.submittedDraft = state.draft; entry.draftVersion = draftVersion; persist(); return await flush();
  }
  function pointer(pointer) {
    const now = Date.now(); if (!state.connected || !subscriptionId || state.status === "revoked" || now - pointerAt < 60) return; pointerAt = now;
    socket?.emit("board.pointer", { subscriptionId, x: pointer.x, y: pointer.y, selectedElementIds: (pointer.selectedElementIds || []).slice(0, 100) });
  }
  function exportPending() { if (state.status === "revoked") throw boardError("Reopen the original identity to export its pending work.", "IDENTITY_CHANGED"); return JSON.stringify({ identityId, houseId, queue, dirty: [...dirty.values()], conflicts: state.conflicts, files: fileData }, null, 2); }
  async function discardPending() {
    if (state.status === "revoked" || inflight) return false;
    queue = []; dirty.clear(); state.conflicts = []; state.elements = []; state.error = ""; persist(); initialized = false;
    options.onScene?.([], true); await connect(); return state.connected;
  }
  function restoreConflicts() {
    if (closed || state.status === "revoked") return;
    const current = new Map(state.elements.map(element => [element.id, element]));
    for (const conflict of state.conflicts) {
      const restored = { ...conflict.element, version: Math.max(current.get(conflict.element.id)?.version || 0, conflict.element.version) + 1, versionNonce: globalThis.crypto.getRandomValues(new Uint32Array(1))[0] & 2147483647, updated: Date.now() };
      dirty.set(restored.id, restored); state.elements = mergeBoardElements(state.elements, [restored]);
    }
    state.conflicts = []; state.error = ""; options.onScene?.(state.elements, false, true); persist(); status(); void flush();
  }
  function close() { closed = true; epoch++; clearTimeout(timer); clearTimeout(retryTimer); clearInterval(poll); socket?.disconnect(); }
  return { connect, retry, localChange, flush, getState, getFiles: () => Object.values(fileData), setDraft, sendChat, pointer, exportPending, discardPending, restoreConflicts, close };
}
