import React, { useEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, MainMenu, CaptureUpdateAction, convertToExcalidrawElements, reconcileElements, exportToBlob, serializeAsJSON } from "@excalidraw/excalidraw";
import { io } from "socket.io-client";
import "@excalidraw/excalidraw/index.css";
import "./workspace.css";
import { createBoardClient, sanitizeElements, validateImageFile, safeLink } from "./client.js";
import { attachFloatingWindow, isolateToolEvents, returnFromBoard, createIdentityActions } from "./interaction.js";
const COLOURS = { amber: "#e8b45a", sage: "#8aa990", rose: "#d994a1", blue: "#8aabc5", lavender: "#aa9ac5", peach: "#dcaa88" };
const labels = { connecting: "Opening board", saved: "All changes saved", pending: "Changes pending", reconnecting: "Reconnecting", error: "Save needs attention", revoked: "Access changed" };
function download(value, name, mime = "application/json") {
  const blob = value instanceof Blob ? value : new Blob([value], { type: mime }), url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function api(path, body, identityId) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(8000), headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(identityId ? { "X-House-Identity": identityId } : {}) }, ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
  const result = await response.json(); if (!response.ok || result.ok === false) throw Object.assign(new Error(result.message || "The house is temporarily unavailable."), { code: result.code }); return result;
}
function Admission({ me, reload, feedback, recover }) {
  const [name, setName] = useState(me.identity.name === "Study friend" ? "" : me.identity.name), [colour, setColour] = useState(me.identity.colour || "sage"), [capacity, setCapacity] = useState(4), [code, setCode] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const original = useRef(null), mounted = useRef(true); useEffect(() => () => { mounted.current = false; }, []);
  async function enter(event, type) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const payload = { name: name.trim(), colour, ...(type === "house.create" ? { capacity: Number(capacity) } : { code: code.trim().toUpperCase() }) };
    if (!payload.name) { setError("Choose a name your friends will recognise."); setBusy(false); return; }
    const key = JSON.stringify([type, payload]);
    if (!original.current) { try { original.current = JSON.parse(sessionStorage.getItem(`night-board-admission:${me.identity.id}`)); } catch {} }
    if (original.current && original.current.key !== key) { setError("Your previous admission is pending. Retry its original values or reload to check your saved house first."); setBusy(false); return; }
    const intent = original.current || { key, command: { commandId: crypto.randomUUID(), type, payload } }; original.current = intent;
    try {
      sessionStorage.setItem(`night-board-admission:${me.identity.id}`, JSON.stringify(intent));
      await api("/api/house/command", intent.command, me.identity.id);
      sessionStorage.removeItem(`night-board-admission:${me.identity.id}`); original.current = null; if (mounted.current) await reload();
    } catch (failure) {
      try { const context = await api("/api/house/me"); if (context.identity.id === me.identity.id && context.home) { sessionStorage.removeItem(`night-board-admission:${me.identity.id}`); original.current = null; if (mounted.current) await reload(); return; } } catch {}
      if (![undefined, "TIMEOUT", "STORAGE_UNAVAILABLE", "PENDING", "ALREADY_MEMBER"].includes(failure.code) && !["TimeoutError", "AbortError"].includes(failure.name)) { original.current = null; sessionStorage.removeItem(`night-board-admission:${me.identity.id}`); }
      if (mounted.current) setError(failure.message || "The reply was interrupted. Retry keeps your original admission.");
    } finally { if (mounted.current) setBusy(false); }
  }
  return <main className="board-admission"><a className="back-link" href="/">← Night Neighbourhood</a><div className="admission-card"><span className="eyebrow">A place for your shared thoughts</span><h1>Your house board</h1><p>Draw, write and think together. Join your friends’ private house or make one for your group.</p><label>Your name<input autoComplete="nickname" maxLength={32} value={name} onChange={e => setName(e.target.value)} required /></label><label>Your colour<select value={colour} onChange={e => setColour(e.target.value)}>{Object.keys(COLOURS).map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></label><div className="admission-actions"><form onSubmit={e => enter(e, "house.create")}><h2>Create a house</h2><label>Permanent places<select value={capacity} onChange={e => setCapacity(e.target.value)}>{[2,3,4,5,6].map(n => <option key={n} value={n}>{n} friends</option>)}</select></label><button className="primary" disabled={busy}>Create house</button></form><form onSubmit={e => enter(e, "house.join")}><h2>Join friends</h2><label>House code<input autoComplete="off" maxLength={8} value={code} onChange={e => setCode(e.target.value)} required /></label><button disabled={busy}>Join house</button></form></div><button className="recover-identity" type="button" onClick={recover} disabled={busy}>Recover my identity</button><p role="alert" className="tool-error">{error || feedback}</p><p className="small-print">The board is shared with every current resident. You can edit everyone’s canvas objects. Study cards in the house remain separate.</p></div></main>;
}
function IdentityDialog({ kind, actions, state, close }) {
  const root = useRef(null), [key, setKey] = useState(""), [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const node = root.current, isolate = isolateToolEvents(node);
    const keyboard = event => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const fields = [...node.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')], first = fields[0], last = fields.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    node.addEventListener("keydown", keyboard); node.querySelector("input,button")?.focus();
    return () => { node.removeEventListener("keydown", keyboard); isolate(); };
  }, []);
  return <div className="board-modal-backdrop"><section ref={root} className="board-modal identity-modal" role="dialog" aria-modal="true" aria-labelledby="identity-heading"><h2 id="identity-heading">{kind === "issue" ? "Your private identity" : "Recover your identity"}</h2>{kind === "issue" ? <><p>Keep a private key so you can return to your saved house from another browser. Treat it like a password. Generating a key replaces your previous key.</p><button className="primary" disabled={state.busy || Boolean(state.proof)} onClick={() => void actions.issue()}>{state.busy ? "Generating…" : "Generate private key"}</button>{state.proof && <div className="private-key"><label htmlFor="issued-identity-key">Private recovery key</label><input id="issued-identity-key" type={revealed ? "text" : "password"} autoComplete="off" readOnly value={state.proof} onFocus={event => event.target.select()} /><label className="reveal-key"><input type="checkbox" checked={revealed} onChange={event => setRevealed(event.target.checked)} />Show key to copy it</label><p>Save this key somewhere private. It disappears from this dialog when you close it.</p></div>}</> : <><p>Use the private key you saved earlier. Recovery restores your existing place, even when the house is full.</p><form onSubmit={event => { event.preventDefault(); const submitted = key; setKey(""); void actions.recover(submitted); }}><label htmlFor="recover-identity-key">Your private recovery key</label><input id="recover-identity-key" type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} maxLength={256} disabled={state.busy} required /><button className="primary" disabled={state.busy || !key.trim()}>{state.busy ? "Recovering…" : "Recover identity"}</button></form></>}<p className="tool-error" role="alert">{state.error}</p><div className="modal-actions"><button onClick={() => { setKey(""); setRevealed(false); close(); }}>{state.busy ? "Cancel" : "Done"}</button></div></section></div>;
}

