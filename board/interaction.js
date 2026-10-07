/** Companion text tools own their keyboard, pointer, paste and wheel events. */
export function isolateToolEvents(node) {
  const stop = event => event.stopPropagation();
  const events = ["keydown", "keyup", "keypress", "wheel", "paste", "copy", "cut", "pointerdown"];
  for (const name of events) node.addEventListener(name, stop);
  return () => { for (const name of events) node.removeEventListener(name, stop); };
}
export function clampWindow(position, size, viewport) {
  return { x: Math.max(8, Math.min(position.x, Math.max(8, viewport.width - size.width - 8))), y: Math.max(64, Math.min(position.y, Math.max(64, viewport.height - size.height - 8))) };
}
export function attachFloatingWindow(node, handle, resize, { window: host = globalThis.window, onChange = () => {} } = {}) {
  let operation = null;
  function start(event, mode) {
    if (event.button !== 0 || host.innerWidth <= 700 || event.target.closest("button")) return;
    event.preventDefault(); event.stopPropagation();
    const rect = node.getBoundingClientRect(); operation = { mode, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    (mode === "move" ? handle : resize).setPointerCapture?.(event.pointerId);
  }
  const startMove = event => start(event, "move"), startResize = event => start(event, "resize");
  function move(event) {
    if (!operation) return;
    if (operation.mode === "move") {
      const point = clampWindow({ x: operation.left + event.clientX - operation.x, y: operation.top + event.clientY - operation.y }, { width: operation.width, height: operation.height }, { width: host.innerWidth, height: host.innerHeight });
      Object.assign(node.style, { left: `${point.x}px`, top: `${point.y}px`, right: "auto", bottom: "auto" });
    } else Object.assign(node.style, { width: `${Math.max(280, Math.min(operation.width + event.clientX - operation.x, host.innerWidth - operation.left - 8))}px`, height: `${Math.max(180, Math.min(operation.height + event.clientY - operation.y, host.innerHeight - operation.top - 8))}px` });
    onChange();
  }
  function end() { operation = null; }
  function resized() {
    if (host.innerWidth <= 700) { node.style.cssText = ""; return; }
    const rect = node.getBoundingClientRect(), point = clampWindow({ x: rect.left, y: rect.top }, { width: Math.min(rect.width, host.innerWidth - 16), height: Math.min(rect.height, host.innerHeight - 80) }, { width: host.innerWidth, height: host.innerHeight });
    if (node.style.left) Object.assign(node.style, { left: `${point.x}px`, top: `${point.y}px`, width: `${Math.min(rect.width, host.innerWidth - 16)}px`, height: `${Math.min(rect.height, host.innerHeight - 80)}px` });
  }
  handle.addEventListener("pointerdown", startMove); resize.addEventListener("pointerdown", startResize);
  host.addEventListener("pointermove", move); host.addEventListener("pointerup", end); host.addEventListener("pointercancel", end); host.addEventListener("resize", resized);
  return () => { handle.removeEventListener("pointerdown", startMove); resize.removeEventListener("pointerdown", startResize); host.removeEventListener("pointermove", move); host.removeEventListener("pointerup", end); host.removeEventListener("pointercancel", end); host.removeEventListener("resize", resized); };
}
export function returnFromBoard(host = globalThis.window) {
  if (new URL(host.location.href).searchParams.get("embedded") === "1" && host.parent !== host) host.parent.postMessage({ type: "night-board-close" }, host.location.origin);
  else host.location.assign("/");
}

/** A private proof is held only in this dialog's memory, never the board outbox. */
export function createIdentityActions(options) {
  const fetcher = options.fetch || globalThis.fetch.bind(globalThis);
  const state = { busy: false, proof: "", error: "" };
  let generation = 0, closed = false, abort = null;
  const getState = () => ({ ...state });
  const notify = () => { if (!closed) options.onChange?.(getState()); };
  function invalidate() { generation++; abort?.abort(); state.proof = ""; state.error = ""; notify(); }
  function close() { invalidate(); closed = true; }
  async function request(path, body, actorId, signal) {
    const response = await fetcher(path, { credentials: "same-origin", cache: "no-store", signal,
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json", "X-House-Identity": actorId }) },
      ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.message || "The identity action could not be completed.");
    return result;
  }
  async function perform(kind, proof) {
    if (closed || state.busy) return false;
    const actorId = options.getIdentityId();
    if (!actorId) { state.error = "Your identity changed. Reopen the board before continuing."; notify(); return false; }
    if (kind === "recover" && (!proof || !proof.trim())) { state.error = "Enter your private recovery key."; notify(); return false; }
    const originalGeneration = generation; abort = new AbortController(); state.proof = ""; state.error = ""; state.busy = true; notify();
    let timer;
    try {
      const operation = (async () => {
        const result = await request(kind === "issue" ? "/api/house/recovery-key" : "/api/house/recover", kind === "issue" ? {} : { proof: proof.trim() }, actorId, abort.signal);
        if (closed || originalGeneration !== generation || options.getIdentityId() !== actorId) return false;
        const current = await request(kind === "issue" ? "/api/house/me" : "/api/board/context", undefined, actorId, abort.signal);
        if (closed || originalGeneration !== generation || options.getIdentityId() !== actorId) return false;
        if (current.identity?.id !== (kind === "issue" ? actorId : result.identity?.id)) throw new Error("Your identity changed before the reply arrived. Reopen the board before continuing.");
        if (kind === "issue") {
          if (typeof result.proof !== "string" || !result.proof) throw new Error("A private key was not returned. Retry when connected.");
          state.proof = result.proof; notify();
        } else { state.proof = ""; options.onRecovered?.(current); }
        return true;
      })();
      return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => { generation++; abort?.abort(); state.proof = ""; state.error = "The identity reply did not arrive. Reopen the dialog and try again when connected."; notify(); reject(new Error(state.error)); }, options.timeoutMs || 8000); })]);
    } catch (error) {
      if (!closed && originalGeneration === generation && options.getIdentityId() === actorId) { state.proof = ""; state.error = error.name === "AbortError" ? "The identity action was interrupted. Try again when connected." : error.message; notify(); }
      return false;
    } finally { clearTimeout(timer); state.busy = false; abort = null; notify(); }
  }
  return { issue: () => perform("issue"), recover: proof => perform("recover", proof), invalidate, close, getState };
}
