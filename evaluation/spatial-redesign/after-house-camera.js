/** Transient fixed-orientation framing. Inputs/outputs are camera-view coordinates, not player authority. */
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Largest HUD-free rectangle, recalculated only when viewport/control geometry changes.
 * @param {number} width @param {number} height
 * @param {{left:number,top:number,right:number,bottom:number}|null} viewport
 * @param {{x:number,y:number,w:number,h:number}[]} safeRects
 */
export function cameraPlayArea(width, height, viewport = null, safeRects = []) {
  const view = { x: Math.max(8, viewport?.left ?? 8), y: Math.max(8, viewport?.top ?? 8), w: 0, h: 0 };
  view.w = Math.max(1, Math.min(width - 8, viewport?.right ?? width - 8) - view.x);
  view.h = Math.max(1, Math.min(height - 8, viewport?.bottom ?? height - 8) - view.y);
  const blockers = safeRects.filter(r => [r.x, r.y, r.w, r.h].every(finite) && r.w > 0 && r.h > 0 && overlap(view, r)).map(r => ({ x: Math.max(view.x, r.x - 6), y: Math.max(view.y, r.y - 6), w: Math.min(view.x + view.w, r.x + r.w + 6) - Math.max(view.x, r.x - 6), h: Math.min(view.y + view.h, r.y + r.h + 6) - Math.max(view.y, r.y - 6) }));
  const xs = [...new Set([view.x, view.x + view.w, ...blockers.flatMap(r => [r.x, r.x + r.w])])].sort((a, b) => a - b);
  let best = null, bestScore = -Infinity;
  for (let left = 0; left < xs.length - 1; left++) for (let right = left + 1; right < xs.length; right++) {
    const intervals = blockers.filter(r => r.x < xs[right] && r.x + r.w > xs[left]).map(r => [r.y, r.y + r.h]).sort((a, b) => a[0] - b[0]);
    let top = view.y;
    for (const interval of [...intervals, [view.y + view.h, view.y + view.h]]) {
      if (interval[0] > top) {
        const r = { x: xs[left], y: top, w: xs[right] - xs[left], h: interval[0] - top };
        // A narrow peripheral sliver cannot comfortably contain an upright actor.
        const usable = r.w >= Math.min(120, view.w) && r.h >= Math.min(110, view.h);
        const centreDistance = Math.hypot(r.x + r.w / 2 - width / 2, r.y + r.h / 2 - height / 2);
        const score = r.w * r.h + (usable ? width * height : 0) - centreDistance * 0.01;
        if (score > bestScore) { best = r; bestScore = score; }
      }
      top = Math.max(top, interval[1]);
    }
  }
  // A fully covering panel has no unobstructed world; controls remain the fallback.
  return best ? { ...best, available: true } : { ...view, available: false };
}


