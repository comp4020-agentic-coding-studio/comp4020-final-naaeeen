const SVG_NS = 'http://www.w3.org/2000/svg';
const UNIT = 52;
const ORIGIN = { x: 500, y: 535 };
const OWNERS = {
  alice: { name: 'Alice', light: '#e3a6a2', mid: '#af747b', dark: '#704c62' },
  bob: { name: 'Bob', light: '#a4c4cc', mid: '#668c9b', dark: '#415b73' },
};
const COLOURS = {
  amber: '#ffc47b', rose: '#f391a8', mint: '#a0d8b3',
  sky: '#99c8e6', lavender: '#c7a3ec',
};
let rendererSequence = 0;

function svgElement(tag, attributes = {}, children = []) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) element.setAttribute(name, String(value));
  }
  for (const child of children) element.append(child);
  return element;
}

function textElement(content, attributes = {}) {
  const element = svgElement('text', attributes);
  element.textContent = content;
  return element;
}

function project(x, z, y = 0) {
  return { x: ORIGIN.x + (x - z) * UNIT, y: ORIGIN.y + (x + z) * UNIT / 2 - y * UNIT * 1.05 };
}

function pointsAttribute(points) {
  return points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function polygon(parent, points, fill, attributes = {}) {
  parent.append(svgElement('polygon', { points: pointsAttribute(points), fill, ...attributes }));
}

function worldPolygon(parent, points, fill, attributes = {}) {
  polygon(parent, points.map(([x, z, y = 0]) => project(x, z, y)), fill, attributes);
}

function floorRectangle(parent, x1, z1, x2, z2, y, fill, attributes = {}) {
  worldPolygon(parent, [[x1, z1, y], [x2, z1, y], [x2, z2, y], [x1, z2, y]], fill, attributes);
}

function localPoint(item, x, z, y = 0) {
  const angle = item.yaw * Math.PI / 180;
  return [item.x + x * Math.cos(angle) + z * Math.sin(angle),
    item.z - x * Math.sin(angle) + z * Math.cos(angle), y];
}

function box(parent, item, x, z, width, depth, bottom, height, colours) {
  const localCorners = [[x - width / 2, z - depth / 2], [x + width / 2, z - depth / 2],
    [x + width / 2, z + depth / 2], [x - width / 2, z + depth / 2]];
  const lower = localCorners.map(([cx, cz]) => localPoint(item, cx, cz, bottom));
  const upper = localCorners.map(([cx, cz]) => localPoint(item, cx, cz, bottom + height));
  const faces = lower.map((corner, index) => {
    const next = (index + 1) % 4;
    const centreDepth = (corner[0] + corner[1] + lower[next][0] + lower[next][1]) / 2;
    const sideFill = [colours.dark, colours.mid, colours.mid, colours.dark][index];
    return { depth: centreDepth, points: [corner, lower[next], upper[next], upper[index]], fill: sideFill };
  });
  faces.sort((a, b) => a.depth - b.depth);
  for (const face of faces) worldPolygon(parent, face.points, face.fill);
  worldPolygon(parent, upper, colours.light, { stroke: colours.dark, 'stroke-width': 0.6 });
}

function safeColour(value, fallback) {
  if (typeof value !== 'string') return fallback;
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)) return value;
  return COLOURS[value] ?? fallback;
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeItem(item) {
  return {
    id: item.id,
    asset: item.asset,
    owner: item.owner === 'bob' ? 'bob' : 'alice',
    x: Math.max(-3, Math.min(3, finite(item.x))),
    z: Math.max(-3, Math.min(3, finite(item.z))),
    yaw: Math.round(finite(item.yaw) / 90) * 90,
  };
}

