// Night Neighbourhood's native controls are independent of the scene renderer.
const $ = (id) => document.getElementById(id);
const colours = [
  { key: 'amber', hex: '#ffc47b', name: 'Amber' },
  { key: 'rose', hex: '#f391a8', name: 'Rose' },
  { key: 'mint', hex: '#a0d8b3', name: 'Mint' },
  { key: 'sky', hex: '#99c8e6', name: 'Sky' },
  { key: 'violet', hex: '#c7a3ec', name: 'Violet' },
];
const pendingKey = 'night-neighbourhood.pending.v1';
const seenKey = 'night-neighbourhood.seen.v1';
let state = null;
let renderer = null;
let selected = null;
let view = 'overview';
let windowColour = 'amber';
let paneColour = colours[0].hex;
let profileDirty = false;
let lampDirty = false;
let saving = false;
let pending = readStoredPending();
let metrics = {};
let sceneReady = false;
let stream = null;
let loadInFlight = null;
let displayedVisitorId = null;

function storageGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { value === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value); } catch { /* Saving still works when browser storage is unavailable. */ } }
function readStoredPending() {
  try {
    const saved = JSON.parse(storageGet(pendingKey) || 'null');
    if (!saved || typeof saved.visitorId !== 'string' || !saved.envelope || typeof saved.envelope.commandId !== 'string' || typeof saved.envelope.type !== 'string' || !saved.envelope.payload || typeof saved.envelope.payload !== 'object' || typeof saved.savedMessage !== 'string') return null;
    return saved;
  } catch { return null; }
}
function storePending() { storageSet(pendingKey, pending ? JSON.stringify(pending) : null); }
function status(text, tone = 'neutral') { $('action-status').textContent = text; $('action-status').dataset.tone = tone; }
function setConnection(text, connected = false) { $('connection').textContent = text; $('connection').dataset.state = connected ? 'connected' : 'waiting'; updateDiagnostics(); }
function colourFor(key) { return colours.find((colour) => colour.key === key) || colours[0]; }
function ownPart() { return state?.lantern.parts.find((part) => part.owner === state.visitor.id); }
function pointCount(value) { return [...value].length; }
function updatePreviews() {
  $('window-preview').style.setProperty('--preview-colour', colourFor(windowColour).hex);
  $('window-preview-name').textContent = $('nickname').value.trim() || 'Your window';
  $('pane-preview').style.setProperty('--preview-colour', paneColour);
  $('note-length').textContent = String(pointCount($('lamp-note').value));
  $('profile-draft-label').textContent = profileDirty ? 'Your draft · choose Save to publish' : state?.visitor.published ? 'Your saved window' : 'Colour preview · not published yet';
  $('lamp-draft-label').textContent = lampDirty ? 'Your draft pane. Choose Save to share it.' : ownPart() ? 'Your saved pane is part of the lamp.' : 'Your draft pane. Save it to add it to the lamp.';
  for (const button of $('window-palette').children) button.setAttribute('aria-pressed', String(button.dataset.colour === windowColour));
  for (const button of $('lamp-palette').children) button.setAttribute('aria-pressed', String(button.dataset.colour === paneColour));
}
function updateControls() {
  const blocked = !state || saving || Boolean(pending);
  for (const id of ['nickname', 'lamp-note', 'save-window', 'save-lamp', 'object-list']) $(id).disabled = blocked;
  for (const paletteId of ['window-palette', 'lamp-palette']) for (const button of $(paletteId).children) button.disabled = blocked;
  const item = state?.room.furniture.find((piece) => piece.id === selected);
  const editable = !blocked && item?.owner === state.visitor.id;
  for (const id of ['move-north', 'move-south', 'move-west', 'move-east', 'rotate']) $(id).disabled = !editable;
  $('object-description').textContent = item ? `${pieceName(item)} · floor ${item.x}, ${item.z} · turned ${item.yaw}°` : 'Choose a piece from your room.';
  $('withdraw-lamp').hidden = !ownPart();
  $('withdraw-lamp').disabled = blocked || !ownPart();
  $('save-window').firstChild.textContent = state?.visitor.published ? 'Save my changes ' : 'Save my window ';
  $('save-lamp').firstChild.textContent = ownPart() ? 'Save my pane ' : 'Add my light ';
  $('recovery-actions').hidden = !pending && $('read-latest').hidden;
  $('retry-command').hidden = !pending;
  $('retry-command').disabled = saving || !state;
  $('read-latest').disabled = saving;
  updatePreviews();
}
function pieceName(item) {
  const names = { chair: 'Chair', table: 'Table', lamp: 'Standing lamp', plant: 'Plant' };
  const same = state?.room.furniture.filter((piece) => piece.asset === item.asset) || [];
  const base = names[item.asset] || item.asset;
  return same.length > 1 ? `${base} ${same.findIndex((piece) => piece.id === item.id) + 1}` : base;
}
function openTools() { $('controls').hidden = false; const toggle = $('tools-toggle'); if (toggle) { toggle.setAttribute('aria-pressed', 'false'); toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = 'Hide'; } }
function choose(id) {
  openTools();
  if (id === 'lantern') { changeView('courtyard'); return; }
  if (!state?.room.furniture.some((piece) => piece.id === id)) return;
  selected = id;
  if (view !== 'room') changeView('room');
  $('object-list').value = id;
  callRenderer('setSelection', id);
  updateControls();
}
function changeView(next) {
  openTools();
  if (!['overview', 'room', 'courtyard'].includes(next)) return;
  view = next;
  document.body.dataset.view = next;
  for (const button of document.querySelectorAll('button[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === next));
  $('place-layout').dataset.view = next;
  $('profile-panel').hidden = next !== 'overview';
  $('room-panel').hidden = next !== 'room';
  $('lamp-panel').hidden = next !== 'courtyard';
  $('lamp-stories').hidden = next !== 'courtyard';
  const labels = {
    overview: ['01', 'YOUR PLACE IN THE NEIGHBOURHOOD', 'Make a window yours', 'The courtyard, tonight', 'A room of your own. A light for everyone.'],
    room: ['02', 'SIX THINGS, ARRANGED YOUR WAY', 'A room of your own', 'Inside your window', 'Choose a piece below to make it yours.'],
    courtyard: ['03', 'ONE SMALL PART, WITH YOUR SIGNATURE', 'Add a little light', 'The lamp we make together', 'Each colour holds a little reason.'],
  };
  const [number, eyebrow, heading, sceneTitle, description] = labels[next];
  $('panel-number').textContent = number;
  $('panel-eyebrow').textContent = eyebrow;
  $('controls-heading').textContent = heading;
  $('scene-title').textContent = sceneTitle;
  $('scene-description').textContent = description;
  callRenderer('setView', next);
  callRenderer('setSelection', next === 'courtyard' ? 'lantern' : selected);
  updateDiagnostics();
}
function renderNeighbours() {
  const nodes = state.neighbours.map((visitor) => {
    const item = document.createElement('div'); item.className = 'neighbour'; item.dataset.visitorId = visitor.id;
    const window = document.createElement('span'); window.className = 'neighbour-window'; window.style.setProperty('--window-colour', colourFor(visitor.windowColour).hex); window.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.className = 'neighbour-name'; label.textContent = visitor.name;
    if (visitor.id === state.visitor.id) { const own = document.createElement('small'); own.textContent = 'Your window'; label.append(own); }
    item.append(window, label); return item;
  });
  if (!nodes.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No windows have been published yet. Yours can be the first little light.'; nodes.push(empty); }
  $('neighbours').replaceChildren(...nodes);
}
function renderContributions() {
  const nodes = state.lantern.parts.map((part) => {
    const article = document.createElement('article'); article.className = 'contribution'; article.dataset.owner = part.owner;
    const heading = document.createElement('header');
    const pane = document.createElement('span'); pane.className = 'pane-dot'; pane.style.setProperty('--pane-colour', colours.some((colour) => colour.hex === part.colour) ? part.colour : colours[0].hex); pane.setAttribute('aria-hidden', 'true');
    const name = document.createElement('h3'); name.textContent = part.name;
    heading.append(pane, name);
    if (part.owner === state.visitor.id) { const you = document.createElement('small'); you.textContent = 'Your pane'; heading.append(you); }
    const note = document.createElement('p'); note.textContent = part.note || `A little ${colours.find((colour) => colour.hex === part.colour)?.name.toLowerCase() || 'coloured'} light.`;
    article.append(heading, note); return article;
  });
  if (!nodes.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'The lamp is already warm. Add your own colour if you like.'; nodes.push(empty); }
  $('contributions').replaceChildren(...nodes);
}
function restorePendingDraft() {
  if (!pending || pending.visitorId !== state.visitor.id) return;
  const { type, payload } = pending.envelope;
  if (type === 'window.configure') { $('nickname').value = payload.name; windowColour = payload.windowColour; profileDirty = true; }
  if (type === 'contribution.put') { $('lamp-note').value = payload.note; paneColour = payload.colour; lampDirty = true; }
}
function applyState(next, { allowIdentityChange = false } = {}) {
  if (!next || next.schemaVersion !== 1 || !next.visitor || !next.room || !Array.isArray(next.room.furniture) || !Array.isArray(next.neighbours) || !Array.isArray(next.lantern?.parts) || !Number.isSafeInteger(next.sequence)) throw new Error('The neighbourhood returned an incomplete view.');
  if (state && next.visitor.id !== state.visitor.id && !allowIdentityChange) return;
  if (state && next.visitor.id === state.visitor.id && next.sequence < state.sequence) return;
  const identityChanged = Boolean(state && state.visitor.id !== next.visitor.id);
  if (identityChanged) {
    // Drafts belong to one visitor. A fresh session starts with its own saved choices.
    profileDirty = false; lampDirty = false; selected = null;
    stream?.close(); stream = null;
  }
  const firstState = !state;
  const newIdentity = displayedVisitorId !== next.visitor.id;
  state = next;
  if (newIdentity) {
    if (pending && pending.visitorId !== next.visitor.id) { pending = null; storePending(); status('This browser has a different room now. Please review your choices before saving.'); }
    const wasSeen = storageGet(seenKey) === next.visitor.id;
    $('greeting').textContent = next.visitor.published ? `Welcome back, ${next.visitor.name}.` : wasSeen ? 'Your room is still here.' : 'Leave a little light.';
    $('welcome-copy').textContent = next.visitor.published ? 'Your window is still here. Come in, rearrange a little, or add a thought to the lamp.' : 'Choose a window, arrange your room, and add your colour to the shared lamp.';
    storageSet(seenKey, next.visitor.id); displayedVisitorId = next.visitor.id;
  }
  if (!profileDirty) { $('nickname').value = next.visitor.name === 'Night visitor' && !next.visitor.published ? '' : next.visitor.name; windowColour = next.visitor.windowColour; }
  if (!lampDirty) { $('lamp-note').value = ownPart()?.note || ''; paneColour = ownPart()?.colour || colourFor(next.visitor.windowColour).hex; }
  if (firstState) restorePendingDraft();
  if (!selected || !next.room.furniture.some((item) => item.id === selected)) selected = next.room.furniture[0]?.id || null;
  $('object-list').replaceChildren(...next.room.furniture.map((item) => { const option = document.createElement('option'); option.value = item.id; option.textContent = pieceName(item); return option; }));
  $('object-list').value = selected || '';
  callRenderer('setState', next); callRenderer('setSelection', view === 'courtyard' ? 'lantern' : selected);
  renderNeighbours(); renderContributions(); updateControls(); updateDiagnostics();
  if (firstState && pending) status('A previous save is still unconfirmed. Try the same save again to check it safely.');
  if (firstState && !pending) status(next.visitor.published ? 'Your saved window is here. Changes save when confirmed.' : 'Viewing alone publishes nothing. Save when you are ready.');
}
async function loadState({ announce = false } = {}) {
  if (loadInFlight) return loadInFlight;
  loadInFlight = (async () => {
    const response = await fetch('/api/state', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('We could not open your saved room. Try reading it again.');
    const previousVisitor = state?.visitor.id;
    applyState(await response.json(), { allowIdentityChange: true });
    if (!stream) openStream();
    if (announce) { status(previousVisitor && previousVisitor !== state.visitor.id ? 'This browser has a new room. Its own saved choices are loaded.' : 'Latest saved state loaded. Your unsaved draft is still here.'); $('read-latest').hidden = true; updateControls(); }
  })();
  try { await loadInFlight; } finally { loadInFlight = null; }
}
function showReadLatest() { $('read-latest').hidden = false; $('recovery-actions').hidden = false; }
async function sendPending() {
  if (!pending || !state || saving) return;
  saving = true; updateControls(); status('Saving your change…');
  const current = pending;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('/api/command', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current.envelope), signal: controller.signal });
    const result = await response.json();
    if (response.ok && result.ok === true && result.commandId === current.envelope.commandId) {
      pending = null; storePending();
      if (current.envelope.type === 'window.configure') profileDirty = false;
      if (current.envelope.type === 'contribution.put' || current.envelope.type === 'contribution.withdraw') lampDirty = false;
      status(current.savedMessage, 'saved');
      try { await loadState(); } catch { status(`${current.savedMessage} Read the latest state to refresh the view.`, 'saved'); showReadLatest(); }
      // A first published signature changes the greeting immediately as well as on return.
      if (current.envelope.type === 'window.configure' && state?.visitor.published) { $('greeting').textContent = `Your light is here, ${state.visitor.name}.`; $('welcome-copy').textContent = 'Make yourself at home. Your room and your place in the neighbourhood are saved.'; }
    } else if (response.status >= 400 && response.status < 500 && result.ok === false) {
      pending = null; storePending();
      if (result.code === 'REVISION_CONFLICT') { status('This changed in another tab. Your draft is still here. Read the latest state, then save again.', 'error'); showReadLatest(); }
      else if (result.code === 'FORBIDDEN') { status('This browser session changed. This save could not be confirmed for the current window. Read the latest saved state to open the current window.', 'error'); showReadLatest(); }
      else { status(result.message || 'This change could not be saved. Please review your choices.', 'error'); }
    } else {
      status('This save is not confirmed yet. Try the same save again; it will not add your change twice.', 'error');
    }
  } catch {
    status('The connection broke before this save was confirmed. Try the same save again to check it safely.', 'error');
  } finally { clearTimeout(timeout); saving = false; updateControls(); updateDiagnostics(); }
}
function command(type, targetId, expectedRevision, payload, savedMessage) {
  if (!state || pending || saving) return;
  pending = { visitorId: state.visitor.id, envelope: { commandId: crypto.randomUUID(), type, targetId, expectedRevision, payload }, savedMessage };
  storePending(); sendPending();
}
function move(dx, dz) {
  const item = state?.room.furniture.find((piece) => piece.id === selected);
  if (item) command('placement.move', item.id, item.revision, { x: item.x + dx, z: item.z + dz }, `${pieceName(item)} moved and saved.`);
}
for (const [id, dx, dz] of [['move-north', 0, -.5], ['move-south', 0, .5], ['move-west', -.5, 0], ['move-east', .5, 0]]) $(id).addEventListener('click', () => move(dx, dz));
$('rotate').addEventListener('click', () => { const item = state?.room.furniture.find((piece) => piece.id === selected); if (item) command('placement.rotate', item.id, item.revision, { yaw: (item.yaw + 90) % 360 }, `${pieceName(item)} turned and saved.`); });
$('object-list').addEventListener('change', () => choose($('object-list').value));
$('nickname').addEventListener('input', () => { profileDirty = true; updatePreviews(); });
$('lamp-note').addEventListener('input', () => { lampDirty = true; updatePreviews(); });
for (const paletteId of ['window-palette', 'lamp-palette']) {
  for (const colour of colours) {
    const button = document.createElement('button'); button.type = 'button'; button.disabled = true; button.dataset.colour = paletteId === 'window-palette' ? colour.key : colour.hex; button.style.setProperty('--swatch', colour.hex); button.setAttribute('aria-label', `Choose ${colour.name.toLowerCase()} ${paletteId === 'window-palette' ? 'window' : 'lamp pane'}`); button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { if (paletteId === 'window-palette') { windowColour = colour.key; profileDirty = true; } else { paneColour = colour.hex; lampDirty = true; } updatePreviews(); });
    $(paletteId).append(button);
  }
}
$('profile-form').addEventListener('submit', (event) => {
  event.preventDefault(); if (!state || pending) return;
  const name = $('nickname').value.trim();
  if (!name || pointCount(name) > 24 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) { status('Choose a name with 1–24 characters and no control characters.', 'error'); $('nickname').focus(); return; }
  command('window.configure', state.visitor.id, state.visitor.revision, { name, windowColour }, 'Your window is saved and visible in the neighbourhood.');
});
$('lamp-form').addEventListener('submit', (event) => {
  event.preventDefault(); if (!state || pending) return;
  const note = $('lamp-note').value;
  if (pointCount(note) > 140) { status('Keep your note to 140 characters or fewer.', 'error'); $('lamp-note').focus(); return; }
  command('contribution.put', state.visitor.id, state.lantern.ownRevision ?? ownPart()?.revision ?? 0, { colour: paneColour, note }, 'Your pane is saved in the shared lamp.');
});
$('withdraw-lamp').addEventListener('click', () => { if (state && ownPart()) command('contribution.withdraw', state.visitor.id, state.lantern.ownRevision ?? ownPart().revision, {}, 'Your pane has been withdrawn from the lamp.'); });
$('retry-command').addEventListener('click', sendPending);
$('read-latest').addEventListener('click', () => loadState({ announce: true }).catch((error) => { status(error.message, 'error'); showReadLatest(); }));
for (const button of document.querySelectorAll('button[data-view]')) button.addEventListener('click', () => changeView(button.dataset.view));
$('edit-window').addEventListener('click', () => { changeView('overview'); $('nickname').focus(); });
$('pixel-scale').addEventListener('change', () => { callRenderer('setPixelScale', Number($('pixel-scale').value)); updateDiagnostics(); });
function updateDiagnostics(next = {}) {
  metrics = { ...metrics, ...next };
  const rect = $('world').getBoundingClientRect();
  let rendererReport = {};
  try { rendererReport = renderer?.getDiagnostics?.() || {}; } catch { /* Native state remains inspectable after a scene fault. */ }
  const report = { ...metrics, sceneReady, view, viewport: { width: innerWidth, height: innerHeight }, scene: { width: Math.round(rect.width), height: Math.round(rect.height) }, visible: document.visibilityState === 'visible', sequence: state?.sequence ?? null, displayedWindows: state?.neighbours.length ?? 0, furniture: state?.room.furniture.length ?? 0, publishedPanes: state?.lantern.parts.length ?? 0, pendingSave: Boolean(pending), detailScale: Number($('pixel-scale').value), ...rendererReport };
  $('display-diagnostics').textContent = JSON.stringify(report, null, 2);
  return report;
}
// Native, visible diagnostics are also exposed for browser verification.
window.nightNeighbourhood = { getDiagnostics: updateDiagnostics };
function sceneFailure(error) {
  sceneReady = false;
  try { renderer?.destroy?.(); } catch { /* Keep the native controls available. */ }
  renderer = null;
  const fallback = document.createElement('p'); fallback.className = 'render-error';
  fallback.textContent = 'The illustrated room could not open. Your window, furniture controls and shared lamp still work below.';
  $('world').replaceChildren(fallback); $('render-status').textContent = 'Scene unavailable · controls still work';
  updateDiagnostics({ sceneError: String(error.message || error) });
}
function callRenderer(method, ...args) {
  try { renderer?.[method]?.(...args); } catch (error) { sceneFailure(error); }
}
async function openScene() {
  try {
    const module = await import('/render-three.js?v=c8-game-20261006');
    $('world').replaceChildren();
    renderer = await module.createRenderer($('world'), { mode: 'camera-fixed', pixelScale: Number($('pixel-scale').value), onSelect: choose, onMetrics: updateDiagnostics, onReady: () => { sceneReady = true; $('render-status').textContent = 'A little room, ready to arrange'; updateDiagnostics({ firstSceneReadyMs: Math.round(performance.now()) }); }, onError: (error) => { sceneReady = false; $('render-status').textContent = 'Scene unavailable · controls still work'; updateDiagnostics({ sceneError: String(error.message || error) }); } });
    if (state) callRenderer('setState', state);
    callRenderer('setSelection', selected); callRenderer('setView', view); updateDiagnostics();
  } catch (error) {
    sceneFailure(error);
  }
}
function openStream() {
  if (!('EventSource' in window)) { setConnection('Refresh for new lights'); return; }
  const connection = new EventSource('/api/events');
  stream = connection;
  connection.addEventListener('open', () => { if (stream === connection) setConnection('Shared view connected', true); });
  connection.addEventListener('state', (event) => {
    if (stream !== connection) return;
    try { applyState(JSON.parse(event.data)); } catch { setConnection('View needs refreshing'); showReadLatest(); }
  });
  connection.addEventListener('error', () => { if (stream === connection) setConnection('Reconnecting shared view…'); });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadState().catch(() => { setConnection('View needs refreshing'); showReadLatest(); }); });
window.addEventListener('resize', () => updateDiagnostics());
window.addEventListener('pagehide', (event) => { stream?.close(); stream = null; if (!event.persisted) renderer?.destroy?.(); });
window.addEventListener('pageshow', (event) => { if (event.persisted) loadState().catch(() => { setConnection('View needs refreshing'); showReadLatest(); }); });
// Identity is established before SSE, so the first connection cannot create a competing session.
loadState().catch((error) => { status(error.message, 'error'); setConnection('Room not loaded'); showReadLatest(); });
openScene(); updatePreviews(); updateDiagnostics();

// A toolbelt toggle keeps the world available without turning editing into canvas-only UI.
$('tools-toggle').addEventListener('click', () => { const hidden = !$('controls').hidden; $('controls').hidden = hidden; $('tools-toggle').setAttribute('aria-pressed', String(hidden)); $('tools-toggle').setAttribute('aria-expanded', String(!hidden)); $('tools-toggle').textContent = hidden ? 'Tools' : 'Hide'; });
