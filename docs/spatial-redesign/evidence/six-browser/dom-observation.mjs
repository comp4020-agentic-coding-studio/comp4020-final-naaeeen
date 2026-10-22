/** Self-contained DOM reader: Playwright serializes this exact function. */
export function collectWorldPresence(canvas, identityScope) {
  const identities = identityScope?.identities;
  if (!Array.isArray(identities) || identities.length !== 6
    || identities.some(person => typeof person.id !== 'string' || !person.id || typeof person.name !== 'string' || !person.name.trim())
    || new Set(identities.map(person => person.id)).size !== 6
    || new Set(identities.map(person => person.name)).size !== 6
    || !identities.some(person => person.id === identityScope.selfId)) {
    throw new Error('Six distinct authenticated IDs and scripted names are required.');
  }
  const document = canvas.ownerDocument, window = document.defaultView;
  const c = canvas.getBoundingClientRect();
  const toRect = r => ({ left: r.left - c.left, top: r.top - c.top, right: r.right - c.left, bottom: r.bottom - c.top });
  const targets = JSON.parse(canvas.dataset.pickTargets || '[]')
    .filter(value => value.target.type === 'seat' && /^game-seat-[1-6]$/.test(value.target.seatId || ''))
    .map(value => {
      const x = c.left + value.x, y = c.top + value.y;
      return { seatId: value.target.seatId, x: value.x, y: value.y, visible: value.visible,
        inViewport: Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= window.innerWidth && y <= window.innerHeight,
        exposed: document.elementFromPoint(x, y) === canvas };
    });
  const labels = [...document.querySelectorAll('.house-world-label.avatar')].map(node => {
    // Read the actual display-name child. Quiet/Can chat and legacy data aliases
    // do not establish which authenticated identity this visible label names.
    const displayName = node.querySelector('.house-avatar-display-name')?.textContent?.trim() || '';
    const matches = identities.filter(person => displayName === person.name
      || person.id === identityScope.selfId && displayName === person.name + ' (you)');
    const id = matches.length === 1 ? matches[0].id : null;
    const r = node.getBoundingClientRect(), style = window.getComputedStyle(node);
    let clipped = false, ancestorShown = true;
    for (let parent = node; parent; parent = parent.parentElement) {
      const s = window.getComputedStyle(parent), p = parent.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity || 1) === 0) ancestorShown = false;
      if (parent !== node && ((/hidden|clip|auto|scroll/.test(s.overflowX) && (r.left < p.left - .5 || r.right > p.right + .5))
        || (/hidden|clip|auto|scroll/.test(s.overflowY) && (r.top < p.top - .5 || r.bottom > p.bottom + .5)))) clipped = true;
    }
    const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    return { id, displayName, mapping: id ? 'authenticated-script-name' : 'unmatched-name', ...toRect(r),
      visible: ancestorShown && !node.closest('[hidden]') && style.visibility === 'visible' && r.width > 0 && r.height > 0,
      clipped, exposed: Boolean(hit && (hit === canvas || node.contains(hit))) };
  });
  return { width: c.width, height: c.height, targets, labels, meshes: JSON.parse(canvas.dataset.avatarMeshBounds || '[]') };
}
