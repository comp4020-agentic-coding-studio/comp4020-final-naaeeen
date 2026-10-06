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

export function createHouseCamera({ reducedMotion = false } = {}) {
  let config = null, centre = null, mode = 'play', reset = true, previous = null;
  function configure(value) { config = { ...value, area: cameraPlayArea(value.width, value.height, value.viewport, value.safeRects) }; reset = true; }
  function setMode(value) { if (value !== 'play' && value !== 'overview') return false; mode = value; reset = true; return true; }
  return {
    configure, setMode, getMode: () => mode,
    reset() { centre = null; reset = true; previous = null; },
    frame(self, elapsed, editing = false) {
      if (!config) return null;
      const { width, height, bounds, uprightHeight, area } = config;
      const overview = mode === 'overview' || editing;
      let span, pxPerUnit;
      const focus = { x: area.x + area.w / 2, y: area.y + area.h / 2 };
      if (overview) {
        span = Math.max((bounds.maxY - bounds.minY) * height / Math.max(1, area.h - 24), (bounds.maxX - bounds.minX) * height / Math.max(1, area.w - 24));
        pxPerUnit = height / span;
        centre = { x: (bounds.minX + bounds.maxX) / 2 - (focus.x - width / 2) / pxPerUnit, y: (bounds.minY + bounds.maxY) / 2 + (focus.y - height / 2) / pxPerUnit };
      } else {
        const desired = width < 700 ? 72 : 128;
        // Extremely short simulated viewports cannot fit the normal phone target.
        const actorHeight = Math.min(desired, height * 0.2, Math.max(24, area.h - 16));
        pxPerUnit = actorHeight / Math.max(0.01, uprightHeight); span = height / pxPerUnit;
        const centered = { x: self.x - (focus.x - width / 2) / pxPerUnit, y: self.y + (focus.y - height / 2) / pxPerUnit };
        if (!centre || reset) centre = centered;
        else {
          const screen = { x: width / 2 + (self.x - centre.x) * pxPerUnit, y: height / 2 - (self.y - centre.y) * pxPerUnit };
          const deadW = Math.max(0, Math.min(area.w * 0.4, area.w - 48)), deadH = Math.max(0, Math.min(area.h * 0.4, area.h - actorHeight - 24));
          const dx = screen.x - clamp(screen.x, focus.x - deadW / 2, focus.x + deadW / 2), dy = screen.y - clamp(screen.y, focus.y - deadH / 2, focus.y + deadH / 2);
          const target = { x: centre.x + dx / pxPerUnit, y: centre.y - dy / pxPerUnit };
          const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.min(Math.max(elapsed, 0), 0.25) / 0.14);
          centre.x += (target.x - centre.x) * blend; centre.y += (target.y - centre.y) * blend;
          // Settle subpixel motion and correct hard safe bounds immediately, without moving the actor.
          if (Math.abs(target.x - centre.x) * pxPerUnit < 0.1) centre.x = target.x;
          if (Math.abs(target.y - centre.y) * pxPerUnit < 0.1) centre.y = target.y;
          const currentX = width / 2 + (self.x - centre.x) * pxPerUnit, currentY = height / 2 - (self.y - centre.y) * pxPerUnit;
          centre.x += (currentX - clamp(currentX, area.x + Math.min(24, area.w / 2), area.x + area.w - Math.min(24, area.w / 2))) / pxPerUnit;
          centre.y -= (currentY - clamp(currentY, area.y + actorHeight / 2 + 8, area.y + area.h - actorHeight / 2 - 8)) / pxPerUnit;
        }
        // Pan is bounded to the authorised room extent plus one visible span.
        centre.x = clamp(centre.x, bounds.minX - span * width / height, bounds.maxX + span * width / height);
        centre.y = clamp(centre.y, bounds.minY - span, bounds.maxY + span);
      }
      reset = false;
      const horizontal = span * width / height;
      const value = { left: centre.x - horizontal / 2, right: centre.x + horizontal / 2, top: centre.y + span / 2, bottom: centre.y - span / 2, area: { ...area }, mode: overview ? 'overview' : 'play', pxPerUnit, changed: false };
      value.changed = !previous || ['left', 'right', 'top', 'bottom'].some(key => Math.abs(value[key] - previous[key]) * pxPerUnit > 0.001);
      previous = value; return value;
    },
  };
}