function drawBackdrop(parent, prefix) {
  parent.append(svgElement('rect', { width: 1000, height: 760, fill: `url(#${prefix}-night)` }));
  const stars = [[106, 149, 1.4], [174, 78, 1.7], [237, 183, 1.1], [378, 63, 1.3],
    [514, 96, 1.1], [632, 52, 1.8], [728, 132, 1.1], [832, 74, 1.5], [936, 176, 1.3]];
  for (const [cx, cy, r] of stars) parent.append(svgElement('circle', { cx, cy, r, fill: '#d6d1b6', opacity: 0.7 }));
  parent.append(svgElement('circle', { cx: 832, cy: 117, r: 24, fill: '#eddbb2', opacity: 0.85 }));
  parent.append(svgElement('circle', { cx: 841, cy: 109, r: 23, fill: '#172b40' }));
  const buildings = [[44, 264, 94, 106], [125, 298, 54, 72], [832, 250, 55, 120], [877, 280, 85, 90]];
  for (const [x, y, width, height] of buildings) {
    parent.append(svgElement('rect', { x, y, width, height, rx: 4, fill: '#12253b' }));
    for (let wx = x + 13; wx < x + width - 8; wx += 23) {
      for (let wy = y + 19; wy < y + height - 8; wy += 27) {
        parent.append(svgElement('rect', { x: wx, y: wy, width: 8, height: 12, rx: 1,
          fill: '#ffc47b', opacity: (wx + wy) % 3 === 0 ? 0.45 : 0.18 }));
      }
    }
  }
  parent.append(svgElement('ellipse', { cx: 500, cy: 651, rx: 369, ry: 101, fill: '#07121f', opacity: 0.5 }));
}

function wallWindow(parent, axis, start, end, prefix) {
  const onWall = (horizontal, vertical) => axis === 'x'
    ? [-3.48, horizontal, vertical] : [horizontal, -3.48, vertical];
  worldPolygon(parent, [onWall(start - 0.09, 1.2), onWall(end + 0.09, 1.2),
    onWall(end + 0.09, 2.48), onWall(start - 0.09, 2.48)], '#302d38');
  worldPolygon(parent, [onWall(start, 1.28), onWall(end, 1.28), onWall(end, 2.4), onWall(start, 2.4)], '#233e54');
  const middle = (start + end) / 2;
  for (const [left, right, bottom, top] of [[start, middle - 0.025, 1.3, 1.82],
    [middle + 0.025, end, 1.3, 1.82], [start, middle - 0.025, 1.87, 2.38],
    [middle + 0.025, end, 1.87, 2.38]]) {
    worldPolygon(parent, [onWall(left, bottom), onWall(right, bottom), onWall(right, top), onWall(left, top)],
      `url(#${prefix}-window)`, { opacity: 0.8 });
  }
  worldPolygon(parent, [onWall(start - 0.11, 1.18), onWall(end + 0.11, 1.18),
    onWall(end + 0.11, 1.27), onWall(start - 0.11, 1.27)], '#be9b70');
}

