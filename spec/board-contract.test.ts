import { describe, expect, test } from "vitest";
import { validateBoardElement, validateBoardPatch, validateBoardPointer, winningBoardElement } from "../src/board-contract.ts";
function base(type = "rectangle", extra: Record<string, unknown> = {}) {
    return { id: "object", type, x: 1, y: 2, width: 80, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "#fff3bf", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, seed: 1, version: 1, versionNonce: 100, index: "a0", isDeleted: false, groupIds: [], frameId: null, boundElements: null, updated: 1000, link: null, locked: false, roundness: null, ...extra };
}
const linear = { points: [[0, 0], [40, 40]], lastCommittedPoint: null, startBinding: { elementId: "target", focus: 0, gap: 4 }, endBinding: null, startArrowhead: null, endArrowhead: "arrow" };
describe("supported Excalidraw 0.18.1 subset", () => {
    test.each([base(), base("diamond"), base("ellipse"), base("line", linear), base("arrow", { ...linear, elbowed: true, fixedSegments: [{ start: [0, 0], end: [0, 40], index: 0 }], startIsSpecial: null, endIsSpecial: false }), base("freedraw", { points: [[0, 0], [1, 1]], pressures: [0.5, 0.6], simulatePressure: false, lastCommittedPoint: null }), base("text", { fontSize: 20, fontFamily: 9, text: "Line one\nLine two", originalText: "Line one\nLine two", textAlign: "left", verticalAlign: "top", containerId: "container", autoResize: false, lineHeight: 1.25 }), base("image", { fileId: "image", status: "saved", scale: [1, -1], crop: { x: 0, y: 0, width: 10, height: 10, naturalWidth: 100, naturalHeight: 100 } }), base("frame", { name: "Ideas" })])("accepts valid $type data", value => {
        expect(validateBoardElement(value)).toEqual(value);
    });
    test("accepts sticky bindings and safe hyperlinks without HTML interpretation", () => {
        const shape = base("rectangle", { boundElements: [{ id: "text", type: "text" }], roundness: { type: 3 }, link: "https://example.com/path?q=lesson" });
        expect(validateBoardElement(shape).boundElements).toEqual([{ id: "text", type: "text" }]);
    });
    test.each([{ x: NaN }, { y: Infinity }, { width: -1 }, { version: 0 }, { versionNonce: -1 }, { link: "javascript:alert(1)" }, { link: "data:text/html,x" }, { link: "https://user:pass@example.com" }, { type: "iframe" }, { type: "embeddable" }, { customData: { html: "<script>" } }, { groupIds: ["same", "same"] }, { frameId: "object" }, { boundElements: [{ id: "text", type: "iframe" }] }, { index: "a" }, { index: "a" + "1".repeat(128) }, { strokeColor: "url(https://example.com)" }, { roundness: { type: 5 } }])("rejects malformed or executable fields %j", changes => {
        expect(() => validateBoardElement(base("rectangle", changes))).toThrow();
    });
    test("rejects text/drawing/selection excess and mismatched pressure samples", () => {
        expect(() => validateBoardElement(base("text", { text: "x".repeat(16001) }))).toThrow();
        expect(() => validateBoardElement(base("freedraw", { points: [[0, 0], [1, 1]], pressures: [0.5], simulatePressure: false, lastCommittedPoint: null }))).toThrow();
        expect(() => validateBoardPointer({ x: 0, y: 0, selectedElementIds: Array(101).fill("a") })).toThrow();
        expect(() => validateBoardPointer({ x: Infinity, y: 0 })).toThrow();
        expect(() => validateBoardPatch({ id: "00000000-0000-4000-8000-000000000001", houseId: "00000000-0000-4000-8000-000000000002", elements: [base(), base()] })).toThrow();
    });
    test("version dominance, lower nonce and delete tie are permutation-invariant", () => {
        const a = validateBoardElement(base()), b = validateBoardElement(base("rectangle", { version: 2, x: 9 }));
        expect(winningBoardElement(a, b)).toEqual(b);
        const c = validateBoardElement(base("rectangle", { versionNonce: 50, x: 50 }));
        expect(winningBoardElement(c, a)).toEqual(c);
        const deleted = validateBoardElement(base("rectangle", { isDeleted: true }));
        expect(winningBoardElement(a, deleted)).toEqual(deleted);
        expect(winningBoardElement(deleted, a)).toEqual(deleted);
    });
});
