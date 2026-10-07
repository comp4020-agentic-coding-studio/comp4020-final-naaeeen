import * as THREE from 'three';
import { createLayout, bedroomLayout, slide, validPosition, findRoute, footprint, CAMERA_ORIENTATION, AVATAR_HEIGHT, SEATED_LIFT, FURNITURE_HEIGHTS } from './house-geometry.js';
import { layoutLabels, createBubbleFeed } from './house-label-layout.js';
import { createHouseCamera } from './house-camera.js';

const PALETTE = { amber: '#ceb47d', sage: '#a5b49c', rose: '#c6999b', blue: '#92aebb', lavender: '#b29eb9', peach: '#d7a489' };
const KEY = { w: [0, -1], ArrowUp: [0, -1], s: [0, 1], ArrowDown: [0, 1], a: [-1, 0], ArrowLeft: [-1, 0], d: [1, 0], ArrowRight: [1, 0] };
const typing = target => target instanceof HTMLElement && (target.matches('input,textarea,select') || target.isContentEditable);

/**
 * A renderer of actual authorised zone state, with transient local prediction.
 * @param {HTMLElement} container
 * @param {{onMove?:(motion:{x:number,z:number,heading:number,animation:string})=>void,onInteract?:(target:object)=>void,onSelectPlacement?:(id:string)=>void,onHint?:(text:string)=>void,onCameraModeChange?:(mode:string)=>void}} callbacks
 */
