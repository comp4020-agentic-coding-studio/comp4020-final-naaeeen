/** Pure screen layout and transient speech policy. No browser globals or saved state. */
/** @typedef {{x:number,y:number,w:number,h:number}} Rect */
/** @typedef {{left:number,top:number,right:number,bottom:number}} Viewport */
/** @typedef {{id:string,anchor:{x:number,y:number},w:number,h:number,priority?:number,previous?:Rect}} Label */
const finite = value => typeof value === 'number' && Number.isFinite(value);
const intersects = (a, b, gap = 0) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

/** Deterministic bounded packing. Hidden means no collision-free space exists. @param {Label[]} items @param {Viewport} viewport @param {Rect[]} safeRects */
export function layoutLabels(items, viewport, safeRects = []) {
  const result = new Map(), occupied = safeRects.filter(r => [r.x, r.y, r.w, r.h].every(finite) && r.w > 0 && r.h > 0);
  const ordered = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const item of ordered) {
    const width = viewport.right - viewport.left, height = viewport.bottom - viewport.top;
    const ideal = { x: item.anchor.x - item.w / 2, y: item.anchor.y - item.h, w: item.w, h: item.h };
    const clamp = r => ({ ...r, x: Math.max(viewport.left, Math.min(viewport.right - r.w, r.x)), y: Math.max(viewport.top, Math.min(viewport.bottom - r.h, r.y)) });
    const fits = r => r.x >= viewport.left && r.y >= viewport.top && r.x + r.w <= viewport.right && r.y + r.h <= viewport.bottom && !occupied.some(other => intersects(r, other, 5));
    let best = null, bestCost = Infinity;
    if ([item.w, item.h, item.anchor.x, item.anchor.y].every(finite) && item.w > 0 && item.h > 0 && item.w <= width && item.h <= height) {
      const previous = item.previous ? { ...item.previous, x: item.previous.x + (item.previous.w - item.w) / 2, y: item.previous.y + item.previous.h - item.h, w: item.w, h: item.h } : null;
      if (previous && fits(previous) && Math.hypot(previous.x + previous.w / 2 - item.anchor.x, previous.y + previous.h - item.anchor.y) < 220) { best = { ...previous }; bestCost = -1; }
      if (!best) {
        // At most 189 candidates per label; all geometry uses cached pixel dimensions.
        for (let row = -10; row <= 10; row++) for (let column = -4; column <= 4; column++) {
          const r = clamp({ ...ideal, x: ideal.x + column * (item.w + 6) / 2, y: viewport.top + (Math.round((ideal.y - viewport.top) / (item.h + 6)) + row) * (item.h + 6) });
          if (!fits(r)) continue;
          const dx = r.x - ideal.x, dy = r.y - ideal.y, cost = dx * dx + 2 * dy * dy;
          if (cost < bestCost) { best = r; bestCost = cost; }
        }
      }
    }
    const placed = { id: item.id, rect: best ?? clamp(ideal), anchor: { ...item.anchor }, hidden: !best };
    result.set(item.id, placed); if (best) occupied.push(best);
  }
  return items.map(item => result.get(item.id));
}

/** Body text is one visually clipped line under the attributed Chat hint. */
export function formatBubble(text, limit = 80) {
  const points = Array.from(String(text).replace(/\s+/gu, ' ').trim());
  return { preview: points.length <= limit ? points.join('') : points.slice(0, limit - 1).join('') + '…', truncated: points.length > limit };
}

/** Initial/reconnected history is a baseline. Only new sequence delivery is fresh speech. */
export function createBubbleFeed() {
  let scope = null, watermark = -1, clock = 0;
  const seen = new Set(), active = new Map();
  const time = value => { if (finite(value)) clock = Math.max(clock, value); return clock; };
  const prune = now => { for (const [author, entry] of active) if (now - entry.arrivedAt >= 4000) active.delete(author); };
  function remember(id) { seen.add(id); while (seen.size > 400) seen.delete(seen.values().next().value); }
  function clear() { scope = null; watermark = -1; seen.clear(); active.clear(); }
  return {
    ingest(nextScope, messages, options, now) {
      const currentTime = time(now), baseline = nextScope !== scope;
      if (baseline) { clear(); scope = nextScope; }
      const eligible = options.visibleAuthors;
      for (const author of active.keys()) if (!eligible.has(author)) active.delete(author);
      if (options.quiet) active.clear();
      const ordered = [...messages].filter(m => m && typeof m.id === 'string' && finite(m.sequence)).sort((a, b) => a.sequence - b.sequence);
      for (const message of ordered) {
        const fresh = !baseline && message.sequence > watermark && !seen.has(message.id);
        remember(message.id); watermark = Math.max(watermark, message.sequence);
        if (fresh && !options.quiet && eligible.has(message.authorId)) {
          active.set(message.authorId, { id: message.id, authorId: message.authorId, name: message.name, ...formatBubble(message.text), sequence: message.sequence, arrivedAt: currentTime });
        }
      }
      prune(currentTime);
    },
    visible(now) { prune(time(now)); return [...active.values()].sort((a, b) => b.arrivedAt - a.arrivedAt || b.sequence - a.sequence).slice(0, 3); },
    clear,
    stats: () => ({ seen: seen.size, active: active.size }),
  };
}