function drawRoom(parent, prefix) {
  worldPolygon(parent, [[-3.5, -3.5, 0], [-3.5, 3.5, 0], [-3.5, 3.5, 3.15], [-3.5, -3.5, 3.15]], '#5a5052');
  worldPolygon(parent, [[-3.5, -3.5, 0], [3.5, -3.5, 0], [3.5, -3.5, 3.15], [-3.5, -3.5, 3.15]], '#726055');
  wallWindow(parent, 'x', -2.6, -0.65, prefix);
  wallWindow(parent, 'z', -0.7, 1.65, prefix);
  worldPolygon(parent, [[-3.5, 3.5, 0], [3.5, 3.5, 0], [3.5, 3.5, -0.22], [-3.5, 3.5, -0.22]], '#695042');
  worldPolygon(parent, [[3.5, -3.5, 0], [3.5, 3.5, 0], [3.5, 3.5, -0.22], [3.5, -3.5, -0.22]], '#4e3d39');
  const wood = ['#a77c57', '#b28761', '#9e7352', '#ba9067'];
  for (let plank = 0; plank < 14; plank += 1) {
    const x = -3.5 + plank / 2;
    floorRectangle(parent, x, -3.5, x + 0.5, 3.5, 0, wood[plank % wood.length],
      { stroke: '#795944', 'stroke-width': 1.1 });
    for (const z of [-2.2, 0.3, 2.6]) {
      const from = project(x + 0.09, z, 0.004);
      const to = project(x + 0.38, z + 0.15, 0.004);
      parent.append(svgElement('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        stroke: '#76553f', 'stroke-width': 1.1, opacity: 0.3 }));
    }
  }
  floorRectangle(parent, -3.5, -3.5, 3.5, 3.5, 0.006, 'none', { stroke: '#d0a376', 'stroke-width': 3 });
  floorRectangle(parent, -1.85, -1.28, 1.45, 2.03, 0.015, '#6c516b', { stroke: '#43354b', 'stroke-width': 1.2 });
  floorRectangle(parent, -1.69, -1.12, 1.29, 1.87, 0.017, '#b68486', { stroke: '#d9ad94', 'stroke-width': 3 });
  floorRectangle(parent, -1.36, -0.79, 0.96, 1.54, 0.019, '#946b7c', { stroke: '#c79b8e', 'stroke-width': 1.5 });
  for (let edge = -1.77; edge <= 1.45; edge += 0.18) {
    for (const z of [-1.28, 2.03]) {
      const from = project(edge, z, 0.015);
      const to = project(edge, z + (z < 0 ? -0.1 : 0.1), 0.015);
      parent.append(svgElement('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        stroke: '#d4b09b', 'stroke-width': 1.7 }));
    }
  }
  for (const edge of [[-3.5, -3.5, -3.5, 3.5], [-3.5, -3.5, 3.5, -3.5]]) {
    const [x1, z1, x2, z2] = edge;
    worldPolygon(parent, [[x1, z1, 0.04], [x2, z2, 0.04], [x2, z2, 0.18], [x1, z1, 0.18]], '#8a6f59');
    const from = project(x1, z1, 3.15);
    const to = project(x2, z2, 3.15);
    parent.append(svgElement('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: '#b39574', 'stroke-width': 5 }));
  }
}

function drawChair(parent, item) {
  const paint = OWNERS[item.owner];
  const wood = { light: '#ae845f', mid: '#785743', dark: '#57423b' };
  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.26, 0.26]) box(parent, item, x, z, 0.09, 0.09, 0.02, 0.63, wood);
  }
  box(parent, item, 0, 0, 0.73, 0.7, 0.57, 0.13, wood);
  box(parent, item, 0, 0.04, 0.65, 0.57, 0.7, 0.12, paint);
  box(parent, item, 0, -0.29, 0.69, 0.13, 0.73, 0.54, paint);
  for (const x of [-0.34, 0.34]) {
    box(parent, item, x, 0.02, 0.085, 0.57, 0.8, 0.075, wood);
  }
}

function drawTable(parent, item) {
  const wood = { light: '#c89a6c', mid: '#986b4c', dark: '#634b3c' };
  for (const x of [-0.48, 0.48]) {
    for (const z of [-0.33, 0.33]) box(parent, item, x, z, 0.11, 0.11, 0.02, 0.76, wood);
  }
  box(parent, item, 0, 0, 1.25, 0.93, 0.77, 0.14, wood);
  box(parent, item, -0.24, 0.05, 0.3, 0.36, 0.91, 0.045,
    { light: '#bbacb4', mid: '#846e89', dark: '#634a67' });
  const cup = project(...localPoint(item, 0.3, -0.02, 1.03));
  parent.append(svgElement('ellipse', { cx: cup.x, cy: cup.y + 5, rx: 6, ry: 4, fill: '#dbc1a0' }));
  parent.append(svgElement('rect', { x: cup.x - 6, y: cup.y - 3, width: 12, height: 8, rx: 2, fill: '#e8d3b1' }));
  parent.append(svgElement('ellipse', { cx: cup.x, cy: cup.y - 3, rx: 6, ry: 3, fill: '#765a49', stroke: '#e8d3b1', 'stroke-width': 1.5 }));
}

function drawLamp(parent, item, prefix) {
  const foot = project(item.x, item.z, 0.08);
  const glow = project(item.x, item.z, 1.42);
  parent.append(svgElement('ellipse', { cx: glow.x, cy: glow.y + 21, rx: 57, ry: 48,
    fill: '#ffc47b', opacity: 0.12, filter: `url(#${prefix}-glow)` }));
  box(parent, item, 0, 0, 0.38, 0.38, 0.02, 0.08,
    { light: '#c8ac73', mid: '#8f764d', dark: '#5e4e3e' });
  const top = project(item.x, item.z, 1.56);
  parent.append(svgElement('line', { x1: foot.x, y1: foot.y, x2: top.x, y2: top.y,
    stroke: '#ddba7d', 'stroke-width': 5, 'stroke-linecap': 'round' }));
  const corners = [[-0.36, -0.36], [0.36, -0.36], [0.36, 0.36], [-0.36, 0.36]];
  const lower = corners.map(([x, z]) => localPoint(item, x, z, 1.24));
  const upper = corners.map(([x, z]) => localPoint(item, x / 2, z / 2, 1.72));
  const faces = lower.map((point, i) => ({
    depth: point[0] + point[1] + lower[(i + 1) % 4][0] + lower[(i + 1) % 4][1],
    points: [point, lower[(i + 1) % 4], upper[(i + 1) % 4], upper[i]],
  })).sort((a, b) => a.depth - b.depth);
  faces.forEach((face, i) => worldPolygon(parent, face.points, i === 3 ? '#ffc47b' : '#d6a16b', { stroke: '#9c754f', 'stroke-width': 0.7 }));
  worldPolygon(parent, upper, '#e5bc88');
}

function drawLeaf(parent, base, tip, width, fill) {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const length = Math.hypot(dx, dy) || 1;
  const cx = (base.x + tip.x) / 2;
  const cy = (base.y + tip.y) / 2;
  const px = -dy / length * width;
  const py = dx / length * width;
  parent.append(svgElement('path', {
    d: `M ${base.x} ${base.y} Q ${cx + px} ${cy + py} ${tip.x} ${tip.y} Q ${cx - px} ${cy - py} ${base.x} ${base.y}`,
    fill, stroke: '#3e6955', 'stroke-width': 0.65,
  }));
}

function drawPlant(parent, item) {
  const pot = { light: '#d49a79', mid: '#ae725d', dark: '#835448' };
  box(parent, item, 0, 0, 0.48, 0.48, 0.02, 0.4, pot);
  box(parent, item, 0, 0, 0.6, 0.6, 0.39, 0.08, pot);
  floorRectangle(parent, item.x - 0.21, item.z - 0.21, item.x + 0.21, item.z + 0.21, 0.48, '#55493a');
  const stemBase = project(item.x, item.z, 0.46);
  const stemTop = project(item.x, item.z, 1.28);
  parent.append(svgElement('line', { x1: stemBase.x, y1: stemBase.y, x2: stemTop.x, y2: stemTop.y,
    stroke: '#719b6d', 'stroke-width': 3 }));
  const leaves = [[-0.35, -0.12, 1.05], [0.38, 0.04, 1.13], [-0.28, 0.28, 0.8],
    [0.22, -0.32, 1.35], [-0.12, -0.23, 1.48], [0.34, 0.3, 0.91], [-0.34, -0.3, 1.27]];
  leaves.forEach(([x, z, y], i) => {
    const tip = project(...localPoint(item, x, z, y));
    const base = project(item.x, item.z, 0.62 + i % 3 * 0.15);
    drawLeaf(parent, base, tip, 13, ['#80b68b', '#a0c49a', '#5c9474'][i % 3]);
  });
}

function drawResident(parent, owner, x, z) {
  const paint = OWNERS[owner];
  const foot = project(x, z);
  const head = project(x, z, 1.14);
  parent.append(svgElement('ellipse', { cx: foot.x, cy: foot.y + 2, rx: 18, ry: 7, fill: '#463b40', opacity: 0.25 }));
  parent.append(svgElement('path', { d: `M ${foot.x - 10} ${foot.y - 4} L ${foot.x - 9} ${foot.y - 29} L ${foot.x + 9} ${foot.y - 29} L ${foot.x + 11} ${foot.y - 4}`,
    fill: '#4f4b68', stroke: '#3d3c55', 'stroke-width': 2 }));
  parent.append(svgElement('path', { d: `M ${foot.x - 18} ${foot.y - 23} Q ${foot.x - 20} ${foot.y - 50} ${foot.x - 10} ${foot.y - 51} L ${foot.x + 10} ${foot.y - 51} Q ${foot.x + 20} ${foot.y - 50} ${foot.x + 18} ${foot.y - 23} Z`,
    fill: paint.light, stroke: paint.dark, 'stroke-width': 1.2 }));
  parent.append(svgElement('circle', { cx: head.x, cy: head.y, r: 12, fill: '#d8a789' }));
  parent.append(svgElement('path', { d: `M ${head.x - 12} ${head.y + 1} Q ${head.x - 16} ${head.y - 18} ${head.x + 2} ${head.y - 15} Q ${head.x + 14} ${head.y - 14} ${head.x + 12} ${head.y + 1} L ${head.x + 7} ${head.y - 4} L ${head.x - 1} ${head.y - 6} Z`,
    fill: owner === 'alice' ? '#59414a' : '#4d3f3e' }));
  parent.append(svgElement('rect', { x: foot.x - 25, y: foot.y + 11, width: 50, height: 19, rx: 9,
    fill: '#243548', opacity: 0.9 }));
  parent.append(textElement(paint.name, { x: foot.x, y: foot.y + 24, fill: '#f0e0c7', 'text-anchor': 'middle', 'font-size': 12 }));
}

function drawLantern(parent, parts, prefix) {
  const centre = project(0, -1.85, 2.47);
  const hook = project(0, -1.85, 3.15);
  parent.append(svgElement('line', { x1: hook.x, y1: hook.y, x2: centre.x, y2: centre.y - 27,
    stroke: '#d5b897', 'stroke-width': 2.5 }));
  parent.append(svgElement('ellipse', { cx: centre.x, cy: centre.y, rx: 62, ry: 60,
    fill: safeColour(parts?.alice?.colour, COLOURS.amber), opacity: 0.13, filter: `url(#${prefix}-glow)` }));
  parent.append(svgElement('ellipse', { cx: centre.x, cy: centre.y + 4, rx: 28, ry: 36, fill: '#725552' }));
  parent.append(svgElement('path', { d: `M ${centre.x} ${centre.y - 29} C ${centre.x - 36} ${centre.y - 29} ${centre.x - 36} ${centre.y + 35} ${centre.x} ${centre.y + 35} Z`,
    fill: safeColour(parts?.alice?.colour, COLOURS.amber) }));
  parent.append(svgElement('path', { d: `M ${centre.x} ${centre.y - 29} C ${centre.x + 36} ${centre.y - 29} ${centre.x + 36} ${centre.y + 35} ${centre.x} ${centre.y + 35} Z`,
    fill: safeColour(parts?.bob?.colour, COLOURS.sky) }));
  for (const y of [-19, -7, 7, 21]) {
    parent.append(svgElement('path', { d: `M ${centre.x - 26} ${centre.y + y} Q ${centre.x} ${centre.y + y + 7} ${centre.x + 26} ${centre.y + y}`,
      fill: 'none', stroke: '#785950', 'stroke-width': 1, opacity: 0.35 }));
  }
  parent.append(svgElement('rect', { x: centre.x - 14, y: centre.y - 33, width: 28, height: 5, rx: 2, fill: '#b99468' }));
  parent.append(svgElement('rect', { x: centre.x - 14, y: centre.y + 33, width: 28, height: 5, rx: 2, fill: '#b99468' }));
  parent.append(svgElement('line', { x1: centre.x, y1: centre.y + 38, x2: centre.x, y2: centre.y + 50, stroke: '#d6b687', 'stroke-width': 2 }));
  return centre;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))].toFixed(2));
}