function CompanionChat({ state, client, collapsed, setCollapsed }) {
  const root = useRef(null), handle = useRef(null), resize = useRef(null), log = useRef(null), [unread, setUnread] = useState(0);
  useEffect(() => {
    const clear = isolateToolEvents(root.current), release = attachFloatingWindow(root.current, handle.current, resize.current), textarea = root.current.querySelector("textarea");
    const send = event => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); void client.sendChat(); } };
    textarea.addEventListener("keydown", send);
    return () => { textarea.removeEventListener("keydown", send); clear(); release(); };
  }, [client]);
  const lastMessages = useRef(state.chat.length);
  useEffect(() => { if (state.chat.length > lastMessages.current) { if (collapsed) setUnread(n => n + state.chat.length - lastMessages.current); else if (log.current) log.current.scrollTop = log.current.scrollHeight; } lastMessages.current = state.chat.length; }, [state.chat, collapsed]);
  const toggle = () => { setCollapsed(!collapsed); setUnread(0); };
  return <aside ref={root} className={`chat-window${collapsed ? " collapsed" : ""}`} aria-label="Companion chat"><header ref={handle} className="chat-handle"><div><strong>House chat</strong><span>Everyone in this house</span></div><button onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expand house chat" : "Collapse house chat"}>{collapsed ? `Open${unread ? ` · ${unread}` : ""} ↑` : "−"}</button></header><div className="chat-content" hidden={collapsed}><div ref={log} className="chat-log" role="log" aria-live="polite" aria-label="House board conversation">{!state.chat.length && <p className="chat-empty">A thought, a question, a little encouragement.<br />Write alongside the canvas.</p>}{state.chat.map(message => <article className={message.authorId === state.identityId ? "own-message" : ""} key={message.id}><div><strong>{message.name}</strong><time dateTime={new Date(message.at).toISOString()}>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div><p>{message.text}</p></article>)}</div><form onSubmit={event => { event.preventDefault(); void client.sendChat(); }}><label className="sr-only" htmlFor="board-chat-draft">Message to everyone in your house</label><textarea id="board-chat-draft" placeholder="Write to your house…" value={state.draft} maxLength={4000} rows={3} onChange={event => client.setDraft(event.target.value)} disabled={state.status === "revoked"} /><div className="chat-compose-footer"><span>Ctrl/⌘ + Enter to send</span><button className="primary" disabled={!state.draft.trim() || state.status === "revoked"}>Send</button></div></form><p className="chat-retention">Last 100 messages · retained for seven days</p></div><div ref={resize} className="chat-resize" aria-hidden="true" /></aside>;
}
function StickyDialog({ add, close }) {
  const ref = useRef(null), [text, setText] = useState(""), [colour, setColour] = useState("#fff3bf");
  useEffect(() => { const clear = isolateToolEvents(ref.current); ref.current.querySelector("textarea").focus(); return clear; }, []);
  return <div className="board-modal-backdrop"><section ref={ref} className="board-modal" role="dialog" aria-modal="true" aria-labelledby="sticky-heading"><h2 id="sticky-heading">A sticky note</h2><p>A note and its coloured paper move together. Double-click its text to edit later.</p><form onSubmit={event => { event.preventDefault(); if (text.trim()) { add(text, colour); close(); } }}><label htmlFor="sticky-text">Your note</label><textarea id="sticky-text" value={text} onChange={event => setText(event.target.value)} rows={5} maxLength={4000} placeholder="What are you thinking about?" /><fieldset><legend>Paper colour</legend><div className="sticky-colours">{["#fff3bf", "#d3f9d8", "#ffe3e3", "#d0ebff", "#e5dbff"].map(value => <button type="button" key={value} style={{ background: value }} onClick={() => setColour(value)} aria-label={`Paper ${value}`} aria-pressed={colour === value}>{colour === value ? "✓" : ""}</button>)}</div></fieldset><div className="modal-actions"><button type="button" onClick={close}>Cancel</button><button className="primary" disabled={!text.trim()}>Place note</button></div></form></section></div>;
}

