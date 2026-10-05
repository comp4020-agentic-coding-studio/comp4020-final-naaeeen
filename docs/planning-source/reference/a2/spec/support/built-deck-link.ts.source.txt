import { existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { parse, type DefaultTreeAdapterMap } from "parse5";

function* anchorHrefs(node: DefaultTreeAdapterMap["node"]): Generator<string> {
  if ("tagName" in node && node.tagName === "a") {
    const href = node.attrs.find((attribute) => attribute.name === "href");
    if (href) yield href.value;
  }
  // Script strings and escaped code examples are text; comments are separate
  // nodes. Template `content` is deliberately not part of this walk.
  if ("childNodes" in node) {
    for (const child of node.childNodes) yield* anchorHrefs(child);
  }
}

/** Checks parsed lecture anchors against this build's local deck pages. */
export function hasBuiltDeckLink(
  html: string,
  lectureUrl: URL,
  siteUrl: URL,
  distDirectory: string,
): boolean {
  const deckDirectory = `${resolve(distDirectory, "decks")}${sep}`;
  for (const href of anchorHrefs(parse(html))) {
    let path: string;
    try {
      const target = new URL(href, lectureUrl);
      if (target.origin !== siteUrl.origin || !target.pathname.startsWith(siteUrl.pathname)) {
        continue;
      }
      path = decodeURIComponent(target.pathname.slice(siteUrl.pathname.length));
    } catch {
      // An invalid URL or malformed percent encoding cannot name a built page.
      continue;
    }
    if (!path.startsWith("decks/") || path === "decks/") continue;
    const builtPage = path.endsWith(".html") ? path : `${path.replace(/\/$/, "")}/index.html`;
    const builtFile = resolve(distDirectory, builtPage);
    // URL normalisation handles legitimate dot segments. Check again after
    // decoding so an encoded separator cannot escape the built decks directory.
    if (!builtFile.startsWith(deckDirectory)) continue;
    if (existsSync(builtFile) && statSync(builtFile).isFile()) return true;
  }
  return false;
}