/** Zoom is a transient multiplier; panning enters inspection until explicitly recentered. */
export function createHouseCamera({ reducedMotion = false } = {}) {
  let config = null, centre = null, mode = 'play', reset = true, previous = null;
  let zoom = 1, overviewBaseSpan = null, inspectionBaseSpan = null, followTarget = null, previousSelf = null, reframeSelf = false, activeFollowArea = null;
  function configure(value) {
    const changedExtent = !config || value.width !== config.width || value.height !== config.height ||
      JSON.stringify(value.bounds) !== JSON.stringify(config.bounds) || JSON.stringify(value.viewport) !== JSON.stringify(config.viewport);
    reframeSelf = reframeSelf || !config || value.width !== config.width || value.height !== config.height || JSON.stringify(value.viewport) !== JSON.stringify(config.viewport);
    config = { ...value, area: cameraPlayArea(value.width, value.height, value.viewport, value.safeRects) };
    // Movable HUD controls do not own the camera. Preserve centre, mode and zoom.
    if (changedExtent) overviewBaseSpan = null;
  }
  function setMode(value) {
    if (!['play', 'overview', 'inspection'].includes(value)) return false;
    if (value === 'play') reset = true;
    if (value === 'overview') { zoom = 1; overviewBaseSpan = null; reset = true; }
    if (value === 'inspection' && mode !== value) inspectionBaseSpan = previous ? (previous.top - previous.bottom) * zoom : null;
    mode = value; followTarget = null; return true;
  }
  function setZoom(value) {
    if (!finite(value)) return false;
    const next = clamp(value, 0.65, 1.8);
    if (next !== zoom) reframeSelf = true;
    zoom = next; return true;
  }
  function pan(dx, dy) {
    if (!previous || !finite(dx) || !finite(dy)) return false;
    setMode('inspection');
    centre.x -= dx / previous.pxPerUnit; centre.y += dy / previous.pxPerUnit;
    return true;
  }
  return {
    configure, setMode, getMode: () => mode, setZoom, getZoom: () => zoom, pan,
    setReducedMotion(value) { reducedMotion = !!value; },
    recenter() { return setMode('play'); },
    reset() { centre = null; reset = true; previous = null; previousSelf = null; followTarget = null; activeFollowArea = null; overviewBaseSpan = null; inspectionBaseSpan = null; },
    /** @param {{x:number,y:number}} self @param {number} elapsed @param {boolean} editing
     * @param {{minX:number,maxX:number,minY:number,maxY:number}|null} selfExtents */
    frame(self, elapsed, editing = false, selfExtents = null) {
      if (!config) return null;
      const { width, height, bounds, uprightHeight, area } = config;
      const effectiveMode = editing ? 'inspection' : mode;
      const focus = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
      // Smooth viewport adaptation avoids a scale threshold and never depends on HUD dragging.
      const desired = 72 + clamp((width - 390) / 710, 0, 1) * 56;
      const actorHeight = Math.min(desired, height * 0.2);
      const playBaseSpan = height * Math.max(0.01, uprightHeight) / Math.max(24, actorHeight);
      let baseSpan = playBaseSpan;
      if (effectiveMode === 'overview') {
        if (overviewBaseSpan === null) {
          overviewBaseSpan = Math.max((bounds.maxY - bounds.minY) * height / Math.max(1, area.h - 24),
            (bounds.maxX - bounds.minX) * height / Math.max(1, area.w - 24));
          const fitScale = height / (overviewBaseSpan / zoom);
          centre = { x: (bounds.minX + bounds.maxX) / 2 - (focus.x - width / 2) / fitScale,
            y: (bounds.minY + bounds.maxY) / 2 + (focus.y - height / 2) / fitScale };
        }
        baseSpan = overviewBaseSpan;
      } else if (effectiveMode === 'inspection') {
        if (inspectionBaseSpan === null) inspectionBaseSpan = previous ? (previous.top - previous.bottom) * zoom : playBaseSpan;
        baseSpan = inspectionBaseSpan;
      }
      const span = baseSpan / zoom, pxPerUnit = height / span;
      const moving = reframeSelf || !previousSelf || Math.hypot(self.x - previousSelf.x, self.y - previousSelf.y) > 0.000001;
      // HUD dragging does not own a stationary camera, including its settling target.
      if (moving || !activeFollowArea || reset) activeFollowArea = { ...area };
      const followArea = activeFollowArea;
      const measured = selfExtents && ['minX', 'maxX', 'minY', 'maxY'].every(key => finite(selfExtents[key]));
      const envelope = measured ? selfExtents : {
        minX: -24 / pxPerUnit, maxX: 24 / pxPerUnit,
        minY: -uprightHeight / 2 - 8 / pxPerUnit, maxY: uprightHeight / 2 + 8 / pxPerUnit,
      };
      const screenPoint = () => ({ x: width / 2 + (self.x - centre.x) * pxPerUnit, y: height / 2 - (self.y - centre.y) * pxPerUnit });
      const safe = {
        minX: followArea.x - envelope.minX * pxPerUnit,
        maxX: followArea.x + followArea.w - envelope.maxX * pxPerUnit,
        minY: followArea.y + envelope.maxY * pxPerUnit,
        maxY: followArea.y + followArea.h + envelope.minY * pxPerUnit,
      };
      // A genuinely smaller space cannot contain a larger mesh; retain its centre.
      if (safe.minX > safe.maxX) safe.minX = safe.maxX = (safe.minX + safe.maxX) / 2;
      if (safe.minY > safe.maxY) safe.minY = safe.maxY = (safe.minY + safe.maxY) / 2;

      if (!centre || (reset && effectiveMode === 'play')) {
        centre = { x: self.x - (focus.x - width / 2) / pxPerUnit, y: self.y + (focus.y - height / 2) / pxPerUnit };
        followTarget = null; activeFollowArea = { ...area };
      } else if (effectiveMode === 'play') {
        if (moving) {
          const screen = screenPoint();
          const focus = { x: followArea.x + followArea.w / 2, y: followArea.y + followArea.h / 2 };
          const deadW = Math.max(0, Math.min(followArea.w * 0.4, safe.maxX - safe.minX));
          const deadH = Math.max(0, Math.min(followArea.h * 0.4, safe.maxY - safe.minY));
          const minX = clamp(focus.x - deadW / 2, safe.minX, safe.maxX), maxX = clamp(focus.x + deadW / 2, safe.minX, safe.maxX);
          const minY = clamp(focus.y - deadH / 2, safe.minY, safe.maxY), maxY = clamp(focus.y + deadH / 2, safe.minY, safe.maxY);
          const dx = screen.x - clamp(screen.x, minX, maxX), dy = screen.y - clamp(screen.y, minY, maxY);
          followTarget = { x: centre.x + dx / pxPerUnit, y: centre.y - dy / pxPerUnit };
        }
        if (followTarget) {
          const blend = reducedMotion ? 1 : 1 - Math.exp(-clamp(elapsed, 0, 0.25) / 0.14);
          centre.x += (followTarget.x - centre.x) * blend; centre.y += (followTarget.y - centre.y) * blend;
          if (Math.abs(followTarget.x - centre.x) * pxPerUnit < 0.1) centre.x = followTarget.x;
          if (Math.abs(followTarget.y - centre.y) * pxPerUnit < 0.1) centre.y = followTarget.y;
        }
      }
      if (effectiveMode === 'play') {
        // Constrain explicit recenter and easing with the same posed render envelope.
        const current = screenPoint();
        centre.x += (current.x - clamp(current.x, safe.minX, safe.maxX)) / pxPerUnit;
        centre.y -= (current.y - clamp(current.y, safe.minY, safe.maxY)) / pxPerUnit;
      }
      // Permit inspection near the room edge while preventing indefinite lost-world pan.
      if (effectiveMode !== 'overview') {
        centre.x = clamp(centre.x, bounds.minX - span * width / height, bounds.maxX + span * width / height);
        centre.y = clamp(centre.y, bounds.minY - span, bounds.maxY + span);
      }
      reset = false; reframeSelf = false; previousSelf = { ...self };
      const horizontal = span * width / height;
      const value = { left: centre.x - horizontal / 2, right: centre.x + horizontal / 2,
        top: centre.y + span / 2, bottom: centre.y - span / 2, area: { ...area }, mode: effectiveMode,
        zoom, pxPerUnit, changed: false };
      value.changed = !previous || ['left', 'right', 'top', 'bottom'].some(key => Math.abs(value[key] - previous[key]) * pxPerUnit > 0.001);
      previous = value; return value;
    },
  };
}
