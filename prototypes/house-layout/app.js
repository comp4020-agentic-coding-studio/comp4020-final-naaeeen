import * as THREE from '/vendor/three.module.js';
import { createLayout, findRoute, moveWithCollision } from './model.mjs';
const $ = id => document.getElementById(id);
let layout = createLayout(4, 'A'), location = 'lounge', position = { x: 0, z: 2.75 }, seated = null, route = [], keyboard = new Set(), touch = new Set(), bubbleText = '', boardText = 'Tea makes a good study break.', routeAction = null;
let renderer, scene, camera, ownAvatar, projectedLabels = [], lastTime = 0;
const sceneLabels = $('scene-labels'), materials = new Map();
const status = text => { $('status').textContent = text; };
const mat = colour => { if (!materials.has(colour)) materials.set(colour, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.88 })); return materials.get(colour); };
function box(w, h, d, x, y, z, colour, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colour)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(r, h, x, y, z, colour, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat(colour)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function label(text, point, kind = '') {
  const el = document.createElement('span'); el.className = 'scene-label ' + kind; el.textContent = text; sceneLabels.append(el); projectedLabels.push({ el, point }); return el;
}
function pickable(group, kind, index) { group.traverse(object => { object.userData = { kind, index }; }); }
function avatar(member, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  cylinder(0.19, 0.46, 0, 0.71, 0, member.colour, g);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.195, 14, 12), mat('#ecc7a8')); head.position.set(0, 1.08, 0); head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.204, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(member.id === 'you' ? '#685040' : '#64594d')); hair.position.set(0, 1.1, 0); g.add(hair);
  box(0.12, 0.36, 0.15, -0.105, 0.3, 0, '#5a605c', g); box(0.12, 0.36, 0.15, 0.105, 0.3, 0, '#5a605c', g);
  box(0.13, 0.13, 0.27, -0.105, 0.07, 0.035, '#463b33', g); box(0.13, 0.13, 0.27, 0.105, 0.07, 0.035, '#463b33', g);
  box(0.10, 0.34, 0.13, -0.24, 0.68, 0, member.colour, g); box(0.10, 0.34, 0.13, 0.24, 0.68, 0, member.colour, g); return g;
}
function plant(x, z, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); scene.add(g);
  cylinder(0.23, 0.35, 0, 0.18, 0, '#b28b64', g); cylinder(0.04, 0.55, 0, 0.58, 0, '#728060', g);
  for (let i = 0; i < 6; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), mat(i % 2 ? '#879777' : '#697f68')); leaf.scale.set(0.55, 1.4, 0.75); leaf.position.set(Math.sin(i) * 0.19, 0.65 + i * 0.045, Math.cos(i) * 0.18); leaf.rotation.z = Math.sin(i) * 0.6; g.add(leaf); }
}
function lamp(x, z) {
  cylinder(0.19, 0.05, x, 0.03, z, '#8e7251'); cylinder(0.035, 1.48, x, 0.8, z, '#8e7251');
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.40, 0.42, 16, 1, true), mat('#dfcba0')); shade.position.set(x, 1.68, z); scene.add(shade);
  const glow = new THREE.PointLight('#ffe1a0', 7, 4, 2); glow.position.set(x, 1.4, z); scene.add(glow);
}
function floorShell() {
  box(12, 0.18, 8, 0, -0.12, 0, '#b99b72');
  for (let i = 0; i < 18; i++) box(0.018, 0.01, 8, -5.7 + i * 0.66, -0.02, 0, '#a78c68');
  box(12.1, 2.55, 0.12, 0, 1.22, -4.05, '#ddc9a5'); box(0.12, 2.55, 8.1, -6.05, 1.22, 0, '#cbbb9c');
  box(12, 0.12, 0.16, 0, 0.06, -3.91, '#ae8c60'); box(0.16, 0.12, 8, -5.91, 0.06, 0, '#ae8c60');
  box(0.12, 0.3, 8.1, 6.05, 0.08, 0, '#cebb99');
  box(6.7, 0.025, 5.3, 0, 0.006, 0, '#a2aa8d'); box(6.3, 0.014, 4.9, 0, 0.025, 0, '#bdc0a3');
  for (let x = -2.8; x <= 2.8; x += 0.38) box(0.11, 0.018, 0.16, x, 0.022, 2.68, '#d8d6b8');
}
function renderDoor(door, i) {
  const group = new THREE.Group(); group.position.set(door.x, 0, door.z); if (door.wall === 'side') group.rotation.y = Math.PI / 2; scene.add(group);
  box(1.34, 1.96, 0.15, 0, 0.97, 0.02, '#a9865e', group); box(1.16, 1.80, 0.17, 0, 0.9, 0.1, '#c4a27b', group);
  box(0.86, 0.66, 0.02, 0, 1.31, 0.20, '#bc9970', group); box(0.86, 0.62, 0.02, 0, 0.53, 0.20, '#bc9970', group);
  cylinder(0.035, 0.08, 0.40, 0.95, 0.23, '#80673d', group); box(0.45, 0.20, 0.04, 0, 1.61, 0.23, layout.members[i].colour, group);
  pickable(group, 'door', i); label(door.name + (i === 0 ? ' - your room' : ''), new THREE.Vector3(door.x, 2.10, door.z + (door.wall === 'rear' ? 0.14 : 0)), i === 0 ? 'own' : '');
}
function renderChair(seat, i) {
  const g = new THREE.Group(); g.position.set(seat.x, 0, seat.z); g.rotation.y = Math.atan2(seat.x, seat.z); scene.add(g);
  const colour = ['#a5b19b','#bd9b86','#c3b184','#91a6ab','#ae9bae','#c09491'][i];
  box(0.75, 0.21, 0.73, 0, 0.42, 0, '#9c765c', g); box(0.65, 0.15, 0.62, 0, 0.54, 0, colour, g);
  box(0.78, 0.65, 0.15, 0, 0.8, 0.36, '#b49b7c', g); box(0.61, 0.47, 0.16, 0, 0.8, 0.26, colour, g);
  for (const x of [-0.26, 0.26]) for (const z of [-0.26, 0.26]) box(0.09, 0.34, 0.09, x, 0.17, z, '#765d45', g);
  pickable(g, 'seat', i); label(String(seat.number), new THREE.Vector3(seat.x, 1.2, seat.z), 'seat');
}
function renderBoard() {
  const group = new THREE.Group(); group.position.set(5.8, 0, 0.25); group.rotation.y = -Math.PI / 2; scene.add(group);
  box(2.0, 1.4, 0.1, 0, 1.5, 0, '#987e5c', group); box(1.82, 1.22, 0.11, 0, 1.5, 0.05, '#ecece0', group);
  box(0.60, 0.58, 0.025, -0.38, 1.64, 0.13, '#e7d68e', group); box(0.52, 0.53, 0.025, 0.40, 1.42, 0.13, '#d2ad9b', group);
  pickable(group, 'board', 0); label('Common board', new THREE.Vector3(5.8, 2.4, 0.25)); label(boardText, new THREE.Vector3(5.75, 1.65, 0.25), 'bubble');
}
function renderLounge() {
  layout.doors.forEach(renderDoor); layout.seats.forEach(renderChair); box(2.5, 0.15, 1.8, 0, 0.59, 0, '#b08c60');
  for (const x of [-1.03, 1.03]) for (const z of [-0.7, 0.7]) box(0.10, 0.52, 0.10, x, 0.26, z, '#8f714e');
  box(0.59, 0.04, 0.4, -0.47, 0.69, 0.1, '#777f68'); box(0.38, 0.04, 0.5, -0.38, 0.73, 0.13, '#ddd3b9');
  cylinder(0.14, 0.19, 0.42, 0.76, -0.22, '#e8d7b9'); cylinder(0.11, 0.10, 0.80, 0.71, 0.17, '#ded1ac');
  box(1.7, 0.75, 0.6, -4.55, 0.375, 3.42, '#997e5b'); box(1.82, 0.08, 0.68, -4.55, 0.79, 3.42, '#c5a780');
  cylinder(0.18, 0.30, -4.75, 0.98, 3.42, '#efe0bf'); box(0.4, 0.16, 0.3, -4.15, 0.93, 3.42, '#c6a67e');
  box(1.5, 1.5, 0.55, 4.65, 0.75, -2.15, '#ad9068');
  for (let shelf = 0; shelf < 3; shelf++) { box(1.35, 0.06, 0.60, 4.65, 0.20 + shelf * 0.48, -2.15, '#c7aa82'); for (let book = 0; book < 6; book++) box(0.12, 0.29 + (book % 2) * 0.04, 0.24, 4.14 + book * 0.20, 0.39 + shelf * 0.48, -1.97, ['#77866d','#b6947c','#cfbd95'][book % 3]); }
  plant(-5.4, -3.4, 1.1); plant(5.25, 3.1, 1.3); lamp(-3.1, -2.55); lamp(3.55, 3.15); renderBoard();
  layout.members.forEach(m => { const g = avatar(m, m.id === 'you' ? position.x : m.x, m.id === 'you' ? position.z : m.z); label(m.name, () => new THREE.Vector3(g.position.x, g.position.y + 1.47, g.position.z), 'avatar ' + (m.id === 'you' ? 'own' : '')); if (m.id === 'you') { ownAvatar = g; if (seated !== null) g.position.y = 0.34; } });
}
function renderBedroom() {
  box(4.1, 0.025, 6.1, -0.8, 0.04, -0.5, '#b5a899'); box(2.6, 0.5, 3.8, -2.6, 0.3, -1.8, '#a88963');
  box(2.4, 0.25, 3.4, -2.6, 0.68, -1.72, '#eadccb'); box(2.35, 0.11, 2.05, -2.6, 0.86, -1.10, '#acb59c'); box(2.6, 1.2, 0.18, -2.6, 0.65, -3.5, '#a88963'); box(1.02, 0.15, 0.60, -2.6, 0.91, -2.80, '#f4ead9');
  box(2.2, 0.12, 0.9, 3.4, 0.90, -2.1, '#b09670'); for (const x of [2.45, 4.35]) box(0.12, 0.86, 0.70, x, 0.43, -2.1, '#8d7556');
  box(0.72, 0.45, 0.04, 3.5, 1.2, -2.1, '#56645c'); box(0.68, 0.37, 0.045, 3.5, 1.2, -2.07, '#9daea0'); box(0.46, 0.03, 0.3, 3.4, 0.99, -1.9, '#ded6c3');
  box(0.8, 0.63, 0.8, -4.50, 0.32, -2.6, '#c0a077'); lamp(-4.50, -2.6); plant(4.4, 2.6, 1.3);
  ownAvatar = avatar(layout.members[0], position.x, position.z); label('You - local room', () => new THREE.Vector3(position.x, 1.47, position.z), 'avatar own'); label('Your bedroom', new THREE.Vector3(-2.6, 2.0, -3.2), 'own');
}
function rebuild() {
  if (!renderer) return;
  if (scene) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isLight && o.shadow) o.shadow.dispose(); });
  sceneLabels.replaceChildren(); projectedLabels = []; scene = new THREE.Scene(); scene.background = new THREE.Color('#c7bca5');
  scene.add(new THREE.HemisphereLight('#fff4dc', '#b4a68c', 2.35));
  const light = new THREE.DirectionalLight('#fff0cb', 3.2); light.position.set(0, 9, 5); light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -9; light.shadow.camera.right = 9; light.shadow.camera.top = 9; light.shadow.camera.bottom = -9; light.shadow.normalBias = 0.04; scene.add(light);
  floorShell(); if (location === 'lounge') renderLounge(); else renderBedroom();
  if (bubbleText) label(bubbleText, () => new THREE.Vector3(position.x, 2.05, position.z), 'bubble own');
  resize(); updateUI();
}
function resize() {
  if (!renderer) return;
  const w = $('scene').clientWidth, h = $('scene').clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(w, h, false);
  const aspect = w / h, phone = w < 700, vertical = phone ? 18.6 : 16.0, horizontal = phone ? 15.0 : vertical * aspect, height = Math.max(vertical, horizontal / aspect);
  camera = new THREE.OrthographicCamera(-horizontal / 2, horizontal / 2, height / 2, -height / 2, 0.1, 60); camera.position.set(11, 13, 14); camera.lookAt(0, 0, 0);
  // One fixed framing per viewport for both layouts; desktop doors clear the header.
  const offset = phone ? -3.2 : 0.4;
  camera.top += offset; camera.bottom += offset;
  camera.updateProjectionMatrix();
}
function updateUI() {
  $('location').textContent = location === 'lounge' ? 'In the lounge' : 'In your bedroom'; $('pose').textContent = seated === null ? 'Standing' : 'Seated at ' + (seated + 1);
  $('room-title').textContent = location === 'lounge' ? 'A place between our rooms.' : 'A quiet corner of your own.';
  $('bedroom').hidden = location !== 'lounge'; $('return').hidden = location === 'lounge'; document.querySelectorAll('.lounge-only').forEach(el => { el.hidden = location !== 'lounge'; });
  $('walk-door').disabled = location !== 'lounge'; $('door-select').disabled = location !== 'lounge'; $('sit').textContent = seated === null ? 'Sit' : 'Stand';
  $('diagnostic-text').textContent = 'Layout ' + layout.variant + ' | capacity ' + layout.capacity + ' | lounge doors ' + layout.doors.length + ' | lounge seats ' + layout.seats.length + ' | fixture avatars ' + layout.members.length + ' | room ' + location + ' | You x ' + position.x.toFixed(2) + ', z ' + position.z.toFixed(2) + ' | ' + (seated === null ? 'standing' : 'seated ' + (seated + 1));
}
function populateControls() {
  $('door-select').replaceChildren(...layout.doors.map(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.name + (d.id === 'you' ? ' - your room' : "'s room"); return o; }));
  $('seat-select').replaceChildren(...layout.seats.map((s, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = 'Seat ' + s.number; return o; }));
}
function obstacles() { return location === 'lounge' ? layout.obstacles : [{ x: -2.6, z: -1.8, width: 2.6, depth: 3.8 }, { x: 3.4, z: -2.1, width: 2.2, depth: 0.9 }, { x: -4.5, z: -2.6, width: 0.8, depth: 0.8 }, { x: 4.4, z: 2.6, width: 0.60, depth: 0.60 }]; }
function stand() { if (seated === null) return; position = { ...layout.seats[seated].target }; seated = null; if (ownAvatar) ownAvatar.position.y = 0; updateUI(); }
function walkTo(destination, description) {
  stand(); routeAction = null; route = findRoute(position, destination, obstacles()) ?? []; if (!route.length) { status('No clear route to ' + description + '.'); return; } status('Walking to ' + description + '. Use arrow keys to take over.');
}
function openBedroom() { stand(); location = 'bedroom'; position = { x: 0, z: 2.5 }; route = []; keyboard.clear(); touch.clear(); routeAction = null; $('board-panel').hidden = true; status('Your room is a local layout preview. Return to the lounge any time.'); rebuild(); }
function resetLayout() {
  layout = createLayout(Number($('capacity').value), $('layout').value); location = 'lounge'; position = { x: 0, z: 2.75 }; seated = null; route = []; keyboard.clear(); touch.clear(); bubbleText = ''; $('board-panel').hidden = true; populateControls(); rebuild(); status('Layout ' + layout.variant + ', ' + layout.capacity + ' members. All other scene choices stay the same.');
}
$('capacity').addEventListener('change', resetLayout); $('layout').addEventListener('change', resetLayout);
$('reset').addEventListener('click', () => { $('transcript').replaceChildren(); $('chat-count').textContent = '0'; boardText = 'Tea makes a good study break.'; $('board-note').textContent = boardText; resetLayout(); });
$('walk-door').addEventListener('click', () => { const door = layout.doors.find(d => d.id === $('door-select').value); walkTo(door.target, door.name + "'s door"); });
$('bedroom').addEventListener('click', () => { const door = layout.doors[0]; if (Math.hypot(position.x - door.target.x, position.z - door.target.z) < 0.6) openBedroom(); else { walkTo(door.target, 'your bedroom door'); if (route.length) routeAction = openBedroom; } }); $('return').addEventListener('click', () => { location = 'lounge'; position = { ...layout.doors[0].target }; route = []; rebuild(); status('Back in the common room.'); });
$('walk-seat').addEventListener('click', () => { const i = Number($('seat-select').value); walkTo(layout.seats[i].target, 'seat ' + (i + 1)); });
$('sit').addEventListener('click', () => {
  if (seated !== null) { stand(); status('Standing beside the chair.'); return; }
  const i = Number($('seat-select').value), seat = layout.seats[i];
  if (Math.hypot(position.x - seat.target.x, position.z - seat.target.z) > 0.55) { walkTo(seat.target, 'seat ' + (i + 1)); status('Walk to seat ' + (i + 1) + ', then press Sit.'); return; }
  route = []; seated = i; position = { x: seat.x, z: seat.z }; if (ownAvatar) ownAvatar.position.y = 0.34; status('Seated at ' + (i + 1) + '. Press Stand to move again.'); updateUI();
});
function showBoard() {
  if (location !== 'lounge') return; stand();
  const open = () => { $('board-panel').hidden = false; $('board-input').focus(); };
  if (Math.hypot(position.x - layout.boardTarget.x, position.z - layout.boardTarget.z) < 0.6) open();
  else { walkTo(layout.boardTarget, 'the common board'); if (route.length) routeAction = open; }
}
$('walk-board').addEventListener('click', showBoard); $('close-board').addEventListener('click', () => { $('board-panel').hidden = true; $('walk-board').focus(); });
$('board-form').addEventListener('submit', e => { e.preventDefault(); const text = $('board-input').value.trim(); if (!text) return; boardText = text.slice(0, 100); $('board-note').textContent = boardText; status('Sticky note pinned in this local preview.'); $('board-panel').hidden = true; rebuild(); $('walk-board').focus(); });
$('chat-form').addEventListener('submit', e => {
  e.preventDefault(); const text = $('chat-input').value.trim(); if (!text) return; bubbleText = text.slice(0, 120); $('chat-input').value = '';
  const li = document.createElement('li'); li.textContent = 'You: ' + bubbleText; $('transcript').append(li); while ($('transcript').children.length > 20) $('transcript').firstElementChild.remove(); $('chat-count').textContent = String($('transcript').children.length);
  $('transcript-panel').open = true; status('Your local message is attached to your avatar.'); rebuild(); $('chat-input').focus();
});
const keyDirection = { w: 'up', ArrowUp: 'up', s: 'down', ArrowDown: 'down', a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' };
function typingTarget(target) { return target instanceof HTMLElement && (target.matches('input,textarea,select,button,summary') || target.isContentEditable); }
window.addEventListener('keydown', e => { if (typingTarget(e.target)) return; const direction = keyDirection[e.key] ?? keyDirection[e.key.toLowerCase()]; if (!direction) return; e.preventDefault(); stand(); keyboard.add(direction); route = []; routeAction = null; });
window.addEventListener('keyup', e => { const direction = keyDirection[e.key] ?? keyDirection[e.key.toLowerCase()]; if (direction) keyboard.delete(direction); });
window.addEventListener('blur', () => { keyboard.clear(); touch.clear(); });
document.querySelectorAll('input,textarea,select').forEach(el => el.addEventListener('focus', () => { keyboard.clear(); touch.clear(); route = []; routeAction = null; }));
document.querySelectorAll('[data-move]').forEach(button => {
  button.addEventListener('pointerdown', e => { e.preventDefault(); stand(); route = []; routeAction = null; touch.add(button.dataset.move); button.setPointerCapture(e.pointerId); });
  button.addEventListener('pointerup', () => touch.delete(button.dataset.move)); button.addEventListener('pointercancel', () => touch.delete(button.dataset.move));
  button.addEventListener('click', e => { if (e.detail === 0) { stand(); route = []; routeAction = null; const d = { up: [0, -0.38], down: [0, 0.38], left: [-0.38, 0], right: [0.38, 0] }[button.dataset.move]; position = moveWithCollision(position, { x: d[0], z: d[1] }, obstacles()); updateUI(); } });
});
$('scene').addEventListener('pointerdown', e => {
  if (!renderer || location !== 'lounge') return;
  const rect = $('scene').getBoundingClientRect(), pointer = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(scene.children, true).find(h => h.object.userData.kind); if (!hit) return;
  const { kind, index } = hit.object.userData;
  if (kind === 'door') { $('door-select').value = layout.doors[index].id; if (index === 0 && Math.hypot(position.x - layout.doors[0].target.x, position.z - layout.doors[0].target.z) < 0.6) openBedroom(); else walkTo(layout.doors[index].target, layout.doors[index].name + "'s door"); }
  if (kind === 'seat') { $('seat-select').value = String(index); walkTo(layout.seats[index].target, 'seat ' + (index + 1)); } if (kind === 'board') showBoard();
});
function animate(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.05); lastTime = time;
  if (seated === null) {
    const active = new Set([...keyboard, ...touch]); let dx = (active.has('right') ? 1 : 0) - (active.has('left') ? 1 : 0), dz = (active.has('down') ? 1 : 0) - (active.has('up') ? 1 : 0);
    if (active.size) { const magnitude = Math.hypot(dx, dz) || 1; position = moveWithCollision(position, { x: dx / magnitude * dt * 2.8, z: dz / magnitude * dt * 2.8 }, obstacles()); }
    else if (route.length) { const next = route[0], distance = Math.hypot(next.x - position.x, next.z - position.z);
      if (distance < 0.05) { position = { ...next }; route.shift(); if (!route.length) { status('Arrived. Choose an action or move with the arrow keys.'); const action = routeAction; routeAction = null; action?.(); } }
      else { const speed = Math.min(dt * 2.8, distance); position = moveWithCollision(position, { x: (next.x - position.x) / distance * speed, z: (next.z - position.z) / distance * speed }, obstacles()); }
    }
  }
  ownAvatar.position.x = position.x; ownAvatar.position.z = position.z; updateUI(); renderer.render(scene, camera);
  const w = $('scene').clientWidth, h = $('scene').clientHeight;
  for (const item of projectedLabels) { const p = (typeof item.point === 'function' ? item.point() : item.point.clone()).project(camera); item.el.style.left = (p.x * .5 + .5) * w + 'px'; item.el.style.top = (-p.y * .5 + .5) * h + 'px'; item.el.hidden = p.z < -1 || p.z > 1; }
  requestAnimationFrame(animate);
}
populateControls(); updateUI();
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, alpha: false }); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  rebuild(); $('render-status').textContent = 'Three 0.186.1 | fixed orthographic renderer ready'; requestAnimationFrame(animate);
} catch (error) { $('render-status').textContent = 'Renderer unavailable: ' + error.message; status('The scene could not start. Native controls and local chat remain available.'); }
window.addEventListener('resize', resize);