/** A bounded illustrative SVG candidate; its assets are not the GLTF models. */
export async function createRenderer(container, { onSelect, onMetrics, onReady, mode = 'flat-iso', pixelScale = 2 } = {}) {
  const startedAt = performance.now();
  const prefix = `night-iso-${++rendererSequence}`;
  let state = { furniture: [], lantern: { parts: {} }, message: '' };
  let selectedId = null;
  let destroyed = false;
  let currentPixelScale = Math.max(1, Math.min(4, finite(pixelScale, 2)));
  let sceneReadyMs = null;
  let cadenceHandle = 0;
  let readyHandle = 0;
  let readyPending = false;
  let previousFrame = null;
  const cadence = [];
  const wrapper = document.createElement('div');
  wrapper.dataset.renderer = 'flat-iso';
  Object.assign(wrapper.style, { width: '100%', height: '100%', maxWidth: '100%', minWidth: '0',
    minHeight: '0', overflow: 'hidden', position: 'relative', background: '#13243a' });
  const scene = svgElement('svg', { viewBox: '0 0 1000 760', preserveAspectRatio: 'xMidYMid meet',
    role: 'group', 'aria-label': 'Isometric shared room at night', 'data-renderer': 'flat-iso' });
  Object.assign(scene.style, { display: 'block', width: '100%', height: '100%', maxWidth: '100%', touchAction: 'pan-y' });
  scene.append(svgElement('title', {}, [document.createTextNode('A warm shared room at night')]));
  scene.append(svgElement('desc', {}, [document.createTextNode('Illustrated isometric room with two residents, owned furniture and a shared lantern. Select props here or use the object list beside the scene.')]));
  const defs = svgElement('defs');
  const night = svgElement('linearGradient', { id: `${prefix}-night`, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
  night.append(svgElement('stop', { offset: '0%', 'stop-color': '#14283f' }), svgElement('stop', { offset: '100%', 'stop-color': '#263950' }));
  const windowGradient = svgElement('linearGradient', { id: `${prefix}-window`, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
  windowGradient.append(svgElement('stop', { offset: '0%', 'stop-color': '#9bb5b4' }),
    svgElement('stop', { offset: '100%', 'stop-color': '#ffc47b' }));
  const glow = svgElement('filter', { id: `${prefix}-glow`, x: '-60%', y: '-60%', width: '220%', height: '220%' });
  glow.append(svgElement('feGaussianBlur', { stdDeviation: 13 }));
  const style = svgElement('style');
  style.textContent = `text{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .iso-selectable{cursor:pointer;outline:none}.iso-selectable:focus-visible .iso-focus{opacity:1}
    .iso-selectable:hover .iso-hover{opacity:.55}.iso-focus,.iso-hover{pointer-events:none}`;
  defs.append(night, windowGradient, glow, style);
  scene.append(defs);
  const background = svgElement('g', { 'aria-hidden': 'true' });
  drawBackdrop(background, prefix);
  drawRoom(background, prefix);
  scene.append(background);
  const objects = svgElement('g');
  const lanternLayer = svgElement('g');
  const messageLayer = svgElement('g', { 'aria-hidden': 'true' });
  scene.append(objects, lanternLayer, messageLayer);
  wrapper.append(scene);
  container.append(wrapper);

  function metrics() {
    const bounds = wrapper.getBoundingClientRect();
    return {
      renderer: 'SVG/DOM isometric', mode: 'flat-iso', requestedMode: mode,
      assetStatus: 'Illustrative SVG assets; no external model assets loaded',
      assetEquivalence: 'Same semantic objects and palette; illustrations differ from the GLTF assets',
      sceneReadyMs, sceneReadyIncludes: 'First supplied state and two RAF callbacks after its SVG redraw',
      drawCalls: null, triangles: null, domNodeCount: wrapper.querySelectorAll('*').length,
      width: Math.round(bounds.width), height: Math.round(bounds.height),
      pixelScale: currentPixelScale, pixelScaleApplies: false,
      rafMedianMs: percentile(cadence, 0.5), rafP95Ms: percentile(cadence, 0.95), rafSampleCount: cadence.length,
      measurementNotes: 'Stationary SVG scene. RAF values measure browser callback cadence, not GPU or SVG render time. Pixel scaling is a 3D-only comparison factor.',
    };
  }

  function reportMetrics() {
    if (!destroyed) onMetrics?.(metrics());
  }

  function makeSelectable(group, id, label, bounds) {
    group.classList.add('iso-selectable');
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', label);
    group.setAttribute('aria-pressed', String(selectedId === id));
    group.setAttribute('data-object-id', id);
    const title = svgElement('title');
    title.textContent = label;
    group.prepend(title, svgElement('rect', { ...bounds, fill: '#fff', opacity: 0, 'pointer-events': 'all' }));
    group.append(svgElement('rect', { ...bounds, rx: 9, fill: 'none', stroke: '#fff0bb',
      'stroke-width': 2.5, opacity: 0, class: 'iso-focus' }));
    const select = (event) => {
      if (destroyed) return;
      event.stopPropagation();
      onSelect?.(id);
    };
    group.addEventListener('click', select);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(event);
      }
    });
  }

  function redraw() {
    if (destroyed) return;
    const focusId = scene.contains(document.activeElement) ? document.activeElement?.getAttribute('data-object-id') : null;
    objects.replaceChildren();
    lanternLayer.replaceChildren();
    messageLayer.replaceChildren();
    const furniture = Array.isArray(state.furniture) ? state.furniture
      .filter((item) => item && typeof item.id === 'string' && ['chair', 'table', 'lamp', 'plant'].includes(item.asset))
      .map(normalizeItem) : [];
    const renderables = furniture.map((item) => ({ depth: item.x + item.z, item }));
    renderables.push({ depth: -2.5, resident: 'alice', x: -2.7, z: 0.2 },
      { depth: 2.9, resident: 'bob', x: 2.7, z: 0.2 });
    renderables.sort((a, b) => a.depth - b.depth || (a.item?.id ?? a.resident).localeCompare(b.item?.id ?? b.resident));
    for (const renderable of renderables) {
      if (renderable.resident) {
        const group = svgElement('g', { 'aria-hidden': 'true' });
        drawResident(group, renderable.resident, renderable.x, renderable.z);
        objects.append(group);
        continue;
      }
      const { item } = renderable;
      const group = svgElement('g');
      const foot = project(item.x, item.z, 0.025);
      group.append(svgElement('ellipse', { cx: foot.x, cy: foot.y + 4,
        rx: item.asset === 'table' ? 57 : 29, ry: item.asset === 'table' ? 21 : 12, fill: '#332f39', opacity: 0.23 }));
      const ring = [[item.x - 0.55, item.z - 0.55, 0.025], [item.x + 0.55, item.z - 0.55, 0.025],
        [item.x + 0.55, item.z + 0.55, 0.025], [item.x - 0.55, item.z + 0.55, 0.025]];
      worldPolygon(group, ring, 'none', { stroke: selectedId === item.id ? '#fff0bb' : OWNERS[item.owner].light,
        'stroke-width': selectedId === item.id ? 3 : 2, opacity: selectedId === item.id ? 1 : 0, class: 'iso-hover' });
      if (item.asset === 'chair') drawChair(group, item);
      if (item.asset === 'table') drawTable(group, item);
      if (item.asset === 'lamp') drawLamp(group, item, prefix);
      if (item.asset === 'plant') drawPlant(group, item);
      const height = { chair: 86, table: 76, lamp: 115, plant: 100 }[item.asset];
      const width = item.asset === 'table' ? 134 : 100;
      makeSelectable(group, item.id, `${OWNERS[item.owner].name}'s ${item.asset}`,
        { x: foot.x - width / 2, y: foot.y - height, width, height: height + 24 });
      objects.append(group);
    }
    const lantern = svgElement('g');
    const centre = drawLantern(lantern, state.lantern?.parts, prefix);
    if (selectedId === 'lantern') {
      lantern.append(svgElement('ellipse', { cx: centre.x, cy: centre.y + 3, rx: 36, ry: 45,
        fill: 'none', stroke: '#fff0bb', 'stroke-width': 2.5 }));
    }
    makeSelectable(lantern, 'lantern', 'Shared lantern, with a colour contributed by each resident',
      { x: centre.x - 39, y: centre.y - 38, width: 78, height: 93 });
    lanternLayer.append(lantern);
    const message = typeof state.message === 'string' ? state.message : state.message?.text;
    if (typeof message === 'string' && message.trim()) {
      messageLayer.append(svgElement('rect', { x: 216, y: 717, width: 568, height: 29, rx: 14,
        fill: '#182b3e', opacity: 0.95 }));
      const displayText = message.trim().slice(0, 88);
      messageLayer.append(textElement(displayText, { x: 500, y: 737, fill: '#eddcc2',
        'font-size': 13, 'text-anchor': 'middle', textLength: displayText.length > 65 ? 534 : undefined,
        lengthAdjust: 'spacingAndGlyphs' }));
    }
    if (focusId) {
      const target = [...scene.querySelectorAll('[data-object-id]')]
        .find((element) => element.getAttribute('data-object-id') === focusId);
      target?.focus({ preventScroll: true });
    }
    reportMetrics();
  }

  function resize() {
    if (destroyed) return;
    const bounds = wrapper.getBoundingClientRect();
    scene.setAttribute('viewBox', bounds.width < 600 ? '90 145 820 615' : '0 0 1000 760');
    reportMetrics();
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(wrapper);
  if (!resizeObserver) window.addEventListener('resize', resize);
  redraw();
  resize();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  function sampleCadence(timestamp) {
    if (destroyed) return;
    if (previousFrame !== null) cadence.push(timestamp - previousFrame);
    previousFrame = timestamp;
    if (cadence.length < 180) cadenceHandle = requestAnimationFrame(sampleCadence);
    else reportMetrics();
  }
  cadenceHandle = requestAnimationFrame(sampleCadence);

  return {
    setState(nextState) {
      if (!destroyed && nextState && typeof nextState === 'object') {
        state = nextState;
        redraw();
        if (sceneReadyMs === null && !readyPending) {
          readyPending = true;
          readyHandle = requestAnimationFrame(() => {
            readyHandle = requestAnimationFrame(() => {
              if (destroyed) return;
              sceneReadyMs = Number((performance.now() - startedAt).toFixed(2));
              reportMetrics();
              onReady?.(metrics());
            });
          });
        }
      }
    },
    setSelection(id) {
      if (!destroyed) {
        selectedId = typeof id === 'string' ? id : null;
        redraw();
      }
    },
    setMode(nextMode) {
      mode = nextMode;
      reportMetrics();
    },
    setPixelScale(value) {
      currentPixelScale = Math.max(1, Math.min(4, finite(value, 2)));
      reportMetrics();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(cadenceHandle);
      cancelAnimationFrame(readyHandle);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', resize);
      wrapper.remove();
    },
  };
}
