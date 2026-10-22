# Landscape Players menu anchor

V3 native preflight exposed an actual landscape failure: the 340px options body
was aligned to the right edge of the first roughly 135px toolbar column, extending
left of the viewport. The old CSS and native failure PNG are copied unchanged to
.local/picture-phone-six-menu-anchor-before/ and bound in the preimages manifest.

The bounded repair aligns the first-column menu body left at every width, using
left:0/right:auto. Its viewport-limited width, internal scrolling, Close control,
44px targets and semantics remain unchanged. The redundant mobile-only anchor rule
was removed. The a1081403 JavaScript is unchanged.

The new computed-style regression fails on the old right anchor and passes on the
new unconditional left anchor. It also checks the relative first-column container,
bounded width and retained scroll behavior. The first two intermediate green
attempts exposed test assumptions about JSDOM: width resolves to pixels while dvh
max-height remains an expression. Those logs are preserved, and assertions use
the actual computed representation; no production change accommodated the tests.

Current focused component result: **58/58 PASS**. Project typecheck and scoped
diff check PASS. No browser, service, native run, backend change or commit was
performed by this lane. The parent-owned native preflight must verify actual
landscape full-name reachability; source inspection is not a replacement.

Source is frozen for review and the next authorized preflight.
