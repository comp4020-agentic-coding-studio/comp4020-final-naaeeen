import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODEL_FILES = {
  chair: '/assets/kaykit/chair_A.gltf',
  table: '/assets/kaykit/table_medium.gltf',
  lamp: '/assets/kaykit/lamp_standing.gltf',
};
const PALETTE = { amber: '#ffc47b', rose: '#f391a8', mint: '#a0d8b3', sky: '#99c8e6', violet: '#c7a3ec' };
const LOOK_AT = new THREE.Vector3(0, 0.8, 0);

/** Fixed cutaway room: only the server projection is rendered; this module never mutates shared state. */
export async function createRenderer(container, {
  onSelect = () => {}, onMetrics = () => {}, onReady = () => {}, onError = () => {},
  mode = 'camera-fixed', pixelScale = 2,
} = {}) {
  const startedAt = performance.now();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#152039');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (error) {
    onError(error);
    throw error;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // A CSS-sized pixel is the comparison baseline, regardless of display DPR.
  renderer.setPixelRatio(1);
  const canvas = renderer.domElement;
  canvas.className = 'scene-canvas three-scene';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Your saved cutaway room and the shared lantern. The decorative figure represents your window, not live presence. Select furniture here or use the object list.');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'pan-y';
  container.append(canvas);

  const fixedCamera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 80);
  fixedCamera.position.set(10, 9.3, 12);
  fixedCamera.lookAt(LOOK_AT);
  const orbitCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  const initialOrbitDirection = new THREE.Vector3(10, 9.3 - LOOK_AT.y, 12).normalize();
  let activeCamera = fixedCamera;
  let controls = null;
  let currentMode = 'camera-fixed';
  let currentView = 'room';
  let currentPixelScale = 2;
  let currentSelection = null;
  let hasState = false;
  let disposed = false;
  let frameId = 0;
  let readyAt = null;
  let lastFrameAt = null;
  let metricStartedAt = performance.now();
  let frameIntervals = [];
  let renderTimes = [];
  let dimensions = { width: 1, height: 1 };
  let modelStatus = 'loading';
  let contextLost = false;
  let publishedPartCount = 0;
  const windowAccents = [];
  let visitorFigure = null;
  const furniture = new Map();
  const templates = new Map();
  const resourceRoots = new Set([scene]);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitSphere = new THREE.IcosahedronGeometry(1, 1);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const materials = new Map();

  function material(colour, extra = {}) {
    const key = JSON.stringify([colour, extra]);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85, ...extra }));
    return materials.get(key);
  }
  function mesh(geometry, surface, x, y, z, sx = 1, sy = 1, sz = 1, parent = scene) {
    const item = new THREE.Mesh(geometry, surface);
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function box(colour, x, y, z, width, height, depth, parent = scene, extra = {}) {
    return mesh(unitBox, material(colour, extra), x, y, z, width, height, depth, parent);
  }
  function sphere(colour, x, y, z, rx, ry = rx, rz = rx, parent = scene, extra = {}) {
    return mesh(unitSphere, material(colour, extra), x, y, z, rx, ry, rz, parent);
  }
  function cylinder(colour, x, y, z, radius, height, parent = scene, extra = {}) {
    return mesh(unitCylinder, material(colour, extra), x, y, z, radius, height, radius, parent);
  }

  function buildPlant() {
    const plant = new THREE.Group();
    const pot = new THREE.CylinderGeometry(0.25, 0.19, 0.4, 10);
    plant.userData.privateGeometries = [pot];
    mesh(pot, material('#ba735c'), 0, 0.2, 0, 1, 1, 1, plant);
    cylinder('#665540', 0, 0.412, 0, 0.2, 0.02, plant);
    cylinder('#587445', 0, 0.79, 0, 0.035, 0.75, plant);
    const leaves = [
      [-0.19, 0.63, 0.02, -0.7], [0.17, 0.75, 0.02, 0.7],
      [0.02, 0.89, -0.19, 0.25], [-0.16, 1.03, -0.07, -0.6],
      [0.12, 1.14, 0.08, 0.65], [-0.03, 1.24, 0.01, -0.2],
      [0.1, 0.6, 0.14, 0.9], [-0.12, 0.91, 0.16, -0.9],
    ];
    leaves.forEach(([x, y, z, angle], index) => {
      const leaf = sphere(index % 2 ? '#91b379' : '#6f9767', x, y, z, 0.14, 0.29, 0.075, plant);
      leaf.rotation.z = angle;
      leaf.rotation.y = index * 0.75;
    });
    return plant;
  }

  function buildResident(x, z, colour, faceDirection) {
    const resident = new THREE.Group();
    resident.position.set(x, 0, z);
    resident.rotation.y = faceDirection;
    cylinder('#4e4252', -0.105, 0.15, 0, 0.075, 0.3, resident);
    cylinder('#4e4252', 0.105, 0.15, 0, 0.075, 0.3, resident);
    sphere(colour, 0, 0.52, 0, 0.25, 0.34, 0.19, resident);
    sphere('#e4b995', 0, 0.98, 0, 0.21, 0.23, 0.2, resident);
    sphere('#453c44', 0, 1.12, -0.04, 0.22, 0.14, 0.21, resident);
    sphere('#342f38', -0.071, 1, 0.183, 0.017, 0.017, 0.012, resident);
    sphere('#342f38', 0.071, 1, 0.183, 0.017, 0.017, 0.012, resident);
    resident.userData.clothing = resident.children[2];
    resident.userData.savedWindowAvatar = true;
    scene.add(resident);
    return resident;
  }

  function buildShell() {
    const warmWood = '#9b7156';
    const darkWood = '#684e47';
    // A shallow plinth and wide boards make a single lived-in space, not a grid.
    box('#493e4b', 0, -0.27, 0, 7.1, 0.45, 6.9);
    box('#d3ac7e', 0, -0.032, 0, 6.75, 0.075, 6.55);
    for (let i = 0; i < 10; i += 1) {
      box(i % 3 ? '#cea678' : '#d8b389', 0, 0.013, -2.94 + i * 0.65, 6.6, 0.018, 0.625);
    }
    // The rear wall leaves an actual window opening; all wall geometry is local.
    box('#dfbf98', 0, 0.53, -3.33, 6.75, 1.06, 0.17);
    box('#dfbf98', 0, 2.96, -3.33, 6.75, 0.5, 0.17);
    box('#dfbf98', -2.95, 1.89, -3.33, 0.85, 1.7, 0.17);
    box('#dfbf98', 1.32, 1.89, -3.33, 4.08, 1.7, 0.17);
    box(darkWood, 0, 0.13, -3.19, 6.7, 0.17, 0.08);
    box(warmWood, 0, 3.22, -3.33, 6.92, 0.12, 0.32);
    const windowCentre = -1.62;
    box('#263c61', windowCentre, 1.93, -3.34, 1.76, 1.63, 0.055, scene, { emissive: '#213753', emissiveIntensity: 0.45 });
    box('#d5ab73', windowCentre, 1.08, -3.14, 2.03, 0.12, 0.45);
    box('#9d765b', windowCentre - 0.93, 1.92, -3.16, 0.09, 1.76, 0.18);
    box('#9d765b', windowCentre + 0.93, 1.92, -3.16, 0.09, 1.76, 0.18);
    box('#9d765b', windowCentre, 2.78, -3.16, 1.95, 0.09, 0.18);
    box('#9d765b', windowCentre, 1.91, -3.13, 0.065, 1.68, 0.1);
    box('#9d765b', windowCentre, 1.91, -3.13, 1.85, 0.055, 0.1);
    sphere('#c8d8e5', -1.27, 2.37, -3.08, 0.16, 0.16, 0.035, scene, { emissive: '#c8d8e5', emissiveIntensity: 0.6 });
    [-2.51, -0.72].forEach((x) => {
      const curtain = box('#bc7c69', x, 1.99, -3.01, 0.22, 1.64, 0.12);
      curtain.material = curtain.material.clone();
      windowAccents.push(curtain);
      box('#e8d0a3', x, 1.6, -2.93, 0.26, 0.055, 0.08);
    });

    // Side wall is a low cutaway with a taller rear section.
    box('#d4b28e', -3.34, 0.42, -0.45, 0.18, 0.84, 5.76);
    box('#d4b28e', -3.34, 1.73, -2.28, 0.18, 1.8, 2.08);
    box(warmWood, -3.34, 2.7, -2.27, 0.33, 0.12, 2.24);
    box(warmWood, -3.34, 0.87, 0.52, 0.3, 0.1, 3.88);
    box(darkWood, -3.2, 0.13, -0.45, 0.08, 0.17, 5.72);

    // Round woven rug with concentric trim, positioned under the common centre.
    cylinder('#aa6e64', 0.05, 0.033, 0.32, 1.72, 0.028);
    cylinder('#d6a77f', 0.05, 0.051, 0.32, 1.5, 0.01);
    cylinder('#b9786a', 0.05, 0.059, 0.32, 1.43, 0.009);
    const rugBorder = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.035, 4, 48), material('#e7c397'));
    rugBorder.rotation.x = Math.PI / 2;
    rugBorder.position.set(0.05, 0.066, 0.32);
    scene.add(rugBorder);

    // One small shelf, books, a note board and a tea tray supply domestic context.
    box(darkWood, 2.46, 0.72, -2.96, 1.35, 1.42, 0.49);
    box('#3f3c49', 2.46, 0.75, -2.688, 1.18, 1.21, 0.015);
    [0.12, 0.66, 1.26].forEach((height) => box(warmWood, 2.46, height, -2.68, 1.36, 0.075, 0.53));
    const bookColours = ['#a7746b', '#75918d', '#ceb078', '#6c7d97', '#b2899c'];
    bookColours.forEach((colour, index) => {
      const book = box(colour, 1.99 + index * 0.19, 0.43, -2.62, 0.135, 0.46 + (index % 2) * 0.04, 0.29);
      book.rotation.z = index === 4 ? -0.13 : 0;
    });
    box('#a7ab87', 2.18, 0.73, -2.56, 0.41, 0.075, 0.32);
    box('#d2aa7d', 2.18, 0.81, -2.56, 0.37, 0.075, 0.3);
    cylinder('#d8c4a0', 2.81, 0.86, -2.61, 0.115, 0.3);
    sphere('#91a376', 2.82, 1.11, -2.61, 0.17, 0.17, 0.13);
    box(darkWood, 0.81, 2.07, -3.13, 1.09, 0.94, 0.1);
    box('#af8a64', 0.81, 2.07, -3.061, 0.95, 0.81, 0.025);
    [[0.57, 2.22, '#f1d8ab'], [0.92, 2.24, '#ddb4ab'], [0.77, 1.92, '#b9c9b2']].forEach(([x, y, colour]) => {
      const note = box(colour, x, y, -3.04, 0.27, 0.23, 0.014);
      note.rotation.z = x - 0.72;
    });
    // A cushion alcove is architectural dressing, not an editable model substitute.
    box(warmWood, -2.72, 0.24, -1.55, 0.73, 0.42, 1.85);
    box('#859e95', -2.72, 0.51, -1.55, 0.79, 0.14, 1.92);
    sphere('#e9c994', -2.69, 0.67, -1.95, 0.29, 0.12, 0.27);
    const cushion = sphere('#bd7c72', -2.69, 0.67, -1.23, 0.28, 0.12, 0.27);
    cushion.material = cushion.material.clone();
    windowAccents.push(cushion);
    // One static saved-window avatar supplies scale without inventing other visitors.
    visitorFigure = buildResident(-1.8, 2.48, '#bc7c69', -0.65);
    visitorFigure.userData.clothing.material = visitorFigure.userData.clothing.material.clone();
    visitorFigure.visible = false;
  }

  function buildLantern() {
    const group = new THREE.Group();
    group.position.set(0.25, 0, -0.2);
    group.userData.furnitureId = 'lantern';
    // A finished neutral shade exists before anyone contributes. Submitted panes
    // add colour to this object without turning participation into a progress bar.
    box('#644c47', 0, 2.76, 0, 0.028, 0.76, 0.028, group);
    cylinder('#7a5948', 0, 2.34, 0, 0.36, 0.1, group);
    cylinder('#7a5948', 0, 1.67, 0, 0.32, 0.1, group);
    const baseShade = new THREE.CylinderGeometry(0.3, 0.26, 0.56, 32);
    mesh(baseShade, material('#e7cfaa', {
      emissive: '#ffc47b', emissiveIntensity: 0.55, side: THREE.DoubleSide,
    }), 0, 2, 0, 1, 1, 1, group);
    const panes = new THREE.Group();
    group.add(panes);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      cylinder('#b68d5d', Math.sin(angle) * 0.29, 2, Math.cos(angle) * 0.29, 0.013, 0.58, group);
    }
    const glow = new THREE.PointLight(PALETTE.amber, 4.5, 7, 2);
    glow.position.set(0.1, 1.85, 0.12);
    group.add(glow);
    const selection = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.023, 6, 32),
      new THREE.MeshBasicMaterial({ color: '#fff0bb' }),
    );
    selection.rotation.x = Math.PI / 2;
    selection.position.y = 1.61;
    selection.visible = false;
    group.add(selection);
    scene.add(group);
    return { group, panes, glow, selection, signature: null };
  }

  function addLighting() {
    scene.add(new THREE.HemisphereLight('#bacbe9', '#99634f', 1.3));
    const key = new THREE.DirectionalLight('#ffe0ac', 2.1);
    key.position.set(2.6, 7.2, 4.1);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 20;
    key.shadow.normalBias = 0.035;
    key.shadow.bias = -0.0001;
    scene.add(key);
    const moonlight = new THREE.DirectionalLight('#729dc9', 0.8);
    moonlight.position.set(-4, 4, -5);
    scene.add(moonlight);
  }

  buildShell();
  addLighting();
  const lantern = buildLantern();

  function normaliseModel(source, asset) {
    const root = new THREE.Group();
    root.add(source);
    source.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(source);
    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());
    const scale = asset === 'lamp' ? 1.85 / size.y
      : asset === 'chair' ? 0.86 / Math.max(size.x, size.z)
        : 1.52 / Math.max(size.x, size.z);
    if (!Number.isFinite(scale) || scale <= 0) throw new Error(`Invalid bounds for the ${asset} model.`);
    source.position.add(new THREE.Vector3(-centre.x, -bounds.min.y, -centre.z));
    root.scale.setScalar(scale);
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    resourceRoots.add(root);
    return root;
  }

  function updateLantern(state) {
    const allowedColours = new Set(Object.values(PALETTE));
    const parts = Array.isArray(state?.lantern?.parts)
      ? state.lantern.parts.filter((part) => part && typeof part.id === 'string' && allowedColours.has(part.colour)).slice(0, 9)
      : [];
    publishedPartCount = parts.length;
    const signature = JSON.stringify(parts.map(({ id, colour, revision }) => [id, colour, revision]));
    if (signature === lantern.signature) return;
    lantern.signature = signature;
    // These resources belong only to authored panes; the complete base survives.
    for (const pane of [...lantern.panes.children]) {
      lantern.panes.remove(pane);
      pane.geometry.dispose();
      pane.material.dispose();
    }
    const divisions = Math.max(8, parts.length);
    const sweep = Math.PI * 2 / divisions;
    const glowColour = new THREE.Color(PALETTE.amber);
    parts.forEach((part, index) => {
      const colour = new THREE.Color(part.colour);
      const surface = new THREE.MeshStandardMaterial({
        color: colour, emissive: colour, emissiveIntensity: 0.7,
        roughness: 0.7, side: THREE.DoubleSide,
      });
      const shape = new THREE.CylinderGeometry(0.307, 0.267, 0.54, 6, 1, true, index * sweep + 0.025, sweep - 0.05);
      const pane = mesh(shape, surface, 0, 2, 0, 1, 1, 1, lantern.panes);
      pane.userData.partId = part.id;
      pane.userData.owner = part.owner;
      glowColour.add(colour);
    });
    lantern.glow.color.copy(glowColour.multiplyScalar(1 / (parts.length + 1)));
  }

  function updateWindow(state) {
    const colour = PALETTE[state?.visitor?.windowColour] || PALETTE.amber;
    const accent = new THREE.Color(colour).lerp(new THREE.Color('#755154'), 0.32);
    windowAccents.forEach((item) => item.material.color.copy(accent));
    visitorFigure.visible = typeof state?.visitor?.id === 'string';
    visitorFigure.userData.clothing.material.color.copy(accent);
  }

  function makeFurniture(item) {
    const object = new THREE.Group();
    object.userData.furnitureId = item.id;
    object.userData.asset = item.asset;
    const model = item.asset === 'plant' ? buildPlant() : templates.get(item.asset)?.clone(true);
    if (!model) throw new Error(`Unsupported furniture asset: ${item.asset}`);
    object.add(model);
    const radius = item.asset === 'table' ? 0.86 : item.asset === 'plant' ? 0.38 : 0.58;
    const markerSurface = new THREE.MeshBasicMaterial({ color: '#e6c78d', transparent: true, opacity: 0.48, depthWrite: false });
    const marker = new THREE.Mesh(new THREE.RingGeometry(radius - 0.028, radius, 40), markerSurface);
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.115;
    object.add(marker);
    object.userData.marker = marker;
    // At the phone's low internal resolution the former 0.028-wide marker was
    // subpixel-thin. A separate selection band has a dark rim and an unlit cream
    // centre, clears the raised rug trim (top 0.101), and sits outside the prop.
    const selectedRadius = item.asset === 'table' ? 1.29 : item.asset === 'plant' ? 0.58 : item.asset === 'lamp' ? 0.62 : 0.8;
    const selection = new THREE.Group();
    const rimSurface = new THREE.MeshBasicMaterial({ color: '#26374b', transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    const accentSurface = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
    const rim = new THREE.Mesh(new THREE.RingGeometry(selectedRadius - 0.26, selectedRadius, 48), rimSurface);
    const accent = new THREE.Mesh(new THREE.RingGeometry(selectedRadius - 0.2, selectedRadius - 0.04, 48), accentSurface);
    [rim, accent].forEach((band, index) => {
      band.rotation.x = -Math.PI / 2;
      band.position.y = 0.14 + index * 0.003;
      band.renderOrder = 2 + index;
      selection.add(band);
    });
    selection.visible = false;
    object.add(selection);
    object.userData.selection = selection;
    if (item.asset === 'lamp') {
      const light = new THREE.PointLight('#ffc984', 2.3, 4.2, 2);
      light.position.y = 1.35;
      object.add(light);
    }
    scene.add(object);
    object.userData.privateResources = {
      geometries: [marker.geometry, rim.geometry, accent.geometry, ...(model.userData.privateGeometries || [])],
      materials: [markerSurface, rimSurface, accentSurface],
    };
    resourceRoots.add(object);
    return object;
  }

  function removeFurniture(id, object) {
    scene.remove(object);
    furniture.delete(id);
    resourceRoots.delete(object);
    object.userData.privateResources.geometries.forEach((geometry) => geometry.dispose());
    object.userData.privateResources.materials.forEach((surface) => surface.dispose());
  }

  function setState(state) {
    if (disposed) return;
    const items = state?.room?.furniture;
    if (!Array.isArray(items)) throw new Error('The room projection must contain a furniture array.');
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !['chair', 'table', 'lamp', 'plant'].includes(item.asset)
        || !Number.isFinite(item.x) || !Number.isFinite(item.z) || ![0, 90, 180, 270].includes(item.yaw)) {
        throw new Error('The room projection contains invalid furniture.');
      }
    }
    const incoming = new Set(items.map((item) => item.id));
    for (const [id, object] of furniture) {
      if (!incoming.has(id)) {
        removeFurniture(id, object);
      }
    }
    for (const item of items) {
      let object = furniture.get(item.id);
      if (object && object.userData.asset !== item.asset) {
        removeFurniture(item.id, object);
        object = null;
      }
      if (!object) {
        object = makeFurniture(item);
        furniture.set(item.id, object);
      }
      object.position.set(item.x, 0, item.z);
      object.rotation.y = THREE.MathUtils.degToRad(item.yaw);
      object.userData.owner = item.owner;
      updateFurnitureSelection(object, item.id === currentSelection);
    }
    updateLantern(state);
    updateWindow(state);
    scene.updateMatrixWorld(true);
    hasState = true;
  }

  function setSelection(id) {
    currentSelection = id;
    lantern.selection.visible = id === 'lantern';
    for (const [itemId, object] of furniture) {
      updateFurnitureSelection(object, itemId === id);
    }
  }

  function updateFurnitureSelection(object, selected) {
    object.userData.marker.material.color.set('#e6c78d');
    object.userData.marker.visible = !selected;
    object.userData.selection.visible = selected;
  }

  function resize() {
    if (disposed) return;
    dimensions = { width: Math.max(1, container.clientWidth), height: Math.max(1, container.clientHeight) };
    const aspect = dimensions.width / dimensions.height;
    renderer.setSize(Math.max(1, Math.round(dimensions.width / currentPixelScale)), Math.max(1, Math.round(dimensions.height / currentPixelScale)), false);
    // Keep the room framed at a narrow viewport as well as a wide one.
    const halfHeight = Math.max(4.75, 5.1 / aspect);
    fixedCamera.left = -halfHeight * aspect;
    fixedCamera.right = halfHeight * aspect;
    fixedCamera.top = halfHeight;
    fixedCamera.bottom = -halfHeight;
    fixedCamera.updateProjectionMatrix();
    orbitCamera.aspect = aspect;
    orbitCamera.updateProjectionMatrix();
    const fitDistance = Math.max(15, 5.35 / (Math.tan(THREE.MathUtils.degToRad(orbitCamera.fov) / 2) * Math.min(1, aspect)));
    const orbitDistance = controls ? orbitCamera.position.distanceTo(controls.target) : fitDistance;
    const direction = controls ? orbitCamera.position.clone().sub(controls.target).normalize() : initialOrbitDirection;
    orbitCamera.position.copy(LOOK_AT).addScaledVector(direction, Math.max(fitDistance * 0.78, Math.min(fitDistance * 1.45, orbitDistance)));
    orbitCamera.lookAt(LOOK_AT);
    if (controls) {
      controls.minDistance = fitDistance * 0.78;
      controls.maxDistance = fitDistance * 1.45;
      controls.update();
    }
  }

  function setView(nextView) {
    if (disposed) return;
    if (!['overview', 'room', 'courtyard'].includes(nextView)) throw new Error(`Unsupported room view: ${nextView}`);
    currentView = nextView;
    // All three views show the same saved scene. Moving the fixed camera and its
    // target together preserves the original angle, picking and object geometry.
    const target = nextView === 'courtyard' ? new THREE.Vector3(0.25, 1.5, -0.2) : LOOK_AT;
    fixedCamera.position.set(10, 9.3, 12).add(target).sub(LOOK_AT);
    fixedCamera.lookAt(target);
    fixedCamera.zoom = nextView === 'courtyard' ? 1.4 : nextView === 'overview' ? 0.9 : 1;
    pointerStart = null;
    activePointers.clear();
    resize();
  }

  function setMode(nextMode) {
    if (!['camera-fixed', 'camera-orbit'].includes(nextMode)) throw new Error(`Unsupported 3D camera mode: ${nextMode}`);
    if (controls) {
      controls.dispose();
      controls = null;
    }
    currentMode = nextMode;
    pointerStart = null;
    activePointers.clear();
    activeCamera = nextMode === 'camera-orbit' ? orbitCamera : fixedCamera;
    canvas.style.touchAction = nextMode === 'camera-orbit' ? 'none' : 'pan-y';
    if (nextMode === 'camera-orbit') {
      controls = new OrbitControls(orbitCamera, canvas);
      controls.target.copy(LOOK_AT);
      controls.enablePan = false;
      controls.enableDamping = !motionPreference.matches;
      controls.dampingFactor = 0.1;
      controls.minAzimuthAngle = 0.12;
      controls.maxAzimuthAngle = 1.3;
      controls.minPolarAngle = 0.6;
      controls.maxPolarAngle = 1.12;
      controls.rotateSpeed = 0.65;
      controls.zoomSpeed = 0.65;
      controls.update();
    }
    resize();
  }

  function setPixelScale(nextScale) {
    if (!Number.isFinite(nextScale) || nextScale < 1 || nextScale > 8) throw new Error('Pixel scale must be between 1 and 8.');
    currentPixelScale = nextScale;
    canvas.style.imageRendering = nextScale > 1 ? 'pixelated' : 'auto';
    resize();
  }

  let pointerStart = null;
  const activePointers = new Set();
  function pointerDown(event) {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) pointerStart = null;
    else if (event.isPrimary && event.button === 0) pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }
  function pointerMove(event) {
    if (pointerStart?.id === event.pointerId && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8) pointerStart = null;
  }
  function pointerCancel(event) {
    activePointers.delete(event.pointerId);
    pointerStart = null;
  }
  function pointerUp(event) {
    activePointers.delete(event.pointerId);
    const start = pointerStart;
    pointerStart = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(pointer, activeCamera);
    // Raycast the whole room so furniture hidden behind a wall is not selectable.
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      if (hit.object.material?.transparent || hit.object.geometry?.type === 'RingGeometry') continue;
      let object = hit.object;
      while (object && !object.userData.furnitureId) object = object.parent;
      if (object) onSelect(object.userData.furnitureId);
      return;
    }
  }

  function getDiagnostics() {
    const bounds = canvas.getBoundingClientRect();
    return {
      renderer: `Three.js ${THREE.REVISION}`, mode: currentMode, view: currentView, modelStatus,
      modelTypes: [...templates.keys()], modelCount: templates.size,
      modelInstances: [...furniture.values()].filter((object) => object.userData.asset !== 'plant').length,
      furnitureCount: furniture.size, authoredPaneCount: publishedPartCount,
      proceduralContent: ['architectural shell and dressing', 'plant', 'one saved-window avatar', 'shared lantern'],
      avatarRepresentsLivePresence: false, sceneReady: readyAt !== null && !contextLost,
      contextLost, sceneReadyMs: readyAt === null ? null : Number((readyAt - startedAt).toFixed(2)),
      drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries,
      viewportWidth: dimensions.width, viewportHeight: dimensions.height,
      canvasWidth: canvas.width, canvasHeight: canvas.height,
      canvasDisplayWidth: Number(bounds.width.toFixed(2)), canvasDisplayHeight: Number(bounds.height.toFixed(2)),
      pixelScale: currentPixelScale, devicePixelRatio: window.devicePixelRatio,
      reducedMotion: motionPreference.matches,
    };
  }

  function emitMetrics(now) {
    const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const cadence = average(frameIntervals);
    onMetrics({
      ...getDiagnostics(),
      frameCadenceMs: cadence === null ? null : Number(cadence.toFixed(2)),
      fps: cadence ? Number((1000 / cadence).toFixed(1)) : null,
      renderCpuMs: renderTimes.length ? Number(average(renderTimes).toFixed(2)) : null,
      sampleFrames: renderTimes.length, sampleWindowMs: Number((now - metricStartedAt).toFixed(1)),
    });
    metricStartedAt = now;
    frameIntervals = [];
    renderTimes = [];
  }

  function startFrameLoop() {
    if (disposed || contextLost || frameId !== 0) return;
    frameId = requestAnimationFrame(frame);
  }

  function frame(now) {
    frameId = 0;
    if (disposed || contextLost) return;
    if (lastFrameAt !== null && document.visibilityState === 'visible') frameIntervals.push(now - lastFrameAt);
    lastFrameAt = now;
    controls?.update();
    const beforeRender = performance.now();
    try {
      renderer.render(scene, activeCamera);
    } catch (error) {
      onError(error);
      return;
    }
    renderTimes.push(performance.now() - beforeRender);
    if (readyAt === null && hasState) {
      readyAt = performance.now();
      onReady(getDiagnostics());
      emitMetrics(readyAt);
    } else if (now - metricStartedAt >= 1000) {
      emitMetrics(now);
    }
    startFrameLoop();
  }

  function updateMotionPreference() {
    if (controls) controls.enableDamping = !motionPreference.matches;
  }
  function visibilityChanged() {
    lastFrameAt = null;
    frameIntervals = [];
    renderTimes = [];
    metricStartedAt = performance.now();
  }

  function contextLostHandler(event) {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frameId);
    frameId = 0;
    const error = new Error('The 3D scene paused because the graphics context was lost. Your saved room is still available through the object controls.');
    error.code = 'WEBGL_CONTEXT_LOST';
    onError(error);
    emitMetrics(performance.now());
  }
  function contextRestoredHandler() {
    if (disposed) return;
    contextLost = false;
    visibilityChanged();
    resize();
    startFrameLoop();
  }
  const observer = new ResizeObserver(resize);
  canvas.addEventListener('webglcontextlost', contextLostHandler);
  canvas.addEventListener('webglcontextrestored', contextRestoredHandler);
  function destroy() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    controls?.dispose();
    canvas.removeEventListener('webglcontextlost', contextLostHandler);
    canvas.removeEventListener('webglcontextrestored', contextRestoredHandler);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel);
    motionPreference.removeEventListener('change', updateMotionPreference);
    document.removeEventListener('visibilitychange', visibilityChanged);
    const geometries = new Set([unitBox, unitSphere, unitCylinder]);
    const surfaces = new Set(materials.values());
    const textures = new Set();
    for (const root of resourceRoots) root.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((surface) => surfaces.add(surface));
      if (object.shadow) object.shadow.dispose();
    });
    for (const surface of surfaces) Object.values(surface).forEach((value) => { if (value?.isTexture) textures.add(value); });
    geometries.forEach((geometry) => geometry.dispose());
    surfaces.forEach((surface) => surface.dispose());
    textures.forEach((texture) => {
      texture.dispose();
      if (typeof texture.image?.close === 'function') texture.image.close();
    });
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    furniture.clear();
    templates.clear();
    resourceRoots.clear();
    activePointers.clear();
  }

  try {
    const loader = new GLTFLoader();
    // Await all requests even after one failure, so every loaded model is released.
    const loaded = await Promise.allSettled(Object.entries(MODEL_FILES).map(async ([asset, url]) => {
      const gltf = await loader.loadAsync(url);
      resourceRoots.add(gltf.scene);
      templates.set(asset, normaliseModel(gltf.scene, asset));
    }));
    const failed = loaded.find((result) => result.status === 'rejected');
    if (failed) throw new Error(`Licensed furniture could not load: ${failed.reason?.message || String(failed.reason)}`, { cause: failed.reason });
    modelStatus = 'loaded';
    setPixelScale(pixelScale);
    setMode(mode);
    observer.observe(container);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerCancel);
    motionPreference.addEventListener('change', updateMotionPreference);
    document.addEventListener('visibilitychange', visibilityChanged);
    startFrameLoop();
    return { setState, setSelection, setView, setMode, setPixelScale, getDiagnostics, destroy };
  } catch (error) {
    modelStatus = 'failed';
    onError(error);
    destroy();
    throw error;
  }
}