function Workspace({ me, reload, openIdentity, invalidateIdentity }) {
  const [state, setState] = useState({ status: "connecting", pending: 0, error: "", elements: [], files: [], views: [], chat: [], conflicts: [], draft: "", identityId: me.identity.id, houseId: me.home.id }), [apiInstance, setApi] = useState(null), [chatCollapsed, setChatCollapsed] = useState(false), [sticky, setSticky] = useState(false), [notice, setNotice] = useState(""), [details, setDetails] = useState(false);
  const apiRef = useRef(null), clientRef = useRef(null), latestScene = useRef([]), fileInput = useRef(null), initializedApi = useRef(false), lifecycle = useRef(0);
  const applyScene = useCallback((elements, reset, captureLocal = false) => {
    latestScene.current = elements;
    const editor = apiRef.current; if (!editor) return;
    if (reset) { editor.resetScene(); editor.history.clear(); initializedApi.current = false; return; }
    const current = editor.getSceneElementsIncludingDeleted(), merged = reconcileElements(current, elements, editor.getAppState());
    editor.updateScene({ elements: merged, captureUpdate: captureLocal ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.NEVER });
  }, []);
  useEffect(() => {
    const generation = ++lifecycle.current;
    const client = createBoardClient({ identityId: me.identity.id, houseId: me.home.id, socketFactory: namespace => io(namespace, { transports: ["websocket", "polling"], autoConnect: true, forceNew: true }),
      onState: next => { if (lifecycle.current === generation) { if (next.status === "revoked") invalidateIdentity(); setState(next); } }, onScene: applyScene,
      onFiles: (files, reset) => { if (lifecycle.current !== generation) return; if (!reset) apiRef.current?.addFiles(files); },
      onPresence: views => { if (lifecycle.current !== generation || !apiRef.current) return; const collaborators = new Map(views.filter(view => view.id !== me.identity.id).map(view => [view.id, { username: view.name, id: view.id, color: { background: COLOURS[view.colour] || COLOURS.sage, stroke: "#354237" }, ...(view.pointer ? { pointer: { x: view.pointer.x, y: view.pointer.y, tool: "pointer" }, selectedElementIds: Object.fromEntries((view.pointer.selectedElementIds || []).map(id => [id, true])) } : {}) }])); apiRef.current.updateScene({ collaborators, captureUpdate: CaptureUpdateAction.NEVER }); }
    }); clientRef.current = client; setState(client.getState()); void client.connect();
    const online = () => { void client.connect(); }, leaving = event => { if (client.getState().pending) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("online", online); window.addEventListener("beforeunload", leaving);
    return () => { lifecycle.current++; client.close(); clientRef.current = null; window.removeEventListener("online", online); window.removeEventListener("beforeunload", leaving); };
  }, [me.identity.id, me.home.id, applyScene, invalidateIdentity]);
  useEffect(() => { if (apiInstance && !initializedApi.current && state.status !== "connecting" && state.status !== "revoked") { initializedApi.current = true; apiInstance.updateScene({ elements: latestScene.current, captureUpdate: CaptureUpdateAction.NEVER }); apiInstance.scrollToContent(latestScene.current.filter(element => !element.isDeleted), { fitToContent: true, animate: false }); } }, [apiInstance, state.status]);
  function center() { const current = apiRef.current.getAppState(), stage = document.querySelector(".board-stage").getBoundingClientRect(); return { x: stage.width / 2 / current.zoom.value - current.scrollX, y: stage.height / 2 / current.zoom.value - current.scrollY }; }
  function addSticky(text, backgroundColor) {
    const editor = apiRef.current, point = center(), elements = convertToExcalidrawElements([{ type: "rectangle", x: point.x - 140, y: point.y - 110, width: 280, height: 220, backgroundColor, fillStyle: "solid", strokeColor: "#b4a887", strokeWidth: 1, roughness: 0, roundness: { type: 3 }, label: { text, strokeColor: "#354237", fontSize: 20, fontFamily: 2, textAlign: "left", verticalAlign: "top" } }]);
    editor.updateScene({ elements: [...editor.getSceneElementsIncludingDeleted(), ...elements], appState: { selectedElementIds: Object.fromEntries(elements.map(element => [element.id, true])) }, captureUpdate: CaptureUpdateAction.IMMEDIATELY }); editor.setActiveTool({ type: "selection" });
  }
  async function addImage(file) {
    const generation = lifecycle.current;
    try {
      validateImageFile(file); const dataURL = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const image = await createImageBitmap(file); const width = image.width, height = image.height; image.close();
      if (width > 8192 || height > 8192 || width * height > 16 * 1024 * 1024) throw new Error("Choose an image up to 8,192 pixels per side and 16 megapixels.");
      if (generation !== lifecycle.current || clientRef.current?.getState().status === "revoked") return;
      const editor = apiRef.current, fileId = crypto.randomUUID(), point = center(), scale = Math.min(1, 480 / width, 480 / height);
      editor.addFiles([{ id: fileId, mimeType: file.type, dataURL, created: Date.now() }]);
      const elements = convertToExcalidrawElements([{ type: "image", x: point.x - width * scale / 2, y: point.y - height * scale / 2, width: width * scale, height: height * scale, fileId, status: "saved", scale: [1, 1] }]);
      editor.updateScene({ elements: [...editor.getSceneElementsIncludingDeleted(), ...elements], appState: { selectedElementIds: { [elements[0].id]: true } }, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    } catch (error) { if (generation === lifecycle.current) setNotice(error.message || "This image could not be opened."); }
  }
  async function paste(data, event) {
    const file = event?.clipboardData?.files?.[0]; if (file) { void addImage(file); return false; }
    if (data.files && Object.values(data.files).some(file => !["image/png", "image/jpeg", "image/webp"].includes(file.mimeType))) { setNotice("Paste PNG, JPEG or WebP images. Other image formats cannot be shared."); return false; }
    if (data.elements?.some(element => sanitizeElements([element]).length === 0 || element.link && !safeLink(element.link))) { setNotice("That clipboard contains an unsupported embed or link. Paste its plain text instead."); return false; }
    if (data.mixedContent?.some(item => item.type === "imageUrl")) { setNotice("Copy the image itself to paste it. Remote image URLs are not fetched."); return false; }
    return true;
  }
  async function exportCanvas(kind) {
    const editor = apiRef.current; if (!editor) return;
    try { if (kind === "png") download(await exportToBlob({ elements: editor.getSceneElements(), appState: { ...editor.getAppState(), exportBackground: true }, files: editor.getFiles(), mimeType: "image/png" }), "house-board.png"); else download(serializeAsJSON(editor.getSceneElementsIncludingDeleted(), editor.getAppState(), editor.getFiles(), "local"), "house-board.excalidraw"); } catch (error) { setNotice(error.message || "The canvas could not be exported."); }
  }
  async function exportOwn() {
    const generation = lifecycle.current;
    try { const own = await api("/api/board/export", { houseId: me.home.id }, me.identity.id); if (generation === lifecycle.current) download(JSON.stringify(own, null, 2), "my-board-contributions.json"); } catch (error) { if (generation === lifecycle.current) setNotice(error.message); }
  }
  const disabled = !apiInstance || ["connecting", "revoked"].includes(state.status);
  return <main className={`board-workspace${chatCollapsed ? " chat-collapsed" : ""}`}><header className="board-topbar"><button className="board-return" onClick={() => returnFromBoard()} title="Return to the house">← <span>House</span></button><div className="board-title"><strong>Our thinking space</strong><span>House {me.home.code}</span></div><div className="board-residents" aria-label="Residents on the board">{state.views.slice(0,6).map(view => <span key={view.id} className="resident-avatar" style={{ background: COLOURS[view.colour] || COLOURS.sage }} title={view.name}>{view.name.slice(0,1).toUpperCase()}</span>)}</div><button className="board-identity" aria-label="Identity and recovery" title={me.identity.name} disabled={state.status === "revoked"} onClick={openIdentity}><span className="identity-initial" style={{background:COLOURS[me.identity.colour] || COLOURS.sage}}>{me.identity.name.slice(0,1).toUpperCase()}</span><span className="identity-label">Identity</span></button><button className={`board-save ${state.status}`} onClick={() => setDetails(!details)} aria-expanded={details}><span className="save-dot" /><span role="status">{labels[state.status]}{state.pending ? ` · ${state.pending}` : ""}</span></button></header><nav className="board-tools" aria-label="Board companion tools"><button aria-label="Sticky note" disabled={disabled} onClick={() => setSticky(true)}>▤ <span>Sticky note</span></button><button aria-label="Add image" disabled={disabled} onClick={() => fileInput.current.click()}>▧ <span>Image</span></button><button aria-label="Download PNG" disabled={disabled} onClick={() => void exportCanvas("png")}>↓ <span>PNG</span></button><button aria-label="Download canvas file" disabled={disabled} onClick={() => void exportCanvas("scene")}>↓ <span>Canvas file</span></button><button aria-label="Fit all objects" disabled={disabled} onClick={() => apiRef.current.scrollToContent(undefined, { fitToContent: true, animate: false })}>⌖ <span>Fit all</span></button><button aria-label="Toggle companion chat" onClick={() => setChatCollapsed(!chatCollapsed)} aria-expanded={!chatCollapsed}>☰ <span>Chat</span></button><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => { if (event.target.files[0]) void addImage(event.target.files[0]); event.target.value = ""; }} /></nav>{details && <section className="board-save-details" aria-label="Save and recovery"><strong>{labels[state.status]}</strong><p>{state.error || (state.pending ? "Your work is kept in this tab under your current identity. A pending reply is not confirmed saved." : "Every current resident can view and edit this shared canvas. Cursor, selection and zoom stay local.")}</p><div><button onClick={() => void clientRef.current.retry()} disabled={state.status === "revoked"}>Retry pending</button><button disabled={state.status === "revoked"} onClick={() => download(clientRef.current.exportPending(), "pending-board-work.json")}>Export pending work</button><button onClick={() => void exportOwn()}>My contributions</button>{state.conflicts.length > 0 && <button onClick={() => clientRef.current.restoreConflicts()}>Restore my conflicting edits</button>}{state.pending > 0 && state.status !== "revoked" && <button onClick={() => { if (window.confirm("Discard all unsaved canvas edits and pending messages in this tab? Export them first if you need a copy. Saved shared work stays in the house.")) void clientRef.current.discardPending(); }}>Discard unsaved work</button>}</div></section>}{notice && <div className="board-notice" role="alert"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}{state.error && !details && <button className="board-error-banner" onClick={() => setDetails(true)}>{state.error} <span>Open save details</span></button>}<section className="board-stage" aria-label="Shared whiteboard" onPasteCapture={event => { const file = event.clipboardData?.files?.[0]; if (file) { event.preventDefault(); event.stopPropagation(); void addImage(file); } }} onDragOver={event => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDropCapture={event => { if (event.dataTransfer.files.length) { event.preventDefault(); event.stopPropagation(); void addImage(event.dataTransfer.files[0]); } }}>
    {state.status === "revoked" ? <div className="board-access-changed"><h1>Your house access changed</h1><p>{state.error}</p><button onClick={reload}>Open current house</button><button onClick={() => void exportOwn()}>Download my contributions</button></div> : <Excalidraw excalidrawAPI={editor => { apiRef.current = editor; if (clientRef.current) editor.addFiles(clientRef.current.getFiles()); setApi(editor); }} initialData={{ appState: { viewBackgroundColor: "#fffdf8", currentItemFontFamily: 2, currentItemStrokeColor: "#354237", currentItemBackgroundColor: "transparent", theme: "light" } }} isCollaborating={true} aiEnabled={false} handleKeyboardGlobally={false} autoFocus={false} validateEmbeddable={() => false} renderEmbeddable={() => null} viewModeEnabled={state.status === "connecting"} UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, clearCanvas: false, toggleTheme: false }, tools: { image: false } }} onPaste={paste} onLinkOpen={(element, event) => { event.preventDefault(); const link = safeLink(element.link); if (link) window.open(link, "_blank", "noopener,noreferrer"); }} onChange={(elements, appState, files) => { const client = clientRef.current; if (client) client.localChange(elements, files); }} onPointerUpdate={({ pointer }) => clientRef.current?.pointer({ x: pointer.x, y: pointer.y, selectedElementIds: Object.keys(apiRef.current?.getAppState().selectedElementIds || {}) })}><MainMenu><MainMenu.DefaultItems.SaveAsImage /><MainMenu.DefaultItems.Help /></MainMenu></Excalidraw>}
    <div className="board-canvas-caption">Shared by your whole house · Changes save as you draw</div></section>{clientRef.current && state.status !== "revoked" && <CompanionChat state={state} client={clientRef.current} collapsed={chatCollapsed} setCollapsed={setChatCollapsed} />}{sticky && <StickyDialog add={addSticky} close={() => setSticky(false)} />}</main>;
}
function App() {
  const [me, setMe] = useState(null), [error, setError] = useState(""), [identityDialog, setIdentityDialog] = useState(null), [identityState, setIdentityState] = useState({ busy: false, proof: "", error: "" });
  const requests = useRef(0), identityRef = useRef(null), identityActions = useRef(null); identityRef.current = me?.identity.id || null;
  if (!identityActions.current) identityActions.current = createIdentityActions({ getIdentityId: () => identityRef.current, onChange: setIdentityState, onRecovered: current => { requests.current++; identityActions.current.invalidate(); setIdentityDialog(null); setMe(current); } });
  const closeIdentity = useCallback(() => { identityActions.current.invalidate(); setIdentityDialog(null); }, []);
  const reload = useCallback(async () => { const request = ++requests.current; setError(""); try { const context = await api("/api/house/me"); if (request === requests.current) setMe(context); } catch (failure) { if (request === requests.current) setError(failure.message || "The house is unavailable. Retry in a moment."); } }, []);
  useEffect(() => { void reload(); return () => { requests.current++; identityActions.current.close(); }; }, [reload]);
  useEffect(() => { identityActions.current.invalidate(); setIdentityDialog(null); }, [me?.identity.id]);
  if (!me) return <main className="board-loading"><p>{error || "Opening your house board…"}</p>{error && <button onClick={reload}>Retry</button>}<a href="/">Return to the house</a></main>;
  return <>{me.home ? <Workspace key={`${me.identity.id}:${me.home.id}`} me={me} reload={reload} openIdentity={() => setIdentityDialog("issue")} invalidateIdentity={closeIdentity} /> : <Admission key={me.identity.id} me={me} reload={reload} feedback={error} recover={() => setIdentityDialog("recover")} />}{identityDialog && <IdentityDialog key={identityDialog} kind={identityDialog} actions={identityActions.current} state={identityState} close={closeIdentity} />}</>;
}
createRoot(document.getElementById("board-root")).render(<App />);
