/** Opt-in study huddle / one-image inspection. This does not synchronize Excalidraw. */
export function createHouseGatheringUI(element, { api = {}, state = api.state, action = api.action, image = api.image, onOpenBoard = () => {}, onClose = () => {}, onChat = () => {} } = {}) {
  const doc = element.ownerDocument, win = doc.defaultView;
  element.classList.add("house-gathering");
  element.innerHTML = `<div class="gathering-heading"><h3 data-gathering-title></h3><button data-gathering-action="close">Leave shared view · keep seat</button></div><p data-gathering-roster></p><p data-gathering-role></p><div class="gathering-controls"><button data-gathering-action="join">Join</button><button data-gathering-action="leave">Leave gathering</button><button data-gathering-action="share">Share my view</button><button data-gathering-action="publish">Share my room reference with house</button><button data-gathering-action="follow" aria-pressed="false">Follow presenter</button><button data-gathering-action="board">Open independent board</button><button data-gathering-action="chat">Lounge chat</button><button data-gathering-action="clear">Clear shared image</button></div><p data-gathering-explanation></p><div data-gathering-viewport class="gathering-viewport" tabindex="0" aria-label="Shared reference inspection. Click to point while presenting. Pan buttons or arrow keys inspect; plus and minus zoom."><div data-gathering-plane class="gathering-plane"><img data-gathering-image alt="House-visible reference"><span data-gathering-pointer class="gathering-pointer" aria-hidden="true" hidden></span></div></div><div class="gathering-view-tools" data-gathering-view-tools><div class="gathering-controls"><button data-gathering-action="fit">Fit image</button><button data-gathering-action="out">Zoom out</button><button data-gathering-action="in">Zoom in</button></div><div class="gathering-pan-controls" role="group" aria-label="Pan reference image"><button type="button" data-gathering-action="pan-left" aria-label="Pan image left">Pan left</button><button type="button" data-gathering-action="pan-right" aria-label="Pan image right">Pan right</button><button type="button" data-gathering-action="pan-up" aria-label="Pan image up">Pan up</button><button type="button" data-gathering-action="pan-down" aria-label="Pan image down">Pan down</button></div></div><p data-gathering-source></p><p data-gathering-status role="status" aria-live="polite"></p>`;
  const get = selector => element.querySelector(selector), button = name => get(`[data-gathering-action="${name}"]`);
  let context = null, snapshot = null, opened = false, disposed = false, following = false, timer = null, epoch = 0, imageEpoch = 0, actionEpoch = 0, objectUrl = null, loadedItem = null, pendingItem = null, busy = false, joining = false, participationId = null, pendingWithdrawal = null, queuedView = null, message = "", localView = { x: .5, y: .5, zoom: 1 };
  const bounded = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const key = value => value ? JSON.stringify([value.kind, value.houseId, value.identityId, value.controller, value.generation, value.accessGeneration, value.seatGeneration, value.zoneId, value.seatId, value.seatPurpose]) : "";
  const writable = () => Boolean(context?.controller && context?.zoneId === "lounge" && context?.houseId && context?.identityId && context.seatPurpose === (context.kind === "study" ? "study" : "rest"));
  const joined = () => Boolean(snapshot?.selfJoined);
  const presenter = () => Boolean(joined() && snapshot?.presenterId === context?.identityId);
  const current = (token, ownKey) => !disposed && opened && epoch === token && key(context) === ownKey;
  function cancelPoll() { if (timer !== null) win.clearTimeout(timer); timer = null; }
  function clearImage() { imageEpoch++; pendingItem = null; loadedItem = null; if (objectUrl) win.URL.revokeObjectURL(objectUrl); objectUrl = null; get('[data-gathering-image]').removeAttribute("src"); }
  function stopLocal() { epoch++; actionEpoch++; cancelPoll(); opened = false; following = false; busy = false; joining = false; snapshot = null; participationId = null; queuedView = null; clearImage(); localView = { x: .5, y: .5, zoom: 1 }; }
  function schedule() { cancelPoll(); if (opened && !disposed) timer = win.setTimeout(() => { void refresh(); }, 1500); }
  function normalizedView(value) {
    const number = (input, fallback) => typeof input === "number" && Number.isFinite(input) ? input : fallback;
    return { x: bounded(number(value?.x, .5)), y: bounded(number(value?.y, .5)), zoom: bounded(number(value?.zoom, 1), 1, 4) };
  }
  const displayedView = () => normalizedView(following && snapshot ? snapshot.view : localView);
  function view() {
    const { x, y, zoom } = displayedView();
    get('[data-gathering-plane]').style.transform = `translate(${(0.5 - x) * 100 * zoom}%, ${(0.5 - y) * 100 * zoom}%) scale(${zoom})`;
    const pointer = get('[data-gathering-pointer]'); pointer.hidden = !snapshot?.pointer || !snapshot?.presenterId;
    if (snapshot?.pointer) { pointer.style.left = `${bounded(snapshot.pointer.x) * 100}%`; pointer.style.top = `${bounded(snapshot.pointer.y) * 100}%`; }
  }
  function render() {
    const study = context?.kind === "study";
    get('[data-gathering-title]').textContent = study ? "Study huddle" : "Sofa · shared inspection";
    get('[data-gathering-roster]').textContent = snapshot ? `${snapshot.members.length} joined${snapshot.members.length ? " · " + snapshot.members.map(member => member.name).join(", ") : ""}` : "Nobody joined on this screen.";
    const name = snapshot?.members.find(member => member.actorId === snapshot.presenterId)?.name;
    get('[data-gathering-role]').textContent = (joined() ? "You joined. " : "Choose Join when you want to participate. ") + (name ? `${name} is presenting. ` : "No presenter. ") + (following ? "Following presenter." : "Inspecting independently.");
    get('[data-gathering-explanation]').textContent = study ? "Join to coordinate a board explanation. Lead huddle names the volunteer explaining; Follow huddle opens the independent board. Board editing stays independent; viewport movement is local." : "One deliberately shared house-visible picture. Join, then Follow when you want the presenter's view. Present shared image resumes the last shared crop. Sharing copies your chosen room reference for the current gathering.";
    button("join").hidden = joined(); button("join").disabled = !opened || !writable() || busy || Boolean(pendingWithdrawal);
    button("leave").hidden = !joined() && !joining && !pendingWithdrawal; button("leave").textContent = pendingWithdrawal ? "Retry leaving gathering" : "Leave gathering"; button("leave").disabled = !opened;
    button("share").textContent = study ? "Lead huddle" : "Present shared image";
    button("share").disabled = !opened || !writable() || !joined() || busy || Boolean(pendingWithdrawal) || Boolean(snapshot?.presenterId && !presenter()) || (!study && !snapshot?.item);
    button("publish").hidden = study; button("publish").disabled = !opened || !writable() || !joined() || !context?.ownRoomId || busy || Boolean(pendingWithdrawal) || Boolean(snapshot?.presenterId && !presenter());
    button("board").hidden = !study;
    button("follow").disabled = !opened || !joined() || !snapshot?.presenterId || presenter() || Boolean(pendingWithdrawal); button("follow").setAttribute("aria-pressed", String(following)); button("follow").textContent = following ? "Stop following" : study ? "Follow huddle · open board" : "Follow presenter";
    button("clear").hidden = study; button("clear").disabled = !opened || !presenter() || !snapshot?.item || busy || Boolean(pendingWithdrawal);
    get('[data-gathering-viewport]').hidden = study || !snapshot?.item; get('[data-gathering-view-tools]').hidden = study || !snapshot?.item;
    for (const name of ['fit', 'out', 'in', 'pan-left', 'pan-right', 'pan-up', 'pan-down']) button(name).disabled = !opened || !snapshot?.item;
    const owner = context?.residents?.find(person => person.id === snapshot?.item?.ownerId)?.name || snapshot?.members.find(person => person.actorId === snapshot?.item?.ownerId)?.name || "Original room owner";
    get('[data-gathering-source]').textContent = snapshot?.item ? `${owner}'s material · house-visible copy · temporary while this gathering continues.` : study ? "Open the independent board whenever you need its drawing and editing tools." : "No shared image. Select a reference in your own room, then explicitly share it here.";
    get('[data-gathering-status]').textContent = message || (opened ? "Closing leaves this shared view and keeps your ordinary seat." : "Shared view closed. Reopen from your seat, then explicitly Join.");
    view();
  }
  function apply(next) {
    if (snapshot?.sessionId === next?.sessionId && Number.isFinite(next?.revision) && next.revision < snapshot.revision) return;
    if (!next || next.houseId !== context?.houseId || next.kind !== context?.kind || !Array.isArray(next.members)) return;
    const sameSurface = Boolean(snapshot && snapshot.sessionId === next.sessionId && snapshot.item?.id === next.item?.id);
    const presenterChanged = snapshot?.presenterId !== next.presenterId;
    if (!sameSurface) { localView = { x: .5, y: .5, zoom: 1 }; following = false; queuedView = null; }
    else if (presenterChanged || !next.selfJoined) {
      if (following) localView = displayedView();
      following = false; queuedView = null;
    }
    if (next.selfJoined && next.presenterId === context?.identityId && (presenterChanged || !sameSurface)) localView = normalizedView(next.view);
    if (pendingWithdrawal && pendingWithdrawal.command.sessionId !== next.sessionId) { pendingWithdrawal = null; message = "The previous gathering ended. Choose Join for this one."; }
    snapshot = next;
    if (next.selfJoined && next.selfParticipationId && !joining) participationId = next.selfParticipationId;
    if (!next.selfJoined && !joining) participationId = null;
    if (!sameSurface || next.item?.id !== loadedItem && next.item?.id !== pendingItem) { clearImage(); if (next.item && image) void loadImage(next.item.id); }
    render();
  }
  async function loadImage(itemId) {
    const token = epoch, ownKey = key(context), version = ++imageEpoch; pendingItem = itemId;
    try {
      const blob = await image(context.kind, itemId, { ...context });
      if (!current(token, ownKey) || version !== imageEpoch || snapshot?.item?.id !== itemId) return;
      if (!blob || blob.size > 262144 || blob.type !== "image/png") throw new Error("The shared image exceeds its PNG limit.");
      objectUrl = win.URL.createObjectURL(blob); loadedItem = itemId; pendingItem = null; get('[data-gathering-image]').src = objectUrl;
    } catch (error) { if (current(token, ownKey) && version === imageEpoch) { pendingItem = null; message = error.message || "The shared image is unavailable."; render(); } }
  }
  async function refresh() {
    if (!opened || disposed || !state) return;
    const token = epoch, ownKey = key(context);
    try { const next = await state(context.kind, { ...context }); if (!current(token, ownKey)) return; apply(next); }
    catch (error) { if (!current(token, ownKey)) return; if (["FORBIDDEN", "NO_HOUSE", "STALE_GENERATION", "STALE_ZONE"].includes(error.code)) { stopLocal(); } message = error.message || "Shared place unavailable. Try reopening it."; render(); }
    finally { if (current(token, ownKey)) schedule(); }
  }
  function makeCommand(type, payload) { return { commandId: win.crypto.randomUUID(), kind: context.kind, sessionId: snapshot.sessionId, type: `gathering.${type}`, payload }; }
  async function send(type, payload = {}) {
    if (!opened || disposed || !snapshot || !action || (type !== "leave" && (!writable() || busy || pendingWithdrawal))) return;
    const token = epoch, ownAction = ++actionEpoch, ownKey = key(context), command = makeCommand(type, payload), captured = { ...context }; busy = true; message = "Sending… waiting for current shared state."; render();
    try { const result = await action(command, captured); if (!current(token, ownKey) || ownAction !== actionEpoch) return; if (type === "join") joining = false; apply(result.state); message = type === "join" ? "Join acknowledged. Follow remains your choice." : type === "leave" ? "You left the gathering and kept your seat." : type === "share" && context.kind === "sofa" ? (payload.roomId ? "Your room reference is now house-visible. Pan or zoom to present it." : "Presenting the last shared view. Pan or zoom to change it for the group.") : "Shared state updated."; }
    catch (error) { if (!current(token, ownKey) || ownAction !== actionEpoch) return; message = error.message || "Action reply is uncertain. Leave or close to cancel participation."; }
    finally { if (current(token, ownKey) && ownAction === actionEpoch) { busy = false; render(); if (queuedView && presenter() && !pendingWithdrawal) { const latest = queuedView; queuedView = null; void send("view", latest); } } }
  }
  function attemptWithdrawal() {
    const pending = pendingWithdrawal;
    if (!pending || !action || key(context) !== key(pending.context)) return Promise.resolve();
    if (pending.promise) return pending.promise;
    pending.promise = Promise.resolve().then(() => action(pending.command, pending.context)).then(result => {
      if (pendingWithdrawal !== pending) return;
      pendingWithdrawal = null;
      if (opened && !disposed && key(context) === key(pending.context)) { busy = false; joining = false; apply(result.state); message = "You left the gathering and kept your seat."; render(); }
    }).catch(error => {
      if (pendingWithdrawal !== pending) return;
      message = "Withdrawal pending. Reopen or choose Retry leaving gathering. " + (error.message || "The network reply is uncertain.");
      if (!disposed && key(context) === key(pending.context)) { busy = false; render(); }
    }).finally(() => { pending.promise = null; });
    return pending.promise;
  }
  function prepareWithdrawal() {
    if (!pendingWithdrawal && snapshot && participationId && action) pendingWithdrawal = { command: makeCommand("leave", { participationId }), context: { ...context }, promise: null };
    return pendingWithdrawal;
  }
  function withdraw() {
    following = false; queuedView = null; joining = false; actionEpoch++;
    if (prepareWithdrawal()) { message = "Leaving gathering… waiting for acknowledgement."; void attemptWithdrawal(); }
    render();
  }
  function close(options = {}) {
    if (disposed) return;
    prepareWithdrawal();
    stopLocal(); message = pendingWithdrawal ? "Withdrawal pending; your ordinary seat is retained." : "Shared view closed; your ordinary seat is retained."; render();
    void attemptWithdrawal();
    if (options.notify !== false) onClose();
  }
  function changeView(next) {
    if (!opened || disposed || !snapshot?.item) return;
    following = false; localView = normalizedView(next); render();
    if (presenter()) { if (busy) queuedView = { ...localView }; else void send("view", { ...localView }); }
  }
  button("join").addEventListener("click", () => { if (!writable() || joined() || busy || pendingWithdrawal || !snapshot) return; participationId = win.crypto.randomUUID(); joining = true; void send("join", { participationId }); });
  button("leave").addEventListener("click", withdraw);
  button("share").addEventListener("click", () => { void send("share"); });
  button("publish").addEventListener("click", () => { if (context?.ownRoomId) void send("share", { roomId: context.ownRoomId }); });
  button("clear").addEventListener("click", () => { void send("clear"); });
  button("follow").addEventListener("click", () => { if (!joined() || !snapshot?.presenterId || presenter()) return; following = !following; if (!following) localView = normalizedView(snapshot.view); render(); if (following && context.kind === "study") onOpenBoard(); });
  button("close").addEventListener("click", () => close()); button("board").addEventListener("click", onOpenBoard); button("chat").addEventListener("click", onChat);
  button("fit").addEventListener("click", () => changeView({ x: .5, y: .5, zoom: 1 })); button("in").addEventListener("click", () => { const current = displayedView(); changeView({ ...current, zoom: current.zoom + .25 }); }); button("out").addEventListener("click", () => { const current = displayedView(); changeView({ ...current, zoom: current.zoom - .25 }); });
  for (const [name, axis, step] of [["pan-left", "x", -.05], ["pan-right", "x", .05], ["pan-up", "y", -.05], ["pan-down", "y", .05]]) button(name).addEventListener("click", () => { const current = displayedView(); changeView({ ...current, [axis]: current[axis] + step }); });
  const viewport = get('[data-gathering-viewport]');
  viewport.addEventListener("click", event => { if (!presenter() || !snapshot?.item || busy) return; const rect = get('[data-gathering-plane]').getBoundingClientRect(); if (!rect.width || !rect.height) return; void send("pointer", { x: bounded((event.clientX - rect.left) / rect.width), y: bounded((event.clientY - rect.top) / rect.height) }); });
  function keys(event) {
    if (event.key !== "Escape") event.stopPropagation();
    if (event.target !== viewport || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"].includes(event.key)) return;
    event.preventDefault(); const next = displayedView(); if (event.key === "ArrowLeft") next.x -= .05; if (event.key === "ArrowRight") next.x += .05; if (event.key === "ArrowUp") next.y -= .05; if (event.key === "ArrowDown") next.y += .05; if (["+", "="].includes(event.key)) next.zoom += .25; if (event.key === "-") next.zoom -= .25; changeView(next);
  }
  element.addEventListener("keydown", keys);
  render();
  const update = next => { if (disposed) return; const changed = key(context) !== key(next); if (changed) { stopLocal(); if (pendingWithdrawal && key(pendingWithdrawal.context) !== key(next)) pendingWithdrawal = null; message = ""; } context = next ? { ...next } : null; render(); };
  return { update, setContext: update, refresh, open(mode) { if (disposed || !context) return; if (mode && context.kind !== mode) update({ ...context, kind: mode }); if (opened) return; opened = true; epoch++; message = pendingWithdrawal ? "Retrying pending withdrawal…" : "Reading the shared place…"; render(); const token = epoch, ownKey = key(context); if (pendingWithdrawal) void attemptWithdrawal().then(() => { if (current(token, ownKey)) void refresh(); }); else void refresh(); }, close, dispose() { if (disposed) return; close({ notify: false }); disposed = true; element.removeEventListener("keydown", keys); } };
}
