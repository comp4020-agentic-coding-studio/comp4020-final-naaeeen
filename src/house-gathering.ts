import { randomUUID, createHash } from "node:crypto";
import { HouseError } from "./house-contract.ts";
import type { LoungeControl } from "./house-contract.ts";
export type GatheringKind = "study" | "sofa";
type View = { x: number; y: number; zoom: number };
type Point = { x: number; y: number };
type Authority = LoungeControl & { accessGeneration?: number; seatGeneration?: number };
export interface GatheringItem { id: string; ownerId: string; sourceImageId: string; width: number; height: number; bytes: number }
export interface GatheringState { ok: true; kind: GatheringKind; houseId: string; sessionId: string; revision: number; members: { actorId: string; name: string }[]; presenterId: string | null; item: GatheringItem | null; view: View; pointer: Point | null; selfJoined: boolean; selfParticipationId: string | null }
export interface GatheringCommand { commandId: string; kind: GatheringKind; sessionId: string; type: string; payload: Record<string, unknown> }
export interface GatheringReceipt { ok: true; commandId: string; sessionId: string; revision: number }
interface SourceImage { bytes: Buffer; ownerId: string; width: number; height: number; imageId: string }
interface Options { authorizeHouse(actorId: string): { houseId: string; residents?: { id: string; name: string }[] }; currentSeat(actorId: string): Authority | null; sourceImage?(actorId: string, roomId: string): SourceImage; now?: () => number }
interface Session { id: string; kind: GatheringKind; houseId: string; revision: number; members: Map<string, Authority & { participationId: string }>; cancelled: Set<string>; presenterId: string | null; item: GatheringItem | null; bytes: Buffer | null; view: View; pointer: Point | null; createdAt: number; touchedAt: number; receipts: Map<string, { hash: string; receipt: GatheringReceipt }> }
const TTL = 10 * 60_000, MAX_SESSIONS = 128, MAX_INTENTS = 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultView = (): View => ({ x: .5, y: .5, zoom: 1 });
function fail(code: string, message: string): never { throw new HouseError(code, message); }
function object(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function keys(value: Record<string, unknown>, expected: string[]) { if (Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) fail("INVALID_INPUT", "Unsupported gathering fields."); }
function normalized(value: unknown, min = 0, max = 1): value is number { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max; }
function kind(value: unknown): asserts value is GatheringKind { if (value !== "study" && value !== "sofa") fail("INVALID_INPUT", "Choose study or sofa."); }
function same(a: Authority, b: Authority | null) { return Boolean(b && a.actorId === b.actorId && a.houseId === b.houseId && a.generation === b.generation && a.accessGeneration === b.accessGeneration && a.seatGeneration === b.seatGeneration && a.seatId === b.seatId && a.seatPurpose === b.seatPurpose); }
function eligible(control: Authority | null, session: Session) { return Boolean(control?.houseId === session.houseId && control.seatId && control.seatPurpose === (session.kind === "study" ? "study" : "rest")); }
/** Ephemeral sessions only. Current membership and live control are always server-derived. */
export class HouseGathering {
  private sessions = new Map<string, Session>();
  private retired = new Map<string, { session: Session; retiredAt: number }>();
  private options: Options;
  private now: () => number;
  private cleanupTimer: ReturnType<typeof setInterval>;
  constructor(options: Options) { this.options = options; this.now = options.now || Date.now; this.cleanupTimer = setInterval(() => { this.cleanup(); }, 60_000); this.cleanupTimer.unref(); }
  private cleanup() {
    const now = this.now();
    for (const [key, session] of this.sessions) { this.prune(session); if (now - session.touchedAt >= TTL) this.sessions.delete(key); }
    for (const [id, entry] of this.retired) if (now - entry.retiredAt >= TTL) this.retired.delete(id);
  }
  private session(houseId: string, mode: GatheringKind) {
    this.cleanup(); const key = `${houseId}:${mode}`; let session = this.sessions.get(key);
    if (session && !session.members.size && session.receipts.size >= MAX_INTENTS && this.retired.size < MAX_SESSIONS) {
      this.retired.set(session.id, { session, retiredAt: this.now() }); this.sessions.delete(key); session = undefined;
    }
    if (!session) { if (this.sessions.size >= MAX_SESSIONS) fail("GATHERING_LIMIT", "Shared places are busy. Try again later."); const now = this.now(); session = { id: randomUUID(), houseId, kind: mode, revision: 0, members: new Map(), cancelled: new Set(), presenterId: null, item: null, bytes: null, view: defaultView(), pointer: null, createdAt: now, touchedAt: now, receipts: new Map() }; this.sessions.set(key, session); }
    this.prune(session); return session;
  }
  private resetItem(session: Session) { session.item = null; session.bytes = null; session.view = defaultView(); session.pointer = null; }
  private prune(session: Session) {
    let changed = false;
    for (const [actorId, authority] of session.members) {
      let current: Authority | null = null;
      try { if (this.options.authorizeHouse(actorId).houseId === session.houseId) current = this.options.currentSeat(actorId); } catch { /* Current permission loss revokes the ephemeral role. */ }
      if (!same(authority, current) || !eligible(current, session)) { session.cancelled.add(`${actorId}:${authority.participationId}`); session.members.delete(actorId); changed = true; }
    }
    if (session.presenterId && !session.members.has(session.presenterId)) { session.presenterId = null; session.pointer = null; changed = true; }
    if (!session.members.size && (session.item || session.pointer || session.view.zoom !== 1 || session.view.x !== .5 || session.view.y !== .5)) { this.resetItem(session); changed = true; }
    if (changed) session.revision++;
  }
  private project(actorId: string, session: Session, residents: { id: string; name: string }[] = []): GatheringState {
    return { ok: true, kind: session.kind, houseId: session.houseId, sessionId: session.id, revision: session.revision, members: [...session.members.keys()].map(id => ({ actorId: id, name: residents.find(person => person.id === id)?.name || "Housemate" })), presenterId: session.presenterId, item: session.item ? { ...session.item } : null, view: { ...session.view }, pointer: session.pointer ? { ...session.pointer } : null, selfJoined: session.members.has(actorId), selfParticipationId: session.members.get(actorId)?.participationId ?? null };
  }
  state(actorId: string, mode: GatheringKind): GatheringState { kind(mode); const membership = this.options.authorizeHouse(actorId); const session = this.session(membership.houseId, mode); if (session.members.has(actorId)) session.touchedAt = this.now(); return this.project(actorId, session, membership.residents); }
  image(actorId: string, mode: GatheringKind, itemId: string): { bytes: Buffer; mime: "image/png" } {
    kind(mode); const membership = this.options.authorizeHouse(actorId), session = this.session(membership.houseId, mode);
    if (mode !== "sofa" || !session.bytes || session.item?.id !== itemId) fail("GATHERING_NO_ITEM", "That shared image is no longer available.");
    return { bytes: Buffer.from(session.bytes), mime: "image/png" };
  }
  execute(actorId: string, value: unknown, authorizeControl: () => Authority, requestEpoch?: { accessGeneration: number; seatGeneration: number }): { receipt: GatheringReceipt; state: GatheringState } {
    const command = this.validate(value), membership = this.options.authorizeHouse(actorId), control = authorizeControl();
    if (!control || control.actorId !== actorId || control.houseId !== membership.houseId || !Number.isSafeInteger(control.generation) || control.generation < 1) fail("FORBIDDEN", "Current lounge control is required.");
    const current = this.options.currentSeat(actorId);
    // Standing may have a current lounge control with null seats. Disconnected controls never pass currentSeat.
    if (!current || !same(control, current)) fail("STALE_GENERATION", "This connection no longer controls the lounge.");
    const session = this.session(membership.houseId, command.kind);

    const hash = createHash("sha256").update(JSON.stringify([actorId, command.kind, command.sessionId, command.type, Object.entries(command.payload).sort(([a],[b]) => a.localeCompare(b))])).digest("hex");
    const original = session.id === command.sessionId ? session : this.retired.get(command.sessionId)?.session;
    if (!original || original.houseId !== membership.houseId || original.kind !== command.kind) fail("STALE_GATHERING", "This shared place expired. Read its current state and choose Join again.");
    const accepted = original.receipts.get(command.commandId);
    if (accepted) { if (accepted.hash !== hash) fail("COMMAND_ID_REUSED", "That action ID already belongs to another gathering action."); return { receipt: { ...accepted.receipt }, state: this.project(actorId, session, membership.residents) }; }
    if (original !== session) fail("STALE_GATHERING", "The prior gathering ended. Choose Join in the new gathering.");
    if (requestEpoch && (requestEpoch.accessGeneration !== control.accessGeneration || (command.type !== "gathering.leave" && requestEpoch.seatGeneration !== control.seatGeneration))) fail("STALE_GENERATION", "This request belongs to an earlier lounge visit. Reopen and explicitly choose again.");
    if (session.receipts.size >= MAX_INTENTS && !(command.type === "gathering.leave" && session.members.get(actorId)?.participationId === command.payload.participationId)) fail("GATHERING_LIMIT", "This shared session reached its action limit. Leave the gathering; once everyone leaves, reopen and explicitly Join a new gathering.");
    if (command.type !== "gathering.leave" && !eligible(control, session)) fail("GATHERING_SEAT_REQUIRED", `Sit at the ${session.kind === "study" ? "study table" : "sofa"} before joining or sharing.`);
    const joined = session.members.has(actorId);
    if (command.type === "gathering.join") {
      if (!joined && session.members.size >= 6) fail("GATHERING_LIMIT", "All six shared places are in use.");
      const participationId = command.payload.participationId as string;
      if (!session.cancelled.has(`${actorId}:${participationId}`)) session.members.set(actorId, { ...control, participationId });
    } else if (command.type === "gathering.leave") {
      const participationId = command.payload.participationId as string;
      session.cancelled.add(`${actorId}:${participationId}`);
      if (session.members.get(actorId)?.participationId !== participationId) {
        const receipt: GatheringReceipt = { ok: true, commandId: command.commandId, sessionId: session.id, revision: session.revision }; session.receipts.set(command.commandId, { hash, receipt });
        return { receipt: { ...receipt }, state: this.project(actorId, session, membership.residents) };
      }
      session.members.delete(actorId);
      if (session.presenterId === actorId) { session.presenterId = null; session.pointer = null; }
      if (!session.members.size) this.resetItem(session);
    } else {
      if (!joined) fail("GATHERING_NOT_JOINED", "Choose Join before presenting or pointing.");
      if (command.type === "gathering.share") {
        if (session.presenterId && session.presenterId !== actorId) fail("GATHERING_PRESENTER_BUSY", "The current presenter must leave before another person claims the shared view.");
        if (session.kind === "sofa" && command.payload.roomId) {
          if (!this.options.sourceImage) fail("GATHERING_NO_ITEM", "Select an image in your own room first.");
          const source = this.options.sourceImage(actorId, command.payload.roomId as string);
          if (source.ownerId !== actorId) fail("FORBIDDEN", "Only the original owner can publish this reference.");
          this.validateImage(source);
          session.bytes = Buffer.from(source.bytes); session.item = { id: randomUUID(), ownerId: source.ownerId, sourceImageId: source.imageId, width: source.width, height: source.height, bytes: source.bytes.length }; session.view = defaultView();
        }
        if (session.kind === "sofa" && !session.item) fail("GATHERING_NO_ITEM", "Share your chosen room reference before presenting.");
        session.presenterId = actorId; session.pointer = null;
      } else {
        if (session.presenterId !== actorId) fail("GATHERING_NOT_PRESENTER", "Only the current presenter changes the shared view.");
        if (command.type === "gathering.pointer") session.pointer = command.payload.x === null ? null : { x: command.payload.x as number, y: command.payload.y as number };
        if (command.type === "gathering.view") session.view = { ...command.payload } as View;
        if (command.type === "gathering.clear") this.resetItem(session);
      }
    }
    session.revision++; session.touchedAt = this.now();
    const receipt: GatheringReceipt = { ok: true, commandId: command.commandId, sessionId: session.id, revision: session.revision }; session.receipts.set(command.commandId, { hash, receipt });
    return { receipt: { ...receipt }, state: this.project(actorId, session, membership.residents) };
  }
  private validateImage(source: SourceImage) {
    const signature = Buffer.from([137,80,78,71,13,10,26,10]);
    if (!Buffer.isBuffer(source.bytes) || source.bytes.length < 8 || source.bytes.length > 262144 || !source.bytes.subarray(0, 8).equals(signature) || !uuid.test(source.imageId) || !Number.isSafeInteger(source.width) || !Number.isSafeInteger(source.height) || source.width < 1 || source.height < 1 || source.width > 2048 || source.height > 2048 || source.width * source.height > 1048576) fail("INVALID_INPUT", "The chosen room reference exceeds the bounded PNG contract.");
  }
  private validate(value: unknown): GatheringCommand {
    if (!object(value)) fail("INVALID_INPUT", "Invalid gathering command."); keys(value, ["commandId", "kind", "sessionId", "type", "payload"]); kind(value.kind);
    if (typeof value.commandId !== "string" || !uuid.test(value.commandId) || typeof value.sessionId !== "string" || !uuid.test(value.sessionId) || !object(value.payload)) fail("INVALID_INPUT", "Invalid gathering action identifier.");
    const payload = value.payload;
    switch (value.type) {
      case "gathering.join": case "gathering.leave": keys(payload, ["participationId"]); if (typeof payload.participationId !== "string" || !uuid.test(payload.participationId)) fail("INVALID_INPUT", "Invalid participation consent."); break;
      case "gathering.clear": keys(payload, []); break;
      case "gathering.share":
        if (value.kind === "sofa" && Object.hasOwn(payload, "roomId")) { keys(payload, ["roomId"]); if (typeof payload.roomId !== "string" || !uuid.test(payload.roomId)) fail("INVALID_INPUT", "Invalid original room."); }
        else keys(payload, []); break;
      case "gathering.pointer": keys(payload, ["x", "y"]); if (!((payload.x === null && payload.y === null) || (normalized(payload.x) && normalized(payload.y)))) fail("INVALID_INPUT", "Pointer coordinates must be normalized."); break;
      case "gathering.view": keys(payload, ["x", "y", "zoom"]); if (!normalized(payload.x) || !normalized(payload.y) || !normalized(payload.zoom, 1, 4)) fail("INVALID_INPUT", "View coordinates must be normalized."); break;
      default: fail("INVALID_INPUT", "Unsupported gathering action.");
    }
    return value as unknown as GatheringCommand;
  }
  close() { clearInterval(this.cleanupTimer); this.sessions.clear(); this.retired.clear(); }
}
