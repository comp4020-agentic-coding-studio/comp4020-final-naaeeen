import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasBuiltDeckLink } from "./built-deck-link";

const siteUrl = new URL("https://course.example/comp4020-ass2-Naaeeen/");
const lectureUrl = new URL("lectures/week-01/", siteUrl);
const deckPath = "/comp4020-ass2-Naaeeen/decks/week-01/";
let distDirectory: string;

beforeAll(() => {
  distDirectory = mkdtempSync(join(tmpdir(), "course-deck-link-"));
  for (const page of [
    "decks/week-01/index.html",
    "decks/standalone.html",
    "decks/index.html",
    "lectures/week-01/index.html",
  ]) {
    const path = join(distDirectory, page);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "<!doctype html><title>Fixture page</title>");
  }
  mkdirSync(join(distDirectory, "decks/directory.html"));
});

afterAll(() => {
  rmSync(distDirectory, { recursive: true, force: true });
});

const linksToDeck = (html: string) => hasBuiltDeckLink(html, lectureUrl, siteUrl, distDirectory);

describe("built lecture deck links", () => {
  it.each([
    ["double-quoted href", `<a href="${deckPath}">Slides</a>`],
    ["single-quoted href", `<a href='${deckPath}'>Slides</a>`],
    ["unquoted href", `<a href=${deckPath}>Slides</a>`],
    ["case and attribute whitespace", `<A\nHREF = "${deckPath}">Slides</A>`],
    ["HTML character references", '<a href="&#47;comp4020-ass2-Naaeeen&#47;decks&#47;week-01/">Slides</a>'],
    ["same-origin absolute URL", `<a href="https://course.example${deckPath}">Slides</a>`],
    ["lecture-relative URL", '<a href="../../decks/week-01/">Slides</a>'],
    ["query and fragment", `<a href="${deckPath}?mode=present&amp;step=2#slide-2">Slides</a>`],
    ["normalised dot segments", '<a href="../../decks/unused/../week-01/">Slides</a>'],
    ["percent-encoded filename", '<a href="../../decks/week-%30%31/">Slides</a>'],
    ["direct HTML page", '<a href="../../decks/standalone.html">Slides</a>'],
    ["real anchor inside code", `<code><a href="${deckPath}">Slides</a></code>`],
  ])("accepts %s", (_name, html) => {
    expect(linksToDeck(html)).toBe(true);
  });

  it.each([
    ["href text inside a quoted title", `<a title="Use href='${deckPath}'">Slides</a>`],
    ["commented-out anchor", `<!-- <a href="${deckPath}">Slides</a> -->`],
    ["script string", `<script>const example = '<a href="${deckPath}">Slides</a>';</script>`],
    ["inert template content", `<template><a href="${deckPath}">Slides</a></template>`],
    ["escaped code example", `<pre><code>&lt;a href="${deckPath}"&gt;Slides&lt;/a&gt;</code></pre>`],
    ["textarea content", `<textarea><a href="${deckPath}">Slides</a></textarea>`],
    ["anchor without href", '<a>Slides</a>'],
    ["external origin", `<a href="https://other.example${deckPath}">Slides</a>`],
    ["wrong deployment base", '<a href="/decks/week-01/">Slides</a>'],
    ["similar but different base", '<a href="/comp4020-ass2-Naaeeen-extra/decks/week-01/">Slides</a>'],
    ["missing built deck", '<a href="../../decks/missing/">Slides</a>'],
    ["deck listing only", '<a href="../../decks/">Slides</a>'],
    ["non-deck page", '<a href="../../lectures/week-01/">Slides</a>'],
    ["malformed percent encoding", '<a href="../../decks/%E0%A4%A/">Slides</a>'],
    ["decoded traversal outside decks", '<a href="../../decks/..%2flectures/week-01/">Slides</a>'],
    ["directory named like an HTML file", '<a href="../../decks/directory.html">Slides</a>'],
    ["invalid URL", '<a href="http://[">Slides</a>'],
  ])("rejects %s", (_name, html) => {
    expect(linksToDeck(html)).toBe(false);
  });

  it("can find a real link after an invalid link and inactive example", () => {
    expect(linksToDeck(`
      <a href="../../decks/missing/">Missing</a>
      <template><a href="${deckPath}">Example</a></template>
      <p><a href="${deckPath}">Lecture slides</a></p>
    `)).toBe(true);
  });

  it("supports a root-served deployment", () => {
    const rootSite = new URL("https://course.example/");
    expect(hasBuiltDeckLink(
      '<a href="/decks/week-01/">Slides</a>',
      new URL("lectures/week-01/", rootSite),
      rootSite,
      distDirectory,
    )).toBe(true);
  });
});