export function createHouseWorld(container, callbacks = {}) {
  const canvas = document.createElement('canvas'); canvas.className = 'house-world-canvas'; canvas.id = 'house-world'; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Shared study house. Move with WASD or arrow keys. Press E to interact nearby.');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
  const overlay = document.createElement('div'); overlay.className = 'house-world-labels'; overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  const leaderLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leaderLayer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;'; leaderLayer.setAttribute('aria-hidden', 'true'); overlay.append(leaderLayer);
  container.append(canvas, overlay);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  const materials = new Map(), keys = new Set(), labels = [], avatars = new Map(), doors = new Map(), labelEntries = new WeakMap(), speech = createBubbleFeed();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), pickTargets = [];
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cameraRig = createHouseCamera({ reducedMotion: reduced });
  let cameraBounds = null, cameraCorners = [], cameraUprightHeight = 1, selfFrameGeometry = null;
  let scene, camera, layout = createLayout(4), live = null, own = { ...layout.spawn }, heading = 0;
  let inputEnabled = true, editing = false, composing = false, suspended = false, previousEditMode = null, pendingEditFraming = false, gesture = null, direction = { x: 0, z: 0 }, route = [], routeTarget = null;
  let lastFrame = null, lastSent = -Infinity, sent = null, renderKey = '', frame = 0, disposed = false, pendingStand = false;
  let prompt, roomLabel = null, selection = null, context = null, previewPlacements = null, lastHint = '';
  let safeArea = null, layoutDirty = true, lastLabelLayout = -Infinity;
  const dimensionObserver = new ResizeObserver(entries => { for (const observed of entries) { const item = labelEntries.get(observed.target); if (!item) continue; const box = observed.borderBoxSize?.[0]; if (box && box.inlineSize > 0 && box.blockSize > 0) { if (Math.abs(item.size.w - box.inlineSize) > 0.1 || Math.abs(item.size.h - box.blockSize) > 0.1) { item.size = { w: box.inlineSize, h: box.blockSize }; layoutDirty = true; } item.sizeDirty = false; } else { item.sizeDirty = true; layoutDirty = true; } } });
  const fixed = id => layout.obstacles.find(item => item.id === id);
  const roomPlacements = () => previewPlacements ?? live?.durable.room?.placements ?? [];

  const colour = name => PALETTE[name] ?? PALETTE.amber;
  function mat(hex) { if (!materials.has(hex)) materials.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.91 })); return materials.get(hex); }
  function box(w, h, d, x, y, z, hex, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(r, h, x, y, z, hex, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat(hex)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function label(text, point, kind = '') {
    const el = document.createElement('span'); el.className = 'house-world-label ' + kind; el.textContent = text; el.title = text; el.setAttribute('aria-label', text);
    el.style.cssText = 'position:absolute;transform:translate(-50%,-100%);background:#fff4dfec;border:1px solid #8c755e80;border-radius:9px;padding:4px 7px;color:#473e35;font:600 11px/1.25 system-ui,sans-serif;max-width:160px;text-align:center;box-shadow:0 2px 7px #4e3f3420;white-space:pre-line;width:max-content;box-sizing:border-box;overflow-wrap:anywhere;overflow:hidden;';
    overlay.append(el); const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('stroke', '#f4e4c3bb'); line.setAttribute('stroke-width', '1.5'); line.style.display = 'none'; leaderLayer.append(line);
    const entry = { el, point, baseText: text, kind, line, size: { w: kind === 'chat-bubble' ? 160 : 108, h: kind === 'chat-bubble' ? 38 : 34 }, sizeDirty: true, previous: null, screenRect: null }; sizeLabel(entry); labels.push(entry); labelEntries.set(el, entry); dimensionObserver.observe(el, { box: 'border-box' }); layoutDirty = true; return el;
  }
  function updateLabel(el, text, kind = labelEntries.get(el).kind) {
    const entry = labelEntries.get(el);
    if (entry.baseText === text && entry.kind === kind) return;
    el.textContent = text; el.title = text; el.setAttribute('aria-label', text);
    el.className = 'house-world-label ' + kind;
    entry.baseText = text; entry.kind = kind; entry.sizeDirty = true; layoutDirty = true;
  }
  function pickable(group, target) { group.traverse(o => { o.userData.target = target; }); pickTargets.push({ point: new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()), target }); }
  function clearScene() {
    selfFrameGeometry = null;
    scene?.traverse(o => { o.geometry?.dispose(); if (o.material?.isMeshBasicMaterial) o.material.dispose(); if (o.isLight) o.shadow?.dispose(); });
    dimensionObserver.disconnect(); pickTargets.length = 0; delete canvas.dataset.pickTargets; delete canvas.dataset.selfMeshBounds; labels.length = 0; avatars.clear(); doors.clear(); roomLabel = null; leaderLayer.replaceChildren(); overlay.replaceChildren(leaderLayer); selection = null; layoutDirty = true;
  }
  function plant(parent, x = 0, z = 0, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
    cylinder(0.23, 0.35, 0, 0.18, 0, '#b98a6a', g); cylinder(0.035, 0.56, 0, 0.57, 0, '#70815b', g);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.25, 7, 5), mat(i % 2 ? '#95a480' : '#738866'));
      leaf.scale.set(0.45, 1.1, 0.7); leaf.position.set(Math.sin(i) * 0.08, 0.65 + i * 0.035, Math.cos(i) * 0.1); leaf.rotation.z = Math.sin(i) * 0.35; g.add(leaf);
    }
  }
  function lamp(parent, x = 0, z = 0) {
    cylinder(0.19, 0.06, x, 0.04, z, '#806b55', parent); cylinder(0.035, 1.35, x, 0.72, z, '#806b55', parent);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.37, 12, 1, true), mat('#efd4a0')); shade.position.set(x, 1.5, z); parent.add(shade);
    const glow = new THREE.PointLight('#ffe3ac', 4, 4, 2); glow.position.set(x, 1.35, z); parent.add(glow);
  }
  function chair(parent, accent) {
    box(0.75, 0.17, 0.73, 0, FURNITURE_HEIGHTS.chairSeat - 0.12, 0, '#9d7b5e', parent); box(0.65, 0.12, 0.62, 0, FURNITURE_HEIGHTS.chairSeat - 0.06, 0, accent, parent);
    box(0.78, 0.62, 0.15, 0, 0.6, 0.325, '#b69a7a', parent); box(0.62, 0.4, 0.13, 0, 0.65, 0.23, accent, parent);
    for (const x of [-0.26, 0.26]) for (const z of [-0.26, 0.26]) box(0.08, 0.25, 0.08, x, 0.13, z, '#775f4b', parent);
  }
  function shelf(parent, w = 1.5, depth = 0.5, accent = '#ad9070') {
    box(w, 1.48, depth - 0.08, 0, 0.74, 0, '#987859', parent);
    for (let row = 0; row < 3; row++) {
      box(w, 0.06, depth, 0, 0.19 + row * 0.48, 0, accent, parent);
      for (let i = 0; i < 6; i++) box(w / 12, 0.25 + i % 2 * 0.04, depth * 0.52, -w * 0.37 + i * w / 6.6, 0.35 + row * 0.48, depth * 0.24, ['#889577', '#c49e87', '#d7c599'][i % 3], parent);
    }
  }
  function shell(palette = 'sage') {
    const { width, depth } = layout, rear = -depth / 2, side = -width / 2;
    box(width, 0.18, depth, 0, -0.12, 0, '#bda180');
    for (let x = side + 0.3; x < width / 2; x += 0.65) box(0.015, 0.006, depth, x, -0.018, 0, '#a98d6b');
    box(width + 0.1, 2.55, 0.12, 0, 1.2, rear - 0.05, '#e1d0b1');
    box(0.12, 2.55, depth + 0.1, side - 0.05, 1.2, 0, '#d7c7aa');
    box(width, 0.12, 0.14, 0, 0.05, rear + 0.09, '#af8d66');
    box(0.14, 0.12, depth, side + 0.09, 0.05, 0, '#af8d66');
    box(0.1, 0.22, depth, width / 2 + 0.05, 0.02, 0, '#d4c2a2');
    // A local rug anchors the table without filling every metre of the larger room.
    box(6.7, 0.025, 5.2, 0, 0.006, 0, colour(palette)); box(6.25, 0.012, 4.75, 0, 0.025, 0, '#dad2b9');
    for (let x = -2.9; x < 3; x += 0.38) box(0.1, 0.014, 0.15, x, 0.034, 2.62, '#eee1bf');
    canvas.dataset.roomWidth = String(width); canvas.dataset.roomDepth = String(depth);
  }
  function doorView(door) {
    const resident = live.durable.residents.find(r => r.slot === door.slot), g = new THREE.Group();
    g.position.set(door.x, 0, door.z); if (door.wall === 'side') g.rotation.y = Math.PI / 2; scene.add(g);
    box(1.32, 1.96, 0.15, 0, 0.97, 0.02, '#a88764', g); box(1.14, 1.8, 0.17, 0, 0.9, 0.1, '#cfb08b', g);
    box(0.83, 0.6, 0.025, 0, 1.3, 0.20, '#bc9b73', g); box(0.83, 0.62, 0.025, 0, 0.53, 0.20, '#bc9b73', g);
    cylinder(0.035, 0.08, 0.4, 0.95, 0.23, '#7f693f', g); const plaque = box(0.44, 0.18, 0.035, 0, 1.62, 0.23, resident ? colour(resident.colour) : '#d6cbb7', g);
    const self = resident?.id === live.durable.selfId;
    const text = resident ? resident.name + (self ? '\nYour room' : resident.open ? '\nDoor open' : '\nDoor closed') : 'Room ' + (door.slot + 1) + '\nVacant';
    const name = label(text, new THREE.Vector3(door.x, 2.1, door.z + 0.18), self ? 'own-door' : 'door');
    const target = { type: 'door', slot: door.slot, roomId: resident?.bedroomId };
    pickable(g, target); doors.set(door.slot, { plaque, name, target });
  }
  function syncResidents() {
    for (const [slot, entry] of doors) {
      const resident = live.durable.residents.find(r => r.slot === slot), self = resident?.id === live.durable.selfId;
      const text = resident ? resident.name + (self ? '\nYour room' : resident.open ? '\nDoor open' : '\nDoor closed') : 'Room ' + (slot + 1) + '\nVacant';
      updateLabel(entry.name, text, self ? 'own-door' : 'door');
      entry.plaque.material = mat(resident ? colour(resident.colour) : '#d6cbb7');
      // Raycast objects and projected pick targets share this same target object.
      entry.target.roomId = resident?.bedroomId;
    }
    if (roomLabel) updateLabel(roomLabel, (live.durable.residents.find(r => r.id === live.durable.room.ownerId)?.name ?? 'Resident') + "'s room");
  }
  function lounge() {
    layout.doors.forEach(doorView);
    layout.seats.forEach((seat, i) => {
      const g = new THREE.Group(); g.position.set(seat.x, 0, seat.z); g.rotation.y = seat.heading + Math.PI; scene.add(g); chair(g, Object.values(PALETTE)[i]);
      pickable(g, { type: 'seat', seatId: seat.id });
    });
    box(2.5, 0.15, 1.8, 0, FURNITURE_HEIGHTS.tableTop - 0.075, 0, '#b89469');
    for (const x of [-1.03, 1.03]) for (const z of [-0.7, 0.7]) box(0.1, 0.57, 0.1, x, 0.29, z, '#8f724f');
    box(0.65, 0.04, 0.45, -0.5, 0.765, 0.1, '#869578'); box(0.43, 0.03, 0.48, -0.41, 0.80, 0.07, '#efdfc0');
    cylinder(0.12, 0.15, 0.7, 0.80, 0.1, '#e8d8b8');
    const tea = new THREE.Group(); tea.position.set(fixed('tea-cabinet').x, 0, fixed('tea-cabinet').z); scene.add(tea);
    box(1.7, 0.75, 0.6, 0, 0.375, 0, '#9a7d5c', tea); box(1.78, 0.08, 0.65, 0, 0.79, 0, '#c4a783', tea); cylinder(0.17, 0.29, -0.2, 0.98, 0, '#efe0c0', tea);
    const teaLamp = new THREE.Group(); teaLamp.position.set(-0.55, 0.84, 0); teaLamp.scale.setScalar(0.5); tea.add(teaLamp); lamp(teaLamp);
    const books = new THREE.Group(); books.position.set(fixed('bookcase').x, 0, fixed('bookcase').z); scene.add(books); shelf(books, 1.5, 0.62);
    plant(scene, fixed('rear-pot').x, fixed('rear-pot').z, 1); lamp(scene, fixed('rear-lamp').x, fixed('rear-lamp').z);
    const couch = new THREE.Group(); couch.position.set(fixed('couch').x, 0, fixed('couch').z); scene.add(couch);
    box(1.9, 0.38, 0.9, 0, 0.32, 0, '#b59680', couch); box(1.65, 0.2, 0.69, 0, 0.55, -0.03, '#c9ac95', couch); box(1.9, 0.61, 0.18, 0, 0.65, 0.38, '#bba088', couch);
    for (const x of [-0.82, 0.82]) box(0.22, 0.39, 0.86, x, 0.58, 0, '#b99a85', couch);
    box(0.43, 0.12, 0.46, -0.47, 0.75, 0.08, '#adc0a0', couch);
    label('Conversation corner', new THREE.Vector3(fixed('couch').x, 1.17, fixed('couch').z), 'corner');
    const board = new THREE.Group(); board.position.set(fixed('board').x, 0, fixed('board').z); board.rotation.y = -Math.PI / 2; scene.add(board);
    box(2, 1.4, 0.1, 0, 1.5, 0, '#9c805e', board); box(1.82, 1.22, 0.11, 0, 1.5, 0.06, '#f3eee0', board);
    ['#e2cf96', '#c4d0b4', '#d7afa1'].forEach((hex, i) => box(0.43, 0.51, 0.025, (i - 1) * 0.52, 1.5 + (i % 2) * 0.14, 0.13, hex, board));
    pickable(board, { type: 'board' }); label('Shared board', new THREE.Vector3(fixed('board').x - 0.2, 2.33, fixed('board').z), 'board');
  }
  function furniture(p) {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.rotation * Math.PI / 2; scene.add(g); const accent = colour(p.colour);
    if (p.kind === 'chair') chair(g, accent);
    if (p.kind === 'plant') plant(g);
    if (p.kind === 'lamp') lamp(g);
    if (p.kind === 'shelf') shelf(g, 1.5, 0.5, accent);
    if (p.kind === 'desk') {
      box(2, 0.12, 1, 0, FURNITURE_HEIGHTS.deskTop - 0.06, 0, '#b89a75', g); for (const x of [-0.83, 0.83]) for (const z of [-0.34, 0.34]) box(0.1, 0.64, 0.1, x, 0.32, z, '#927758', g);
      box(0.65, 0.42, 0.06, 0.12, 0.96, -0.23, '#53625b', g); box(0.57, 0.34, 0.065, 0.12, 0.96, -0.19, accent, g); box(0.46, 0.03, 0.25, 0.12, 0.77, 0.09, '#e9dcc0', g);
    }
    if (p.kind === 'bed') {
      box(2, 0.44, 3, 0, 0.25, 0, '#a98b69', g); box(1.86, 0.26, 2.83, 0, 0.6, 0, '#f0e6d2', g); box(1.86, 0.11, 1.77, 0, 0.78, 0.48, accent, g);
      box(2, 0.96, 0.13, 0, 0.51, -1.43, '#a98b69', g); box(1.01, 0.13, 0.57, 0, 0.8, -0.96, '#faf1df', g);
    }
    pickable(g, { type: 'placement', id: p.id });
  }
  function bedroom() {
    roomPlacements().forEach(furniture);
    box(1.5, 0.027, 0.65, layout.exitTarget.x, 0.038, layout.exitTarget.z + 0.15, '#b3a891');
    label('Return to lounge', new THREE.Vector3(layout.exitTarget.x, 0.85, layout.exitTarget.z + 0.17), 'exit');
    roomLabel = label((live.durable.residents.find(r => r.id === live.durable.room.ownerId)?.name ?? 'Resident') + "'s room", new THREE.Vector3(-2.8, 2.28, -layout.depth / 2 + 0.9), 'room');
  }
  function rebuild() {
    clearScene(); scene = new THREE.Scene(); scene.background = new THREE.Color('#252e3e');
    scene.add(new THREE.HemisphereLight('#e4d9c6', '#758096', 1.05));
    const sun = new THREE.DirectionalLight('#ffe0ad', 1.75); sun.position.set(0, 9, 5); sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9; sun.shadow.normalBias = 0.035; scene.add(sun);
    layout = live?.durable.room ? bedroomLayout(roomPlacements()) : createLayout(live?.durable.house.capacity ?? 4);
    shell(live?.durable.room?.palette ?? 'sage'); if (live) { if (live.durable.room) bedroom(); else lounge(); }
    prompt = label('', () => new THREE.Vector3(own.x, 1.95, own.z), 'context'); prompt.hidden = true;
    resize(); if (live) syncPlayers(live);
  }
  function avatar(player) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); scene.add(root);
    const accent = colour(player.colour), garments = [cylinder(0.205, 0.43, 0, 0.73, 0, accent, body)];
    box(0.26, 0.065, 0.21, 0, 0.94, 0, '#f0dbc2', body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 10), mat('#ebc5a5')); head.position.set(0, 1.17, 0); head.castShadow = true; body.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.243, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.53), mat('#735745')); hair.position.set(0, 1.2, 0); body.add(hair);
    box(0.35, 0.065, 0.24, 0, 1.33, 0.10, '#735745', body);
    for (const x of [-0.081, 0.081]) box(0.025, 0.033, 0.02, x, 1.17, 0.223, '#473d35', body);
    box(0.057, 0.016, 0.017, 0, 1.07, 0.224, '#ad7866', body);
    const arms = [], legs = [], knees = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 0.25, 0.89, 0); body.add(arm); arms.push(arm);
      garments.push(box(0.12, 0.31, 0.14, 0, -0.15, 0, accent, arm)); cylinder(0.067, 0.09, 0, -0.34, 0, '#ebc5a5', arm);
      const leg = new THREE.Group(); leg.position.set(side * 0.11, 0.52, 0); body.add(leg); legs.push(leg);
      box(0.135, 0.22, 0.16, 0, -0.1, 0, '#626557', leg);
      const knee = new THREE.Group(); knee.position.y = -0.22; leg.add(knee); knees.push(knee);
      box(0.135, 0.16, 0.16, 0, -0.09, 0, '#626557', knee);
      box(0.15, 0.13, 0.27, 0, -0.21, 0.055, '#665345', knee);
    }
    const name = label('', () => new THREE.Vector3(root.position.x, 1.7 + root.position.y, root.position.z), 'avatar');
    const nameDisplay = document.createElement('span'), nameAvailability = document.createElement('span');
    nameDisplay.className = 'house-avatar-display-name'; nameDisplay.style.cssText = 'display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    nameAvailability.className = 'house-avatar-availability'; nameAvailability.style.display = 'block'; name.append(nameDisplay, nameAvailability);
    const bubble = label('', () => new THREE.Vector3(root.position.x, 2.23 + root.position.y, root.position.z), 'chat-bubble');
    bubble.style.boxSizing = 'border-box'; bubble.style.fontWeight = '400'; bubble.style.whiteSpace = 'normal'; bubble.hidden = true; bubble.dataset.playerId = player.id;
    const bubbleHeader = document.createElement('span'), speaker = document.createElement('span'), hint = document.createElement('span'), bubbleText = document.createElement('span');
    bubbleHeader.style.cssText = 'display:flex;gap:5px;align-items:center;height:16px;font:600 12px/16px system-ui;'; speaker.style.cssText = 'min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'; hint.className = 'house-bubble-hint'; hint.textContent = 'Chat ↗'; hint.style.cssText = 'flex:none;font:500 10px/16px system-ui;';
    bubbleText.className = 'house-bubble-text'; bubbleText.style.cssText = 'display:block;height:18px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'; bubbleHeader.append(speaker, hint); bubble.append(bubbleHeader, bubbleText);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.35, 24), new THREE.MeshBasicMaterial({ color: '#fff1cc', side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; root.add(ring); ring.visible = player.id === live.durable.selfId;
    root.position.set(player.x ?? layout.spawn.x, 0, player.z ?? layout.spawn.z);
    const entry = { root, body, arms, legs, knees, garments, accent, name, nameDisplay, nameAvailability, nameText: '', bubble, speaker, bubbleText, previewId: null, player, x: root.position.x, z: root.position.z }; avatars.set(player.id, entry); return entry;
  }
  function sizeLabel(item) {
    const phone = container.clientWidth < 700;
    item.el.style.fontSize = item.kind === 'chat-bubble' ? (phone ? '13px' : '14px') : item.kind === 'avatar' ? (phone ? '12px' : '13px') : (phone ? '11px' : '12px');
    item.el.style.padding = phone ? '3px 5px' : '4px 7px'; item.sizeDirty = true;
    if (item.kind === 'avatar') item.el.style.maxWidth = phone ? '100px' : '160px';
    if (item.kind === 'chat-bubble') { item.el.style.width = phone ? '184px' : '224px'; item.el.style.maxWidth = phone ? '184px' : '224px'; }
    if (item.kind === 'seat') { item.el.textContent = phone ? item.baseText.replace('Seat ', '') : item.baseText; item.el.setAttribute('aria-label', item.baseText); }
    if (item.kind === 'corner') item.el.textContent = phone ? 'Conversation' : item.baseText;
  }
  function resize() {
    const w = Math.max(container.clientWidth, 1), h = Math.max(container.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(w, h, false);
    labels.forEach(sizeLabel);
    layoutDirty = true;
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    camera.position.set(CAMERA_ORIENTATION.x, CAMERA_ORIENTATION.y, CAMERA_ORIENTATION.z); camera.lookAt(0, CAMERA_ORIENTATION.lookY, 0); canvas.dataset.cameraOrientation = JSON.stringify(CAMERA_ORIENTATION); camera.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    cameraCorners = [];
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) cameraCorners.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
    cameraBounds = { minX: Math.min(...cameraCorners.map(p => p.x)), maxX: Math.max(...cameraCorners.map(p => p.x)), minY: Math.min(...cameraCorners.map(p => p.y)), maxY: Math.max(...cameraCorners.map(p => p.y)) };
    const head = new THREE.Vector3(0, AVATAR_HEIGHT, 0).applyMatrix4(camera.matrixWorldInverse), foot = new THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
    cameraUprightHeight = Math.abs(head.y - foot.y);
    configureCamera(); updateCamera(0);
  }
  function configureCamera() {
    if (!cameraBounds) return;
    cameraRig.configure({ width: Math.max(container.clientWidth, 1), height: Math.max(container.clientHeight, 1), bounds: cameraBounds, uprightHeight: cameraUprightHeight, viewport: safeArea?.viewport, safeRects: safeArea?.safeRects ?? [] });
  }
  function cameraModeChanged() { callbacks.onCameraModeChange?.(cameraRig.getMode()); }
  function setCameraMode(mode) { if (cameraRig.setMode(mode)) { updateCamera(0); cameraModeChanged(); } }
  function updateCamera(dt) {
    if (!camera) return;
    const seated = !!self()?.seatId || self()?.animation === 'sit';
    const geometry = measureSelfGeometry();
    const point = geometry?.centre ?? new THREE.Vector3(own.x, AVATAR_HEIGHT / 2 + (seated ? SEATED_LIFT : 0), own.z).applyMatrix4(camera.matrixWorldInverse);
    const value = cameraRig.frame(point, dt, false, geometry?.extents);
    if (!value) return;
    camera.left = value.left; camera.right = value.right; camera.top = value.top; camera.bottom = value.bottom; camera.updateProjectionMatrix();
    if (value.changed) layoutDirty = true;
    canvas.dataset.cameraMode = value.mode; canvas.dataset.cameraZoom = String(value.zoom); canvas.dataset.cameraPlayArea = JSON.stringify(value.area);
    const projected = cameraCorners.map(p => ({ x: (p.x - camera.left) * value.pxPerUnit, y: (camera.top - p.y) * value.pxPerUnit }));
    canvas.dataset.worldLeft = Math.min(...projected.map(p => p.x)).toFixed(1); canvas.dataset.worldRight = Math.max(...projected.map(p => p.x)).toFixed(1);
    canvas.dataset.worldTop = Math.min(...projected.map(p => p.y)).toFixed(1); canvas.dataset.worldBottom = Math.max(...projected.map(p => p.y)).toFixed(1);
  }

  function self() { return live?.players.find(p => p.id === live.durable.selfId); }
  function canControl() { return !!live?.controller && !suspended && inputEnabled && !editing && !composing && !typing(document.activeElement); }
  function clearInput() { keys.clear(); direction = { x: 0, z: 0 }; route = []; routeTarget = null; }
  function targets() {
    if (!live) return [];
    if (live.durable.room) return [{ type: 'exit', point: layout.exitTarget, text: 'Return to lounge' }, ...layout.seats.map(s => ({ type: 'seat', seatId: s.id, point: s.target, text: 'Sit in chair' }))];
    return [
      ...layout.doors.map(d => { const r = live.durable.residents.find(r => r.slot === d.slot); return { type: 'door', slot: d.slot, roomId: r?.bedroomId, point: d.target, text: r ? (r.id === live.durable.selfId ? 'Enter your room' : 'Visit ' + r.name) : 'Vacant room' }; }),
      ...layout.seats.map((s, i) => ({ type: 'seat', seatId: s.id, point: s.target, text: 'Sit at seat ' + (i + 1) })),
      { type: 'board', point: layout.boardTarget, text: 'Open shared board' },
    ];
  }
  function action(target) {
    if (!canControl()) return false;
    const { point, text, ...command } = target; callbacks.onInteract?.(command); return true;
  }
  function interact() {
    if (!canControl()) return false;
    const seated = self()?.seatId;
    if (seated) { callbacks.onInteract?.({ type: 'seat', seatId: seated }); return true; }
    const nearby = targets().filter(t => Math.hypot(own.x - t.point.x, own.z - t.point.z) <= 1.2).sort((a, b) => Math.hypot(own.x - a.point.x, own.z - a.point.z) - Math.hypot(own.x - b.point.x, own.z - b.point.z));
    return nearby[0] ? action(nearby[0]) : false;
  }
  function approach(request) {
    if (!canControl() || self()?.seatId) return false;
    const target = targets().find(t => t.type === request.type && (request.slot === undefined || t.slot === request.slot) && (request.seatId === undefined || t.seatId === request.seatId));
    if (!target) return false;
    const found = findRoute(layout, own, target.point); if (!found) return false;
    route = found; routeTarget = target; keys.clear(); direction = { x: 0, z: 0 }; return true;
  }
  function update(next) {
    if (!next) { pendingEditFraming = false; cameraRig.setMode('play'); cameraRig.reset(); speech.clear(); live = null; inputEnabled = false; previewPlacements = null; renderKey = ''; clearInput(); sent = null; pendingStand = false; own = { x: 0, z: 2.85 }; rebuild(); callbacks.onHint?.(''); lastHint = ''; for (const key of ['selfX', 'selfZ', 'zoneId', 'selfAnimation']) delete canvas.dataset[key]; return; }
    const previous = live, changedZone = previous?.durable.zoneId !== next.durable.zoneId || previous?.durable.streamId !== next.durable.streamId;
    const changedIdentity = previous?.serverEpoch !== next.serverEpoch || previous?.durable.house.id !== next.durable.house.id || previous?.durable.selfId !== next.durable.selfId;
    const changedControl = previous?.generation !== next.generation || previous?.controller !== next.controller || previous?.accessGeneration !== next.accessGeneration;
    live = next;
    const p = self();
    speech.ingest([next.serverEpoch, next.durable.selfId, next.durable.house.id, next.durable.zoneId, next.accessGeneration, next.generation].join('/'), next.durable.chat, { quiet: p?.availability !== 'chat', visibleAuthors: new Set(next.players.filter(player => player.connected && player.zoneId === next.durable.zoneId).map(player => player.id)) }, window.performance.now());
    if (changedZone || changedIdentity || changedControl) { pendingEditFraming = false; if (changedZone || changedIdentity) cameraRig.setMode('play'); cameraRig.reset(); if (changedZone || changedIdentity) previewPlacements = null; clearInput(); sent = null; pendingStand = false; own = { x: p?.x ?? (next.durable.room ? 0 : layout.spawn.x), z: p?.z ?? (next.durable.room ? 3 : 2.85) }; }
    if (p && (previous?.players.find(q => q.id === previous.durable.selfId)?.seatId && !p.seatId || p.animation === 'sit' || p.seatId || !next.controller || !previous)) own = { x: p.x ?? own.x, z: p.z ?? own.z };
    if (!p?.seatId) pendingStand = false;
    if (p && next.controller && Number.isFinite(p.x) && Number.isFinite(p.z) && Math.hypot(p.x - own.x, p.z - own.z) > 1.15) { own = { x: p.x, z: p.z }; clearInput(); }
    // Resident metadata changes keep the room's geometry and shadow resources.
    // Authority, zone and full room changes still clear all prior scene content.
    const key = JSON.stringify([next.serverEpoch, next.durable.house.id, next.durable.selfId, next.accessGeneration, next.generation, next.durable.house.capacity, next.durable.zoneId, next.durable.streamId, next.durable.room]);
    if (key !== renderKey) { renderKey = key; rebuild(); }
    // A queued visit belongs to the bedroom chosen when the route began.
    if (routeTarget?.type === 'door' && routeTarget.roomId !== next.durable.residents.find(r => r.slot === routeTarget.slot)?.bedroomId) { route = []; routeTarget = null; }
    syncResidents(); syncPlayers(next);
  }
  function syncPlayers(next) {
    const visible = next.players.filter(p => p.connected && p.zoneId === next.durable.zoneId);
    const ids = new Set(visible.map(p => p.id));
    for (const [id, entry] of avatars) if (!ids.has(id)) {
      dimensionObserver.unobserve?.(entry.name); dimensionObserver.unobserve?.(entry.bubble); scene.remove(entry.root); entry.root.traverse(o => { o.geometry?.dispose(); if (o.material?.isMeshBasicMaterial) o.material.dispose(); }); labelEntries.get(entry.name)?.line.remove(); labelEntries.get(entry.bubble)?.line.remove(); entry.name.remove(); entry.bubble.remove(); avatars.delete(id); layoutDirty = true;
      for (let i = labels.length - 1; i >= 0; i--) if (labels[i].el === entry.name || labels[i].el === entry.bubble) labels.splice(i, 1);
    }
    for (const p of visible) { const entry = avatars.get(p.id) ?? avatar(p), accent = colour(p.colour);
      if (entry.accent !== accent) { entry.accent = accent; for (const mesh of entry.garments) mesh.material = mat(accent); }
      entry.player = p; entry.name.dataset.playerId = p.id; entry.name.dataset.name = p.name; entry.name.dataset.availability = p.availability; entry.name.dataset.connected = String(p.connected); entry.name.classList.add('house-avatar-name'); const nameText = p.name + (p.id === next.durable.selfId ? ' (you)' : '') + '\n' + (p.availability === 'chat' ? 'Can chat' : 'Quiet'); if (entry.nameText !== nameText) { entry.nameText = nameText; entry.nameDisplay.textContent = p.name + (p.id === next.durable.selfId ? ' (you)' : ''); entry.nameAvailability.textContent = p.availability === 'chat' ? 'Can chat' : 'Quiet'; entry.name.title = nameText; entry.name.setAttribute('aria-label', nameText); labelEntries.get(entry.name).sizeDirty = true; layoutDirty = true; } entry.name.dataset.availabilitySetAt = String(p.availabilitySetAt); }
  }
  function animate(time) {
    if (disposed || suspended) return;
    // Collision substeps and route clamping preserve speed when rendering is slow.
    const dt = lastFrame === null ? 0 : Math.min(Math.max((time - lastFrame) / 1000, 0), 0.25); lastFrame = time;
    let dx = direction.x, dz = direction.z;
    for (const key of keys) { dx += KEY[key][0]; dz += KEY[key][1]; }
    const p = self(), active = canControl();
    let moving = false, distanceToWaypoint = Infinity;
    if (active && p?.seatId && (dx || dz) && !pendingStand) { pendingStand = true; callbacks.onInteract?.({ type: 'seat', seatId: p.seatId }); }
    if (active && !p?.seatId) {
      if (dx || dz) {
        route = []; routeTarget = null; const length = Math.hypot(dx, dz); dx /= length; dz /= length;
        const yaw = Math.atan2(CAMERA_ORIENTATION.x, CAMERA_ORIENTATION.z), sx = dx, sz = dz;
        dx = sx * Math.cos(yaw) + sz * Math.sin(yaw); dz = -sx * Math.sin(yaw) + sz * Math.cos(yaw);
      }
      else if (route.length) {
        while (route.length && Math.hypot(route[0].x - own.x, route[0].z - own.z) < 0.045) route.shift();
        if (route.length) { const next = route[0], length = Math.hypot(next.x - own.x, next.z - own.z); dx = (next.x - own.x) / length; dz = (next.z - own.z) / length; distanceToWaypoint = length; }
        else { const arrived = routeTarget; routeTarget = null; if (arrived) action(arrived); }
      }
      if (dx || dz) { const before = own; const stride = Math.min(dt * 2.6, distanceToWaypoint); own = slide(layout, own, dx * stride, dz * stride); moving = Math.hypot(own.x - before.x, own.z - before.z) > 0.0001; if (moving) heading = Math.atan2(dx, dz); }
    }
    if (live?.controller && !p?.seatId && time - lastSent >= 100) {
      const motion = { x: own.x, z: own.z, heading, animation: moving ? 'walk' : 'idle' };
      if (sent && (Math.hypot(sent.x - own.x, sent.z - own.z) > 0.005 || sent.animation !== motion.animation) || !sent && moving) { callbacks.onMove?.(motion); lastSent = time; sent = motion; }
    }
    for (const [id, entry] of avatars) {
      const state = entry.player, local = id === live.durable.selfId && live.controller;
      const seated = state.animation === 'sit' || !!state.seatId;
      const targetX = local ? own.x : state.x ?? layout.spawn.x, targetZ = local ? own.z : state.z ?? layout.spawn.z;
      const blend = local || reduced || Math.hypot(targetX - entry.x, targetZ - entry.z) > 2 ? 1 : 1 - Math.exp(-dt * 12);
      entry.x += (targetX - entry.x) * blend; entry.z += (targetZ - entry.z) * blend;
      entry.root.position.set(entry.x, seated ? SEATED_LIFT : 0, entry.z); entry.name.dataset.x = entry.x.toFixed(3); entry.name.dataset.z = entry.z.toFixed(3);
      const yaw = local && !seated ? heading : state.heading ?? 0; entry.body.rotation.y = yaw;
      const walk = !seated && (local ? moving : state.animation === 'walk'); const swing = walk ? Math.sin(time * 0.011) * 0.55 : 0;
      entry.legs[0].rotation.x = seated ? -Math.PI / 3 : swing; entry.legs[1].rotation.x = seated ? -Math.PI / 3 : -swing; entry.knees.forEach(knee => { knee.rotation.x = seated ? Math.PI / 3 : 0; });
      entry.arms[0].rotation.x = seated ? -0.85 : -swing * 0.65; entry.arms[1].rotation.x = seated ? -0.85 : swing * 0.65;
      entry.body.position.y = !reduced && walk ? Math.abs(Math.sin(time * 0.011)) * 0.035 : 0;

    }
    if (live) {
      const nearest = targets().filter(t => Math.hypot(own.x - t.point.x, own.z - t.point.z) <= 1.2).sort((a, b) => Math.hypot(own.x - a.point.x, own.z - a.point.z) - Math.hypot(own.x - b.point.x, own.z - b.point.z))[0];
      canvas.dataset.selfX = own.x.toFixed(3); canvas.dataset.selfZ = own.z.toFixed(3); canvas.dataset.zoneId = live.durable.zoneId; canvas.dataset.selfAnimation = p?.seatId ? 'sit' : moving ? 'walk' : 'idle';
      context = p?.seatId ? 'E · Stand up' : nearest ? 'E · ' + nearest.text : null;
      if (prompt.textContent !== (context ?? '')) { prompt.textContent = context ?? ''; labelEntries.get(prompt).sizeDirty = true; layoutDirty = true; } prompt.hidden = !context || !active;
      const hint = active ? context ?? 'WASD / arrows to walk · E near a door, seat or board' : editing ? 'Select a piece to arrange your room' : live.controller ? '' : 'Observer · control is active in another tab';
      if (hint !== lastHint) { lastHint = hint; callbacks.onHint?.(hint); }
    }
    updateCamera(dt);
    recordProjection();
    renderer.render(scene, camera);
    updateSpeech(window.performance.now());
    placeLabels(time);
    frame = requestAnimationFrame(animate);
  }
  function recordProjection() {
    canvas.dataset.pickTargets = JSON.stringify(pickTargets.map(entry => { const point = entry.point.clone().project(camera); return { target: entry.target, x: (point.x * 0.5 + 0.5) * container.clientWidth, y: (-point.y * 0.5 + 0.5) * container.clientHeight, visible: point.x >= -1 && point.x <= 1 && point.y >= -1 && point.y <= 1 && point.z >= -1 && point.z <= 1 }; }));
    const entry = avatars.get(live?.durable.selfId);
    if (!entry) { for (const key of ['selfScreenX', 'selfScreenY', 'selfAvatarHeight', 'selfMeshBounds']) delete canvas.dataset[key]; return; }
    const head = new THREE.Vector3(entry.x, AVATAR_HEIGHT + entry.root.position.y, entry.z).project(camera);
    const foot = new THREE.Vector3(entry.x, entry.root.position.y, entry.z).project(camera);
    canvas.dataset.selfScreenX = ((head.x * 0.5 + 0.5) * container.clientWidth).toFixed(2);
    canvas.dataset.selfScreenY = (((-head.y - foot.y) * 0.25 + 0.5) * container.clientHeight).toFixed(2);
    canvas.dataset.selfAvatarHeight = (Math.abs(head.y - foot.y) * container.clientHeight / 2).toFixed(2);
    // Reuse the exact camera-view mesh pass used by framing in this same posed frame.
    const geometry = selfFrameGeometry ?? measureSelfGeometry();
    if (!geometry) { delete canvas.dataset.selfMeshBounds; return; }
    const scaleX = container.clientWidth / (camera.right - camera.left), scaleY = container.clientHeight / (camera.top - camera.bottom);
    const bounds = geometry.mesh;
    canvas.dataset.selfMeshBounds = JSON.stringify({
      left: (bounds.minX - camera.left) * scaleX, right: (bounds.maxX - camera.left) * scaleX,
      top: (camera.top - bounds.maxY) * scaleY, bottom: (camera.top - bounds.minY) * scaleY,
    });
  }
  function measureSelfGeometry() {
    const entry = avatars.get(live?.durable.selfId);
    if (!entry || !camera) { selfFrameGeometry = null; return null; }
    entry.root.updateMatrixWorld(true);
    const view = camera.matrixWorldInverse;
    const centre = new THREE.Vector3(entry.x, AVATAR_HEIGHT / 2 + entry.root.position.y, entry.z).applyMatrix4(view);
    const head = new THREE.Vector3(entry.x, AVATAR_HEIGHT + entry.root.position.y, entry.z).applyMatrix4(view);
    const foot = new THREE.Vector3(entry.x, entry.root.position.y, entry.z).applyMatrix4(view);
    const mesh = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }, vertex = new THREE.Vector3();
    entry.root.traverse(object => {
      if (!object.isMesh || !object.visible) return;
      const positions = object.geometry.getAttribute('position'); if (!positions) return;
      for (let index = 0; index < positions.count; index++) {
        vertex.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld).applyMatrix4(view);
        mesh.minX = Math.min(mesh.minX, vertex.x); mesh.maxX = Math.max(mesh.maxX, vertex.x);
        mesh.minY = Math.min(mesh.minY, vertex.y); mesh.maxY = Math.max(mesh.maxY, vertex.y);
      }
    });
    // The contract includes actual limbs/ring and the upright head/foot diagnostic.
    const extents = {
      minX: Math.min(mesh.minX, head.x, foot.x) - centre.x, maxX: Math.max(mesh.maxX, head.x, foot.x) - centre.x,
      minY: Math.min(mesh.minY, head.y, foot.y) - centre.y, maxY: Math.max(mesh.maxY, head.y, foot.y) - centre.y,
    };
    selfFrameGeometry = { centre, mesh, extents }; return selfFrameGeometry;
  }
  function updateSpeech(now) {
    const visible = speech.visible(now), byAuthor = new Map(visible.map((preview, index) => [preview.authorId, { ...preview, rank: index }]));
    for (const [id, entry] of avatars) {
      const preview = byAuthor.get(id), item = labelEntries.get(entry.bubble);
      if (preview && entry.bubble.dataset.rank !== String(preview.rank)) { entry.bubble.dataset.rank = String(preview.rank); layoutDirty = true; }
      if (entry.bubble.hidden !== !preview) { entry.bubble.hidden = !preview; layoutDirty = true; }
      if (preview && (entry.previewId !== preview.id || entry.speaker.textContent !== entry.player.name)) {
        entry.previewId = preview.id; entry.speaker.textContent = entry.player.name; entry.bubbleText.textContent = preview.preview;
        entry.bubble.dataset.messageId = preview.id; entry.bubble.dataset.rank = String(preview.rank); entry.bubble.title = 'Full message in Chat'; entry.bubble.setAttribute('aria-label', entry.player.name + ': ' + preview.preview + '. Full message in Chat.'); item.sizeDirty = true; layoutDirty = true;
      }
      if (!preview) { entry.previewId = null; entry.speaker.textContent = ''; entry.bubbleText.textContent = ''; entry.bubble.removeAttribute('data-message-id'); item.line.style.display = 'none'; }
    }
  }
  function placeLabels(time) {
    const width = container.clientWidth, height = container.clientHeight;
    // Batched dimension reads happen only after text/style changes, never once per label per frame.
    const measurements = labels.filter(item => item.sizeDirty && !item.el.hidden).map(item => ({ item, rect: item.el.getBoundingClientRect() }));
    for (const { item, rect } of measurements) { if (rect.width > 0 && rect.height > 0) item.size = { w: rect.width, h: rect.height }; item.sizeDirty = false; }
    const people = [], blockers = [...(safeArea?.safeRects ?? [])];
    for (const item of labels) {
      const vector = typeof item.point === 'function' ? item.point() : item.point.clone(); vector.project(camera);
      const x = (vector.x * 0.5 + 0.5) * width, y = (-vector.y * 0.5 + 0.5) * height;
      const dynamic = item.kind === 'avatar' || item.kind === 'chat-bubble';
      if (dynamic) {
        if (item.el.hidden || vector.z < -1 || vector.z > 1 || vector.x < -1 || vector.x > 1 || vector.y < -1 || vector.y > 1) { item.el.style.visibility = 'hidden'; item.line.style.display = 'none'; continue; }
        people.push({ id: item.kind + ':' + item.el.dataset.playerId, item, anchor: { x, y }, ...item.size, priority: item.kind === 'avatar' ? 100 : 50 - Number(item.el.dataset.rank ?? 0), previous: item.previous && item.previousAnchor ? { ...item.previous, x: item.previous.x + x - item.previousAnchor.x + (item.previous.w - item.size.w) / 2, y: item.previous.y + y - item.previousAnchor.y + item.previous.h - item.size.h, ...item.size } : null });
      } else {
        const left = Math.max(item.size.w / 2 + 8, Math.min(width - item.size.w / 2 - 8, x));
        item.el.style.left = left + 'px'; item.el.style.top = y + 'px';
        const rect = { x: left - item.size.w / 2, y: y - item.size.h, ...item.size }, clip = safeArea?.viewport ?? { left: 8, top: 65, right: width - 8, bottom: height - 65 };
        const occluded = (safeArea?.safeRects ?? []).some(control => rect.x < control.x + control.w + 5 && rect.x + rect.w + 5 > control.x && rect.y < control.y + control.h + 5 && rect.y + rect.h + 5 > control.y);
        const visible = !item.el.hidden && vector.z >= -1 && vector.z <= 1 && vector.x >= -1 && vector.x <= 1 && vector.y >= -1 && vector.y <= 1 && rect.x >= clip.left && rect.y >= clip.top && rect.x + rect.w <= clip.right && rect.y + rect.h <= clip.bottom && !occluded;
        item.el.style.visibility = visible ? 'visible' : 'hidden';
        if (visible && ['door', 'own-door', 'board', 'exit', 'context'].includes(item.kind)) blockers.push(rect);
      }
    }
    if (!layoutDirty && time - lastLabelLayout < 100) return;
    const phone = width < 700;
    const requested = safeArea?.viewport ?? { left: 8, top: Math.min(phone ? 185 : 180, height * 0.24), right: width - 8, bottom: Math.max(Math.min(phone ? 185 : 180, height * 0.24) + 100, height - (phone ? 284 : 160)) };
    const viewport = { left: Math.max(8, requested.left), top: Math.max(8, requested.top), right: Math.min(width - 8, requested.right), bottom: Math.min(height - 8, requested.bottom) };
    const placements = layoutLabels(people, viewport, blockers);
    for (let i = 0; i < placements.length; i++) {
      const placed = placements[i], item = people[i].item; item.previous = placed.hidden ? null : placed.rect; item.previousAnchor = { ...placed.anchor };
      item.el.style.visibility = placed.hidden ? 'hidden' : 'visible';
      item.el.style.left = placed.rect.x + placed.rect.w / 2 + 'px'; item.el.style.top = placed.rect.y + placed.rect.h + 'px';
      item.el.dataset.labelX = placed.rect.x.toFixed(1); item.el.dataset.labelY = placed.rect.y.toFixed(1);
      const endX = placed.rect.x + placed.rect.w / 2, endY = placed.rect.y + placed.rect.h;
      const shifted = !placed.hidden && Math.hypot(endX - placed.anchor.x, endY - placed.anchor.y) > 8;
      item.line.style.display = shifted ? '' : 'none'; item.line.setAttribute('x1', String(endX)); item.line.setAttribute('y1', String(endY)); item.line.setAttribute('x2', String(placed.anchor.x)); item.line.setAttribute('y2', String(placed.anchor.y));
    }
    layoutDirty = false; lastLabelLayout = time;
  }
  function keydown(event) {
    if (event.isComposing || composing || typing(event.target) || !canControl()) return;
    const key = KEY[event.key] ? event.key : event.key.toLowerCase();
    if (KEY[key]) { event.preventDefault(); keys.add(key); }
    else if (key === 'e' && !event.repeat) { event.preventDefault(); interact(); }
  }
  function keyup(event) { const key = KEY[event.key] ? event.key : event.key.toLowerCase(); keys.delete(key); }
  function focusin(event) { if (typing(event.target)) clearInput(); }
  function compositionstart() { composing = true; clearInput(); }
  function compositionend() { composing = false; }
  function pick(event) {
    if (suspended || !live || !camera || (!inputEnabled && !editing) || !live.controller) return;
    canvas.focus({ preventScroll: true }); if (composing) return;
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children, true).find(h => h.object.userData.target); if (!hit) return;
    const target = hit.object.userData.target;
    if (editing && target.type === 'placement') {
      callbacks.onSelectPlacement?.(target.id);
      if (selection) { scene.remove(selection); selection.geometry.dispose(); selection.material.dispose(); }
      const placement = roomPlacements().find(p => p.id === target.id); if (!placement) return;
      const rect = footprint(placement); selection = new THREE.Mesh(new THREE.BoxGeometry(rect.w + 0.1, 0.025, rect.d + 0.1), new THREE.MeshBasicMaterial({ color: '#fff1bd', wireframe: true })); selection.position.set(rect.x, 0.08, rect.z); scene.add(selection);
    } else if (!editing && target.type !== 'placement') approach(target);
  }
  function pointerdown(event) {
    if (suspended || !live || composing || (event.button !== undefined && ![0, 1, 2].includes(event.button))) return;
    canvas.focus({ preventScroll: true });
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, dragging: event.button === 1 || event.button === 2 };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointermove(event) {
    if (!gesture || event.pointerId !== gesture.id || suspended) return;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) {
      gesture.dragging = true; clearInput();
    }
    if (gesture.dragging && cameraRig.pan(event.clientX - gesture.x, event.clientY - gesture.y)) { updateCamera(0); cameraModeChanged(); }
    gesture.x = event.clientX; gesture.y = event.clientY;
  }
  function pointerup(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const click = !gesture.dragging; gesture = null;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture?.(event.pointerId);
    if (click) pick(event);
  }
  function pointercancel() { gesture = null; }
  function wheel(event) {
    if (suspended || !live || composing) return;
    // Listener belongs to the canvas: wheel events on chat/settings never zoom the world.
    event.preventDefault(); cameraRig.setZoom(cameraRig.getZoom() * Math.exp(-event.deltaY * 0.001));
    updateCamera(0); layoutDirty = true; cameraModeChanged();
  }
  function setSuspended(value) {
    if (suspended === !!value) return;
    suspended = !!value; clearInput(); gesture = null; lastFrame = null;
    if (suspended) cancelAnimationFrame(frame);
    else if (!disposed) frame = requestAnimationFrame(animate);
    canvas.dataset.suspended = String(suspended);
  }
  const listeners = [[window, 'keydown', keydown], [window, 'keyup', keyup], [window, 'blur', clearInput], [document, 'focusin', focusin], [document, 'visibilitychange', () => { if (document.hidden) clearInput(); }], [document, 'compositionstart', compositionstart], [document, 'compositionend', compositionend], [canvas, 'pointerdown', pointerdown], [canvas, 'pointermove', pointermove], [canvas, 'pointerup', pointerup], [canvas, 'pointercancel', pointercancel], [canvas, 'wheel', wheel], [canvas, 'contextmenu', event => event.preventDefault()], [window, 'resize', resize]];
  listeners.forEach(([element, type, listener]) => element.addEventListener(type, listener));
  const observer = new ResizeObserver(resize); observer.observe(container);
  rebuild(); frame = requestAnimationFrame(animate);
  return {
    update, resize, interact, approach, setCameraMode, getCameraMode: () => cameraRig.getMode(),
    setCameraZoom(value) { if (cameraRig.setZoom(value)) { updateCamera(0); layoutDirty = true; return true; } return false; },
    getCameraZoom: () => cameraRig.getZoom(),
    recenterCamera() { cameraRig.recenter(); updateCamera(0); cameraModeChanged(); },
    setReducedMotion(value) { reduced = !!value; cameraRig.setReducedMotion(reduced); },
    setSuspended,
    setLabelSafeArea(value) { const nextArea = value ? { viewport: value.viewport ? { ...value.viewport } : null, safeRects: (value.safeRects ?? []).map(rect => ({ ...rect })) } : null; if (pendingEditFraming || JSON.stringify(nextArea) !== JSON.stringify(safeArea)) { safeArea = nextArea; configureCamera(); if (pendingEditFraming) { cameraRig.reset(); pendingEditFraming = false; } updateCamera(0); layoutDirty = true; } },
    setRoomPreview(placements) { previewPlacements = placements === null ? null : placements.map(p => ({ ...p })); if (live?.durable.room) rebuild(); },
    getPosition: () => ({ ...own }),
    setDirection(x, z) { if (suspended || !Number.isFinite(x) || !Number.isFinite(z)) return; if ((x || z) && inputEnabled && live?.controller && !editing) canvas.focus({ preventScroll: true }); route = []; routeTarget = null; direction = { x: Math.max(-1, Math.min(1, x)), z: Math.max(-1, Math.min(1, z)) }; },
    setInputEnabled(value) { inputEnabled = !!value; if (!inputEnabled) clearInput(); },
    setEditing(value) { const changed = editing !== !!value; editing = !!value; clearInput(); if (changed) {
        if (editing) { pendingEditFraming = false; previousEditMode = cameraRig.getMode(); cameraRig.setMode('inspection'); }
        else {
          const restoreMode = previousEditMode ?? 'play'; cameraRig.setMode(restoreMode);
          // UI closes the editor before its next HUD measurement removes the panel.
          // Refitting belongs to that explicit editing handoff, not a movable chat window.
          pendingEditFraming = restoreMode !== 'inspection'; previousEditMode = null;
        }
        updateCamera(0); cameraModeChanged();
      } if (!editing && selection) { scene.remove(selection); selection.geometry.dispose(); selection.material.dispose(); selection = null; } },
    dispose() { if (disposed) return; disposed = true; speech.clear(); cancelAnimationFrame(frame); observer.disconnect(); dimensionObserver.disconnect(); listeners.forEach(([element, type, listener]) => element.removeEventListener(type, listener)); clearScene(); for (const material of materials.values()) material.dispose(); renderer.dispose(); canvas.remove(); overlay.remove(); },
  };
}
