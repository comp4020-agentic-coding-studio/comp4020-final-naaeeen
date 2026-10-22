import { createHouseAmbience } from "./house-ambience.js";

const DEFAULT_VIEW = Object.freeze({ x: .5, y: .5, zoom: 1 });
const PRESETS = ["off", "rain", "fire", "night"];
const MAX_BYTES = 262144, MAX_PIXELS = 1048576, CHUNK_BYTES = 8192;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const copyView = view => ({ x: view.x, y: view.y, zoom: view.zoom });
const stale = () => Object.assign(new Error("Room context changed."), { code: "STALE_CONTEXT" });

/** Re-encode bounded PNG pixels, stripping source metadata before any upload. */
export async function prepareStudioPng(file, options = {}) {
 const doc = options.document || globalThis.document;
 const decode = options.createImageBitmap || globalThis.createImageBitmap;
 if (!file || file.size > 16777216) throw new Error("Choose a PNG smaller than 16 MiB.");
 const bytes = new Uint8Array(await file.arrayBuffer());
 const signature = [137,80,78,71,13,10,26,10];
 if (bytes.length < 33 || signature.some((value,index) => bytes[index] !== value)) throw new Error("Choose a valid PNG image.");
 const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 const width = header.getUint32(16), height = header.getUint32(20);
 if (!width || !height || width > 8192 || height > 8192 || width * height > 16777216) throw new Error("Source PNG must be at most 8192 pixels per edge and 16 megapixels.");
 let bitmap;
 try {
  if (typeof decode !== "function") throw new Error("This browser cannot decode PNG files. Try a current browser.");
  bitmap = await decode(file);
  const canvas = doc.createElement("canvas"), ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot prepare PNG images.");
  let scale = Math.min(1, 2048 / width, 2048 / height, Math.sqrt(MAX_PIXELS / (width * height)));
  for (let attempt = 0; attempt < 18; attempt++) {
   canvas.width = Math.max(1, Math.floor(width * scale)); canvas.height = Math.max(1, Math.floor(height * scale));
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
   const blob = await new Promise((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG encoding failed.")), "image/png"));
   if (blob.size <= MAX_BYTES) return { blob, width: canvas.width, height: canvas.height };
   scale *= .78;
  }
  throw new Error("This PNG could not fit the 256 KiB room limit. Your source file is unchanged.");
 } catch (error) {
  if (error instanceof Error) throw error;
  throw new Error("PNG decoding failed. Your source file is unchanged.");
 } finally { bitmap?.close?.(); }
}

/**
 * Transport-independent owner/visitor reference desk.
 * update(null) is the synchronous privacy boundary; open never starts audio.
 * @param {HTMLElement} element
 * @param {{api:any,onPreview?:(image:HTMLImageElement|null)=>void,onClose?:()=>void,onChat?:()=>void,onStatus?:(message:string)=>void,ambience?:any,urls?:any,download?:(blob:Blob,name:string)=>void,preparePng?:(file:any,options?:any)=>Promise<any>}} options
 */
export function createHouseStudioUI(element, {
 api, onPreview = () => {}, onClose = () => {}, onChat = () => {},
 onStatus = () => {}, ambience, urls, download, preparePng = prepareStudioPng,
} = {}) {
 const doc = element.ownerDocument, win = doc.defaultView;
 const objectURLs = urls || win.URL;
 let context = null, state = null, visible = false, disposed = false, epoch = 0;
 let readSequence = 0, imageSequence = 0, fileSequence = 0, uploadSequence = 0;
 let view = copyView(DEFAULT_VIEW), viewVersion = 0, dirty = false, busy = false, processing = false;
 let selected = null, imageBlob = null, imageURL = null, activeImageId = null, message = "";
 let pending = null, poll = null, drag = null, uploadId = null, uploadPhase = null;
 const downloadTimers = new Set(), downloadURLs = new Set();
 element.classList.add("house-studio");
 element.hidden = true;
 element.innerHTML = `<header class="studio-header"><div><p class="studio-eyebrow">ROOM STUDIO</p><h2 data-studio-owner>Reference desk</h2></div><button type="button" data-studio-action="close" aria-label="Close room studio">Look around</button></header>
 <p class="studio-audience" data-studio-audience></p>
 <div class="studio-reference" data-studio-viewport aria-label="Room reference; use pan and zoom controls"><img data-studio-image alt="Room owner's chosen reference" draggable="false" hidden><p data-studio-empty>No reference chosen. The owner can leave a PNG here.</p></div>
 <div class="studio-inspection" role="group" aria-label="Inspect reference"><button type="button" data-studio-action="left" aria-label="Pan left">←</button><button type="button" data-studio-action="up" aria-label="Pan up">↑</button><button type="button" data-studio-action="down" aria-label="Pan down">↓</button><button type="button" data-studio-action="right" aria-label="Pan right">→</button><button type="button" data-studio-action="zoom-out" aria-label="Zoom out">−</button><output data-studio-zoom>100%</output><button type="button" data-studio-action="zoom-in" aria-label="Zoom in">+</button><button type="button" data-studio-action="reset">Reset view</button><button type="button" data-studio-action="download">Download PNG</button></div>
 <div data-studio-owner-controls class="studio-owner-controls"><div class="studio-save-row"><button type="button" data-studio-action="save-view">Save this view</button><span data-studio-save-status></span></div><label class="studio-file">Choose one PNG <input data-studio-file type="file" accept="image/png,.png"></label><p data-studio-file-status>Re-encoded locally to at most 1 megapixel and 256 KiB.</p><div class="studio-save-row"><button type="button" data-studio-action="upload">Save chosen PNG</button><button type="button" data-studio-action="cancel-upload" hidden>Cancel upload</button><button type="button" data-studio-action="clear">Remove reference</button></div></div>
 <section class="studio-sound" aria-label="Room soundscape"><h3>Room atmosphere</h3><p data-studio-preset-label>Saved preset: Off</p><div data-studio-preset-controls><label>Room preset <select data-studio-preset><option value="off">Off</option><option value="rain">Rain</option><option value="fire">Fire</option><option value="night">Night</option></select></label><button type="button" data-studio-action="save-preset">Save room preset</button></div><div class="studio-sound-controls"><button type="button" data-studio-action="listen">Listen here</button><button type="button" data-studio-action="stop-listening">Stop listening</button><label>My volume <input data-studio-volume type="range" min="0" max="100" value="30"></label><label><input data-studio-muted type="checkbox"> Mute here</label></div><p data-studio-audio-status role="status">Listening is off. Every visit starts silent.</p></section>
 <p data-studio-feedback class="studio-feedback" role="status" aria-live="polite"></p><div class="studio-footer"><button type="button" data-studio-action="retry" hidden>Retry original save</button><button type="button" data-studio-action="chat">Room chat</button><button type="button" data-studio-action="export">Export my room studio</button></div>`;
 const get = selector => element.querySelector(selector);
 const action = name => get('[data-studio-action="' + name + '"]');
 const img = get("[data-studio-image]"), viewport = get("[data-studio-viewport]");
 const sound = ambience || createHouseAmbience({ onStatus: value => { if (!disposed) get("[data-studio-audio-status]").textContent = value.message; } });
 const key = value => value ? [value.identityId,value.houseId,value.roomId,value.ownerId,value.zoneId ?? value.roomId,value.generation,value.accessGeneration,value.controller,value.controllerToken ?? ""].join(":") : "";
 const validContext = value => Boolean(value && value.identityId && value.houseId && value.roomId && value.ownerId && (value.zoneId == null || value.zoneId === value.roomId));
 const owner = () => Boolean(context && context.identityId === context.ownerId);
 const writable = () => Boolean(owner() && context.controller && state?.writable && visible && !doc.hidden);
 const current = token => !disposed && visible && context && epoch === token;
 const say = value => { message = value; render(); onStatus(value); };
 const cancelPoll = () => { if (poll != null) win.clearTimeout(poll); poll = null; };
 function clearImage() {
  imageSequence++; img.onload = null; img.onerror = null; img.removeAttribute("src"); img.hidden = true;
  if (imageURL) objectURLs.revokeObjectURL(imageURL);
  imageURL = null; imageBlob = null; activeImageId = null; onPreview(null);
 }
 function invalidate() {
  epoch++; readSequence++; fileSequence++; uploadSequence++; cancelPoll(); clearImage(); sound.stop();
  if (pending) { const old = pending; pending = null; old.reject(stale()); }
  busy = false; processing = false; selected = null; uploadId = null; uploadPhase = null; drag = null;
  state = null; view = copyView(DEFAULT_VIEW); viewVersion++; dirty = false; message = "";
 }
 function render() {
  const canWrite = writable(), hasImage = Boolean(state?.image && imageBlob);
  get("[data-studio-owner]").textContent = context ? (context.ownerName || "Housemate") + "’s reference desk" : "Reference desk";
  get("[data-studio-audience]").textContent = !context ? "Room access is unavailable." : (context.doorOpen ? "Open door · All current house members may inspect this reference." : "Owner only · Door closed.") + (owner() ? "" : " You are inspecting the owner’s image; your view stays local.");
  get("[data-studio-owner-controls]").hidden = !owner() || !context?.controller;
  get("[data-studio-preset-controls]").hidden = !owner() || !context?.controller;
  get("[data-studio-empty]").hidden = hasImage;
  img.hidden = !hasImage;
  img.style.transform = "translate(" + ((.5-view.x)*100*view.zoom) + "%," + ((.5-view.y)*100*view.zoom) + "%) scale(" + view.zoom + ")";
  get("[data-studio-zoom]").textContent = Math.round(view.zoom * 100) + "%";
  get("[data-studio-save-status]").textContent = !state ? "Loading saved state…" : dirty ? "Local view · not saved" : "Saved view";
  for (const name of ["left","up","down","right","zoom-in","zoom-out","reset","download"]) action(name).disabled = !hasImage;
  action("save-view").disabled = !canWrite || !hasImage || busy || Boolean(pending);
  action("upload").disabled = !canWrite || !selected || busy || processing || Boolean(pending);
  action("clear").disabled = !canWrite || !state?.image || busy || Boolean(pending);
  get("[data-studio-file]").disabled = !canWrite || busy;
  action("cancel-upload").hidden = !busy || !uploadPhase;
  action("cancel-upload").disabled = uploadPhase === "committing";
  action("save-preset").disabled = !canWrite || busy || Boolean(pending);
  action("export").hidden = !owner(); action("export").disabled = !context || busy;
  action("retry").hidden = !pending; action("retry").disabled = !canWrite || pending?.sending;
  action("listen").disabled = !state || state.soundscape === "off" || !visible || doc.hidden;
  get("[data-studio-preset-label]").textContent = "Saved preset: " + (state?.soundscape || "off");
  get("[data-studio-feedback]").textContent = message;
 }
 function schedulePoll() {
  cancelPoll();
  if (visible && context && !owner() && !doc.hidden) poll = win.setTimeout(() => { poll = null; void refresh(); }, 5000);
 }
 async function loadImage(next, token) {
  const id = next.image?.id;
  if (!id) { clearImage(); render(); return; }
  if (activeImageId === id && imageBlob) return;
  const sequence = ++imageSequence;
  try {
   const blob = await api.image(context.roomId, id);
   if (!current(token) || sequence !== imageSequence || state?.image?.id !== id) return;
   clearImage(); const ownSequence = ++imageSequence;
   imageBlob = blob; activeImageId = id; imageURL = objectURLs.createObjectURL(blob);
   img.onload = () => { if (current(token) && ownSequence === imageSequence && activeImageId === id) onPreview(img); };
   img.onerror = () => { if (current(token) && ownSequence === imageSequence) { clearImage(); say("This reference could not be decoded. Retry opening the desk."); } };
   img.src = imageURL; render();
  } catch (error) {
   if (!current(token) || sequence !== imageSequence) return;
   clearImage(); say(error.message || "The room reference could not be loaded.");
  }
 }
 async function refresh({ preserveView = false, minimumRevision = 0 } = {}) {
  if (!visible || !context || disposed || doc.hidden) return;
  const token = epoch, sequence = ++readSequence, roomId = context.roomId;
  try {
   const next = await api.state(roomId);
   if (!current(token) || sequence !== readSequence || next.roomId !== roomId || next.ownerId !== context.ownerId || next.revision < minimumRevision || (state && next.revision < state.revision)) return;
   const changedImage = state?.image?.id !== next.image?.id;
   state = next;
   if (changedImage || !dirty && !preserveView) { view = copyView(next.view); dirty = false; viewVersion++; }
   if (!busy) get("[data-studio-preset]").value = next.soundscape;
   if (!next.image) clearImage();
   render(); await loadImage(next, token);
  } catch (error) {
   if (!current(token) || sequence !== readSequence) return;
   clearImage(); say(error.message || "Saved room state is unavailable.");
   if (["FORBIDDEN","NOT_A_MEMBER","GENERATION_STALE"].includes(error.code)) { invalidate(); render(); }
  } finally { if (current(token) && sequence === readSequence) schedulePoll(); }
 }
 const uuid = () => (win.crypto || globalThis.crypto).randomUUID();
 async function attempt(command, token, resolve, reject, operationCurrent) {
  const live = () => current(token) && operationCurrent();
  if (!live() || !writable()) { reject(stale()); return; }
  try {
   const receipt = await api.command(command);
   if (!live()) { reject(stale()); return; }
   if (!receipt?.ok) throw Object.assign(new Error(receipt?.message || "Save was rejected."), { code: receipt?.code || "REJECTED" });
   if (pending?.command === command) pending = null;
   resolve(receipt);
  } catch (error) {
   if (!live()) { reject(stale()); return; }
   if (!error.code || ["TIMEOUT","PENDING","STORAGE_UNAVAILABLE"].includes(error.code)) {
    pending = { command, token, resolve, reject, operationCurrent, sending: false };
    if (command.type === "studio.upload.commit") {
     say("Final save reply is uncertain; the new reference may already be saved. Retry the original final save, or close and reopen to check.");
     void refresh({ preserveView: true });
    } else say("Save reply is uncertain, not confirmed saved. Retry sends the same original action.");
   } else { if (pending?.command === command) pending = null; reject(error); }
  } finally { if (live()) render(); }
 }
 function command(type, payload, revision = state.revision, operationCurrent = () => true) {
  const token = epoch, value = Object.freeze({ commandId: uuid(), roomId: context.roomId, expectedRevision: revision, type, payload });
  return new Promise((resolve,reject) => void attempt(value, token, resolve, reject, operationCurrent));
 }

 async function save(type, payload) {
  if (!writable() || busy || pending) return;
  const token = epoch, version = viewVersion; busy = true; say("Saving… not confirmed saved.");
  try {
   const receipt = await command(type, payload);
   if (!current(token)) return;
   if (type === "studio.view") {
    if (version === viewVersion) { dirty = false; say("View saved."); } else say("Earlier view saved; your newer local view is unsaved.");
   } else if (type === "studio.clear") { clearImage(); dirty = false; say("Reference removed."); }
   else say("Room preset saved. Listening remains your local choice.");
   await refresh({ preserveView: true, minimumRevision: receipt.revision });
  } catch (error) { if (current(token) && error.code !== "STALE_CONTEXT") say(error.message || "Save was rejected; your local changes remain."); }
  finally { if (current(token)) { busy = false; render(); } }
 }
 async function chooseFile() {
  if (!writable() || busy) return;
  const file = get("[data-studio-file]").files?.[0];
  if (!file) return;
  const token = epoch, sequence = ++fileSequence; processing = true; selected = null;
  get("[data-studio-file-status]").textContent = "Preparing PNG locally… Your original file is unchanged."; render();
  try {
   const prepared = await preparePng(file, { document: doc });
   if (!current(token) || sequence !== fileSequence || !writable()) return;
   selected = prepared; get("[data-studio-file-status]").textContent = prepared.width + " × " + prepared.height + " · " + Math.ceil(prepared.blob.size / 1024) + " KiB ready. Save chosen PNG to replace the room reference.";
  } catch (error) {
   if (current(token) && sequence === fileSequence) get("[data-studio-file-status]").textContent = (error.message || "PNG preparation failed.") + " Your original file is unchanged.";
  } finally { if (current(token) && sequence === fileSequence) { processing = false; render(); } }
 }
 const base64 = bytes => { let value = ""; for (const byte of bytes) value += String.fromCharCode(byte); return win.btoa(value); };
 async function upload() {
  if (!writable() || busy || pending || !selected) return;
  const token = epoch, sequence = ++uploadSequence, prepared = selected, revision = state.revision;
  const alive = () => current(token) && sequence === uploadSequence;
  uploadPhase = "staging"; busy = true; say("Uploading… the previous reference stays saved until the final commit.");
  try {
   const bytes = new Uint8Array(await prepared.blob.arrayBuffer());
   if (!alive()) return;
   const begin = await command("studio.upload.begin", { bytes: bytes.length, mime: "image/png" }, revision, alive);
   if (!alive()) return; uploadId = begin.result.uploadId; render();
   for (let offset = 0, index = 0; offset < bytes.length; offset += CHUNK_BYTES, index++) {
    if (!alive()) return;
    await command("studio.upload.chunk", { uploadId, index, data: base64(bytes.subarray(offset, offset + CHUNK_BYTES)) }, revision, alive);
    if (!alive()) return;
    say("Uploading " + Math.min(offset + CHUNK_BYTES, bytes.length) + " / " + bytes.length + " bytes… not yet saved.");
   }
   uploadPhase = "committing"; say("Final save sent. It can no longer be cancelled; waiting for confirmation.");
   const receipt = await command("studio.upload.commit", { uploadId }, revision, alive);
   if (!alive()) return;
   uploadId = null; selected = null; dirty = false; say("Reference saved.");
   await refresh({ minimumRevision: receipt.revision });
  } catch (error) { if (alive() && error.code !== "STALE_CONTEXT") say((error.message || "Upload failed.") + " The previous saved reference is kept."); }
  finally { if (alive()) { busy = false; uploadId = null; uploadPhase = null; render(); } }
 }
 function cancelUpload() {
  if (!busy || !writable() || uploadPhase === "committing") return;
  uploadSequence++; const oldUploadId = uploadId; uploadId = null;
  if (pending?.command.type.startsWith("studio.upload.")) { const old = pending; pending = null; old.reject(stale()); }
  uploadPhase = null; busy = false; say("Upload cancelled here. The prior reference remains saved; temporary bytes expire automatically.");
  if (oldUploadId) void api.command({ commandId: uuid(), roomId: context.roomId, expectedRevision: state.revision, type: "studio.upload.abort", payload: { uploadId: oldUploadId } }).catch(() => {});
 }
 function saveFile(blob, filename) {
  if (download) { download(blob, filename); return; }
  const url = objectURLs.createObjectURL(blob), anchor = doc.createElement("a");
  downloadURLs.add(url); anchor.href = url; anchor.download = filename; anchor.hidden = true; doc.body.append(anchor); anchor.click(); anchor.remove();
  const timer = win.setTimeout(() => { downloadTimers.delete(timer); downloadURLs.delete(url); objectURLs.revokeObjectURL(url); }, 1000); downloadTimers.add(timer);
 }
 function editView(next) {
  if (!state?.image || !imageBlob || !visible) return;
  view = { x: clamp(next.x,0,1), y: clamp(next.y,0,1), zoom: clamp(Math.round(next.zoom*100)/100,1,4) }; viewVersion++; dirty = true; render();
 }
 function close(user = false) { if (!visible) return; visible = false; element.hidden = true; invalidate(); render(); if (user) onClose(); }
 action("close").addEventListener("click", () => close(true));
 action("chat").addEventListener("click", onChat);
 action("save-view").addEventListener("click", () => void save("studio.view", copyView(view)));
 action("save-preset").addEventListener("click", () => void save("studio.soundscape", { preset: get("[data-studio-preset]").value }));
 action("clear").addEventListener("click", () => void save("studio.clear", {}));
 action("upload").addEventListener("click", () => void upload()); action("cancel-upload").addEventListener("click", cancelUpload);
 get("[data-studio-file]").addEventListener("change", () => void chooseFile());
 action("retry").addEventListener("click", () => { const item = pending; if (!item || !writable() || item.sending) return; item.sending = true; render(); void attempt(item.command,item.token,item.resolve,item.reject,item.operationCurrent); });
 for (const [name,x,y,z] of [["left",-.1,0,0],["right",.1,0,0],["up",0,-.1,0],["down",0,.1,0],["zoom-in",0,0,.1],["zoom-out",0,0,-.1]]) action(name).addEventListener("click", () => editView({ x: view.x+x/view.zoom, y: view.y+y/view.zoom, zoom: view.zoom+z }));
 action("reset").addEventListener("click", () => editView(DEFAULT_VIEW));
 action("download").addEventListener("click", () => { if (imageBlob && state?.image?.id === activeImageId && visible) saveFile(imageBlob,"room-reference.png"); });
 action("export").addEventListener("click", async () => {
  if (!owner() || !visible) return; const token = epoch, roomId = context.roomId;
  try { const exported = await api.export({ roomId }); if (current(token)) { saveFile(new Blob([JSON.stringify(exported,null,2)],{type:"application/json"}),"room-studio.json"); say("Room studio export downloaded."); } }
  catch (error) { if (current(token)) say(error.message || "Room studio export failed."); }
 });
 action("listen").addEventListener("click", async () => {
  if (!visible || doc.hidden || !state || !PRESETS.includes(state.soundscape)) return;
  const token = epoch; const status = await sound.listen(state.soundscape);
  if (current(token) && !doc.hidden && status) get("[data-studio-audio-status]").textContent = status.message;
 });
 action("stop-listening").addEventListener("click", () => { sound.stop(); get("[data-studio-audio-status]").textContent = "Listening is off."; });
 get("[data-studio-volume]").addEventListener("input", event => sound.setVolume(Number(event.target.value)/100));
 get("[data-studio-muted]").addEventListener("change", event => sound.setMuted(event.target.checked));
 viewport.addEventListener("pointerdown", event => { if (!imageBlob || event.button !== 0) return; drag = { id:event.pointerId,x:event.clientX,y:event.clientY,view:copyView(view) }; viewport.setPointerCapture?.(event.pointerId); });
 viewport.addEventListener("pointermove", event => { if (!drag || drag.id !== event.pointerId) return; const box = viewport.getBoundingClientRect(); if (box.width && box.height) editView({x:drag.view.x-(event.clientX-drag.x)/box.width/view.zoom,y:drag.view.y-(event.clientY-drag.y)/box.height/view.zoom,zoom:view.zoom}); });
 for (const name of ["pointerup","pointercancel","lostpointercapture"]) viewport.addEventListener(name, () => { drag = null; });
 const keys = event => { event.stopPropagation(); if (event.type === "keydown" && event.key === "Escape") { event.preventDefault(); close(true); } };
 element.addEventListener("keydown", keys); element.addEventListener("keyup", keys);
 const visibility = () => { if (doc.hidden) { sound.stop(); cancelPoll(); get("[data-studio-audio-status]").textContent = "Listening is off. Choose Listen here when you return."; } else if (visible) void refresh(); };
 doc.addEventListener("visibilitychange", visibility);
 render();
 return {
  update(next) {
   if (disposed) return;
   const allowed = validContext(next) ? { ...next } : null, changed = key(context) !== key(allowed);
   if (changed) invalidate();
   context = allowed;
   if (!context) { visible = false; element.hidden = true; }
   render(); if (changed && visible) void refresh();
  },
  open() { if (disposed || !context) return; if (visible) return; visible = true; element.hidden = false; get("[data-studio-audio-status]").textContent = "Listening is off. Every visit starts silent."; render(); void refresh(); },
  close() { close(); },
  refresh,
  dispose() {
   if (disposed) return; visible = false; invalidate(); disposed = true; element.hidden = true; sound.dispose();
   element.removeEventListener("keydown",keys); element.removeEventListener("keyup",keys); doc.removeEventListener("visibilitychange",visibility);
   for (const timer of downloadTimers) win.clearTimeout(timer);
   for (const url of downloadURLs) objectURLs.revokeObjectURL(url);
   downloadTimers.clear(); downloadURLs.clear();
  },
 };
}

