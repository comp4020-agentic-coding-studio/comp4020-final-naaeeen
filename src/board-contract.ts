/** Durable house-wide editor data. View state and pointer positions never enter SQLite. */
export const BOARD_LIMITS = Object.freeze({ sceneBytes: 2 * 1024 * 1024, elements: 2000, patchBytes: 128 * 1024, elementBytes: 32 * 1024, assetBytes: 2 * 1024 * 1024, assets: 20, totalAssetBytes: 20 * 1024 * 1024, chatCharacters: 4000, chatMessages: 100, chatDays: 7, views: 12 });
export interface BoardElement extends Record<string, unknown> {
    id: string;
    type: string;
    version: number;
    versionNonce: number;
    isDeleted: boolean;
    index: string | null;
}
export interface BoardFile {
    id: string;
    mimeType: string;
    url: string;
    created: number;
}
export interface BoardChat {
    id: string;
    authorId: string;
    name: string;
    text: string;
    at: number;
    sequence: number;
}
export interface BoardSnapshot {
    schemaVersion: 1;
    houseId: string;
    sequence: number;
    elements: BoardElement[];
    files: BoardFile[];
    chat: BoardChat[];
}
export interface BoardReceipt {
    ok: true;
    id: string;
    houseId: string;
    sequence: number;
    elements?: BoardElement[];
    file?: BoardFile;
    message?: BoardChat;
}
export interface BoardPatch {
    houseId: string;
    sequence: number;
    elements: BoardElement[];
}
export interface BoardPointer {
    x: number;
    y: number;
    selectedElementIds: string[];
}
export interface BoardPresence {
    houseId: string;
    views: {
        id: string;
        name: string;
        colour: string;
        pointer?: BoardPointer;
    }[];
}
export class BoardError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
        super(message);
        this.name = "BoardError";
        this.code = code;
    }
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const TYPES = ["rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "text", "image", "frame"];
const BASE = ["id", "type", "x", "y", "width", "height", "angle", "strokeColor", "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roundness", "roughness", "opacity", "seed", "version", "versionNonce", "index", "isDeleted", "groupIds", "frameId", "boundElements", "updated", "link", "locked"];
const EXTRA: Record<string, string[]> = { text: ["fontSize", "fontFamily", "text", "textAlign", "verticalAlign", "containerId", "originalText", "autoResize", "lineHeight"], image: ["fileId", "status", "scale", "crop"], line: ["points", "lastCommittedPoint", "startBinding", "endBinding", "startArrowhead", "endArrowhead"], arrow: ["points", "lastCommittedPoint", "startBinding", "endBinding", "startArrowhead", "endArrowhead", "elbowed", "fixedSegments", "startIsSpecial", "endIsSpecial"], freedraw: ["points", "pressures", "simulatePressure", "lastCommittedPoint"], frame: ["name"] };
export function boardFail(code: string, message: string): never {
    throw new BoardError(code, message);
}
export function boardObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
        boardFail("INVALID_INPUT", "An action object is required.");
    return value as Record<string, unknown>;
}
export function boardKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = allowed): void {
    if (Object.keys(value).some(k => !allowed.includes(k)) || required.some(k => !Object.hasOwn(value, k)))
        boardFail("INVALID_INPUT", "The action contains missing or unsupported fields.");
}
export function boardUuid(value: unknown): string {
    if (typeof value !== "string" || !UUID.test(value))
        boardFail("INVALID_INPUT", "A valid mutation and house UUID is required.");
    return (value as string).toLowerCase();
}
export function boardId(value: unknown): string {
    if (typeof value !== "string" || !ID.test(value))
        boardFail("INVALID_INPUT", "An element or file ID is invalid.");
    return value as string;
}
export function boardText(value: unknown, max: number, required = false): string {
    if (typeof value !== "string" || [...value].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))
        boardFail("INVALID_INPUT", "Text is invalid or exceeds its limit.");
    if (required && !(value as string).trim())
        boardFail("INVALID_INPUT", "Enter a message before sending.");
    return value as string;
}
function number(value: unknown, min = -1000000, max = 1000000, integer = false): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || integer && !Number.isSafeInteger(value))
        boardFail("INVALID_INPUT", "A numeric scene field is invalid or out of range.");
    return value as number;
}
function bool(value: unknown): void {
    if (typeof value !== "boolean")
        boardFail("INVALID_INPUT", "A boolean scene field is invalid.");
}
function choice(value: unknown, allowed: readonly unknown[]): void {
    if (!allowed.includes(value))
        boardFail("INVALID_INPUT", "A scene field uses an unsupported value.");
}
function list(value: unknown, max: number): unknown[] {
    if (!Array.isArray(value) || value.length > max)
        boardFail("INVALID_INPUT", "A scene collection exceeds its limit.");
    return value as unknown[];
}
function nullableId(value: unknown): void {
    if (value !== null)
        boardId(value);
}
function point(value: unknown): void {
    const p = list(value, 2);
    if (p.length !== 2)
        boardFail("INVALID_INPUT", "A point must have two coordinates.");
    p.forEach(v => number(v));
}
function binding(value: unknown): void {
    if (value === null)
        return;
    const b = boardObject(value);
    boardKeys(b, ["elementId", "focus", "gap", "fixedPoint"], ["elementId", "focus", "gap"]);
    boardId(b.elementId);
    number(b.focus, -1, 1);
    number(b.gap, 0, 1000000);
    if (b.fixedPoint !== undefined) {
        point(b.fixedPoint);
        (b.fixedPoint as unknown[]).forEach(v => number(v, 0, 1));
    }
}
/** Stable serialisation also rejects non-JSON data instead of hiding NaN as null. */
export function boardCanonical(value: unknown, depth = 0): string {
    if (depth > 12)
        boardFail("INVALID_INPUT", "Nested scene data exceeds its limit.");
    if (Array.isArray(value))
        return "[" + value.map(v => boardCanonical(v, depth + 1)).join(",") + "]";
    if (value !== null && typeof value === "object") {
        const o = boardObject(value);
        return "{" + Object.keys(o).sort().map(k => JSON.stringify(k) + ":" + boardCanonical(o[k], depth + 1)).join(",") + "}";
    }
    if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value))
        return JSON.stringify(value);
    return boardFail("INVALID_INPUT", "Scene data must contain finite JSON values.");
}
export function validateBoardElement(value: unknown): BoardElement {
    const e = boardObject(value);
    choice(e.type, TYPES);
    boardKeys(e, [...BASE, ...(EXTRA[e.type as string] ?? [])], BASE);
    if (Buffer.byteLength(boardCanonical(e)) > BOARD_LIMITS.elementBytes)
        boardFail("LIMIT_EXCEEDED", "An object exceeds 32 KiB. Keep a local export and simplify it.");
    boardId(e.id);
    ["x", "y", "angle"].forEach(k => number(e[k]));
    ["width", "height"].forEach(k => number(e[k], 0));
    number(e.strokeWidth, 0, 100);
    number(e.roughness, 0, 10);
    number(e.opacity, 0, 100);
    number(e.seed, 0, 2147483647, true);
    number(e.version, 1, 2147483647, true);
    number(e.versionNonce, 0, 2147483647, true);
    number(e.updated, 0, Number.MAX_SAFE_INTEGER, true);
    ["strokeColor", "backgroundColor"].forEach(k => {
        if (typeof e[k] !== "string" || !/^(?:#[0-9a-fA-F]{3,8}|transparent)$/.test(e[k] as string) || ![4, 5, 7, 9, 11].includes((e[k] as string).length))
            boardFail("INVALID_INPUT", "Use a supported hexadecimal colour or transparent.");
    });
    choice(e.fillStyle, ["hachure", "cross-hatch", "solid", "zigzag"]);
    choice(e.strokeStyle, ["solid", "dashed", "dotted"]);
    bool(e.isDeleted);
    bool(e.locked);
    if (e.index !== null && (typeof e.index !== "string" || !/^[A-Za-z][A-Za-z0-9]{1,127}$/.test(e.index)))
        boardFail("INVALID_INPUT", "Object order is invalid or too long.");
    const groups = list(e.groupIds, 64);
    groups.forEach(boardId);
    if (new Set(groups).size !== groups.length)
        boardFail("INVALID_INPUT", "Group IDs must be distinct.");
    nullableId(e.frameId);
    if (e.frameId === e.id)
        boardFail("INVALID_INPUT", "An object cannot contain itself in a frame.");
    if (e.boundElements !== null)
        list(e.boundElements, 128).forEach(v => {
            const b = boardObject(v);
            boardKeys(b, ["id", "type"]);
            boardId(b.id);
            choice(b.type, ["arrow", "text"]);
        });
    if (e.roundness !== null) {
        const r = boardObject(e.roundness);
        boardKeys(r, ["type", "value"], ["type"]);
        choice(r.type, [1, 2, 3]);
        if (r.value !== undefined)
            number(r.value, 0, 1000);
    }
    if (e.link !== null) {
        const link = boardText(e.link, 2048);
        let u: URL;
        try {
            u = new URL(link);
        }
        catch {
            return boardFail("INVALID_INPUT", "Use a complete HTTP or HTTPS link.");
        }
        if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || /[\u0000-\u0020\u007f]/.test(link))
            boardFail("INVALID_INPUT", "Use a complete HTTP or HTTPS link without credentials.");
    }
    if (e.containerId === e.id)
        boardFail("INVALID_INPUT", "An object cannot bind to itself.");
    if (e.type === "text") {
        boardKeys(e, [...BASE, ...EXTRA.text!]);
        boardText(e.text, 16000);
        boardText(e.originalText, 16000);
        number(e.fontSize, 1, 1000);
        choice(e.fontFamily, [1, 2, 3, 5, 6, 7, 8, 9]);
        choice(e.textAlign, ["left", "center", "right"]);
        choice(e.verticalAlign, ["top", "middle", "bottom"]);
        nullableId(e.containerId);
        bool(e.autoResize);
        number(e.lineHeight, 0.1, 10);
    }
    if (e.type === "frame")
        boardText(e.name === null ? "" : e.name, 200);
    if (["line", "arrow", "freedraw"].includes(e.type as string)) {
        const points = list(e.points, 2048);
        if (points.length < 1)
            boardFail("INVALID_INPUT", "A drawing needs at least one point.");
        points.forEach(point);
        if (e.lastCommittedPoint !== null)
            point(e.lastCommittedPoint);
    }
    if (e.type === "freedraw") {
        const pressures = list(e.pressures, 2048);
        if (pressures.length !== 0 && pressures.length !== (e.points as unknown[]).length)
            boardFail("INVALID_INPUT", "Pressure samples must match drawing points.");
        pressures.forEach(v => number(v, 0, 1));
        bool(e.simulatePressure);
    }
    if (e.type === "line" || e.type === "arrow") {
        binding(e.startBinding);
        binding(e.endBinding);
        const heads = [null, "arrow", "bar", "dot", "circle", "circle_outline", "triangle", "triangle_outline", "diamond", "diamond_outline", "crowfoot_one", "crowfoot_many", "crowfoot_one_or_many"];
        choice(e.startArrowhead, heads);
        choice(e.endArrowhead, heads);
        if (e.type === "arrow") {
            bool(e.elbowed);
            if (e.fixedSegments !== undefined && e.fixedSegments !== null)
                list(e.fixedSegments, 128).forEach(v => {
                    const s = boardObject(v);
                    boardKeys(s, ["start", "end", "index"]);
                    point(s.start);
                    point(s.end);
                    number(s.index, 0, 2047, true);
                });
            ["startIsSpecial", "endIsSpecial"].forEach(k => {
                if (e[k] !== undefined && e[k] !== null)
                    bool(e[k]);
            });
        }
    }
    if (e.type === "image") {
        nullableId(e.fileId);
        choice(e.status, ["pending", "saved", "error"]);
        const scales = list(e.scale, 2);
        if (scales.length !== 2)
            boardFail("INVALID_INPUT", "Image scale is invalid.");
        scales.forEach(v => choice(v, [-1, 1]));
        if (e.crop !== null) {
            const c = boardObject(e.crop);
            boardKeys(c, ["x", "y", "width", "height", "naturalWidth", "naturalHeight"]);
            Object.values(c).forEach(v => number(v, 0));
            if (!(c.naturalWidth as number) || !(c.naturalHeight as number))
                boardFail("INVALID_INPUT", "Image crop size is invalid.");
        }
    }
    return JSON.parse(boardCanonical(e)) as BoardElement;
}
export function validateBoardPatch(value: unknown): {
    id: string;
    houseId: string;
    elements: BoardElement[];
} {
    const p = boardObject(value);
    boardKeys(p, ["id", "houseId", "elements"]);
    const id = boardUuid(p.id), houseId = boardUuid(p.houseId);
    if (Buffer.byteLength(boardCanonical(p)) > BOARD_LIMITS.patchBytes)
        boardFail("LIMIT_EXCEEDED", "This edit exceeds 128 KiB. Keep your local export and submit fewer objects.");
    const elements = list(p.elements, BOARD_LIMITS.elements).map(validateBoardElement);
    if (new Set(elements.map(e => e.id)).size !== elements.length)
        boardFail("INVALID_INPUT", "An edit contains duplicate object IDs.");
    return { id, houseId, elements };
}
/** Upstream lower-nonce rule, extended only for exact nonce collisions. */
export function winningBoardElement(a: BoardElement, b: BoardElement): BoardElement {
    if (a.version !== b.version)
        return a.version > b.version ? a : b;
    if (a.versionNonce !== b.versionNonce)
        return a.versionNonce < b.versionNonce ? a : b;
    if (a.isDeleted !== b.isDeleted)
        return a.isDeleted ? a : b;
    return boardCanonical(a) <= boardCanonical(b) ? a : b;
}
export function orderBoardElements(elements: BoardElement[]): BoardElement[] {
    return elements.sort((a, b) => {
        const ai = a.index ?? "", bi = b.index ?? "";
        return ai < bi ? -1 : ai > bi ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}
export function validateBoardPointer(value: unknown): BoardPointer {
    const p = boardObject(value);
    boardKeys(p, ["x", "y", "selectedElementIds"], ["x", "y"]);
    number(p.x);
    number(p.y);
    const selected = p.selectedElementIds === undefined ? [] : list(p.selectedElementIds, 100);
    selected.forEach(boardId);
    return { x: p.x as number, y: p.y as number, selectedElementIds: selected as string[] };
}
/** A server-issued epoch renews for every subscribe, including the same house. */
export interface BoardEnvelope {
    schemaVersion: 1;
    subscriptionId: string;
}
export interface BoardSubscriptionSnapshot extends BoardSnapshot, BoardEnvelope {
}
export interface BoardSubscribeReceipt extends BoardEnvelope {
    ok: true;
    snapshot: BoardSubscriptionSnapshot;
}
export interface BoardChatEvent extends BoardEnvelope {
    houseId: string;
    sequence: number;
    message: BoardChat;
}
export interface BoardRevoked extends BoardEnvelope {
    code: string;
    message: string;
}
