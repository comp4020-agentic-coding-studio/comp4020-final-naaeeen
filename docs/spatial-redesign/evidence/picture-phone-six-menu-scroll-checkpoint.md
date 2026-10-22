# Nonoverlapping Players menu scrolling

V4 native preflight reached all six names and Return, then found the disabled
Replace row obstructed by the sticky Players/Close header after ordinary native
scrolling. That observation established current obstruction, not that the row was
impossible to reach. The a1081403 UI, 790bd45c CSS, prior spec and original failure
PNG were copied before edits into .local/picture-phone-six-menu-scroll-before/;
hashes are recorded in the preimages manifest.

## Bounded comparison and repair

The common task is to inspect names and reach every menu action after scrolling,
with a clear Close action and 44px targets. A static header inside the same scroller
would remove sticky overlap but allow Close to scroll away. A header outside an
independent content scroller adds one wrapper/rule and keeps Close available.
The second option is chosen for that practical benefit.

The menu body remains left anchored, viewport bounded and outside gameplay flow.
It is now a flex column with clipped outer overflow. Its static, nonshrinking
Players/Close header is a sibling of data-puzzle-menu-scroll, which contains all
names and options and owns vertical scrolling with min-height:0. The extra wrapper
is created once. Component behavior, event handlers, node identity, targets,
consent, recovery, summary and Escape contracts are unchanged.

## Verification

- menu-scroll-red.txt: new separation regression fails on the preserved candidate.
- menu-scroll-green.txt: **59/59 component tests PASS**, including all 58 prior
  focus/consent/recovery tests. The prior scroll assertions now inspect the actual
  inner scroll region; the anchor and outer viewport bounds remain checked.
- Scoped UI coverage: **94.97% statements, 91.32% branches, 89.70% functions,
  98.88% lines**.
- Project typecheck, Node syntax and scoped diff checks PASS.
- The first green attempt preserved in menu-scroll-first-green.txt found JSDOM
  does not expand the overflow shorthand into its overflowY getter. The assertion
  now checks the actual shorthand and independently checks the inner overflowY;
  production was not changed to accommodate that test representation.
- Final diff inspected; JavaScript changes are limited to the menu content wrapper.

Source is frozen for fresh contextual review and the next authorized native
comparison. Actual row exposure after native scroll remains to be verified. This
lane ran no browser, service, native suite, full suite, resource probe or commit.
