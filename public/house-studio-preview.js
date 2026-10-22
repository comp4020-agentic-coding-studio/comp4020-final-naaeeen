const MAX_BYTES = 262144, MAX_PIXELS = 1048576;
const scopeKey = value => value ? JSON.stringify([value.serverEpoch, value.identityId, value.houseId, value.roomId, value.ownerId, value.zoneId, value.controller, value.generation, value.accessGeneration, value.doorOpen]) : "";
const permitted = value => Boolean(value && value.identityId && value.houseId && value.roomId && value.ownerId && value.zoneId === value.roomId && Number.isSafeInteger(value.generation) && Number.isSafeInteger(value.accessGeneration));

/** One room-authorized world thumbnail. It has no modal or audio lifecycle.
 * @param {{document?:Document,fetch?:(...args:any[])=>Promise<any>,urls?:any,decode?:(blob:Blob,url:string)=>Promise<any>,onPreview?:(image:any|null)=>void}} options
 */
export function createHouseStudioPreview({ document: doc = globalThis.document, fetch: request = (...args) => globalThis.fetch(...args), urls = doc.defaultView.URL, decode, onPreview = () => {} } = {}) {
 const win = doc.defaultView, allocated = new Set();
 let context = null, epoch = 0, flight = null, timer = null, image = null, imageId = null, queued = false, disposed = false;
 const current = own => !disposed && !doc.hidden && !own.abort.signal.aborted && flight === own && own.epoch === epoch && scopeKey(own.scope) === scopeKey(context);
 function revoke(url) { if (allocated.delete(url)) urls.revokeObjectURL(url); }
 function clearImage() { onPreview(null); image?.removeAttribute?.("src"); image = null; imageId = null; for (const url of [...allocated]) revoke(url); }
 function cancelTimer() { if (timer !== null) win.clearTimeout(timer); timer = null; }
 function invalidate() { epoch++; queued = false; cancelTimer(); flight?.abort.abort(); flight = null; clearImage(); }
 async function read(path, own, binary = false) {
  const response = await request(path, { cache: "no-store", credentials: "same-origin", headers: { "X-House-Identity": own.scope.identityId }, signal: own.abort.signal });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw Object.assign(new Error(data.message || "Room reference is unavailable."), { code: data.code || "UNAVAILABLE" }); }
  return binary ? response.blob() : response.json();
 }
 async function decodeImage(blob, url) {
  if (decode) return decode(blob, url);
  const next = doc.createElement("img"); next.alt = "Room owner's chosen reference"; next.decoding = "async";
  const loaded = new Promise((resolve, reject) => { next.onload = () => resolve(next); next.onerror = () => reject(new Error("Room reference could not be decoded.")); });
  next.src = url; return loaded;
 }
 async function refresh() {
  if (disposed || !context || doc.hidden) return;
  if (flight) { queued = true; return flight.promise; }
  const own = { scope: Object.freeze({ ...context }), epoch, abort: new AbortController(), promise: null };
  flight = own; cancelTimer(); timer = win.setTimeout(() => { timer = null; void refresh(); }, 15000);
  const deadline = win.setTimeout(() => { own.abort.abort(); if (flight === own) { flight = null; queued = false; clearImage(); } }, 8000);
  own.promise = (async () => {
   try {
    const state = await read("/api/house/studio?roomId=" + encodeURIComponent(own.scope.roomId), own);
    if (!current(own)) return;
    if (state?.roomId !== own.scope.roomId || state?.ownerId !== own.scope.ownerId) throw new Error("Room reference owner changed.");
    const chosen = state.image;
    if (!chosen) { clearImage(); return; }
    if (typeof chosen.id !== "string" || !chosen.id || chosen.id.length > 128 || !Number.isInteger(chosen.width) || !Number.isInteger(chosen.height) || chosen.width < 1 || chosen.height < 1 || chosen.width > 2048 || chosen.height > 2048 || chosen.width * chosen.height > MAX_PIXELS) throw new Error("Room reference exceeds its image limit.");
    if (chosen.id === imageId && image) return;
    clearImage();
    const blob = await read("/api/house/studio/image?roomId=" + encodeURIComponent(own.scope.roomId) + "&imageId=" + encodeURIComponent(chosen.id), own, true);
    if (!current(own)) return;
    if (!blob || blob.type !== "image/png" || blob.size < 1 || blob.size > MAX_BYTES) throw new Error("Room reference exceeds its PNG limit.");
    const url = urls.createObjectURL(blob); allocated.add(url);
    const decoded = await decodeImage(blob, url);
    if (!current(own)) { decoded?.removeAttribute?.("src"); revoke(url); return; }
    const width = decoded?.naturalWidth || decoded?.width, height = decoded?.naturalHeight || decoded?.height;
    if (width !== chosen.width || height !== chosen.height || width * height > MAX_PIXELS) throw new Error("Room reference dimensions changed.");
    image = decoded; imageId = chosen.id; onPreview(image);
   } catch { if (current(own)) clearImage(); }
   finally {
    win.clearTimeout(deadline);
    if (flight === own) { flight = null; if (queued) { queued = false; void refresh(); } }
   }
  })();
  return own.promise;
 }
 function visibility() { invalidate(); if (!doc.hidden && context && !disposed) void refresh(); }
 doc.addEventListener("visibilitychange", visibility);
 return {
  update(next) { if (disposed) return; const allowed = permitted(next) ? { ...next } : null; if (scopeKey(allowed) === scopeKey(context)) return; invalidate(); context = allowed; if (context && !doc.hidden) void refresh(); },
  refresh,
  dispose() { if (disposed) return; disposed = true; invalidate(); context = null; doc.removeEventListener("visibilitychange", visibility); },
 };
}
