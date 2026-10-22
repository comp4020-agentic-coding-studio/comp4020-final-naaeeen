# Picture capacity consistency

The finished menu-scroll component, whole-house UI, CSS and focused specs were
preserved before edits under .local/picture-phone-six-capacity-before/, with
hashes in the preimages manifest.

The picture badge and component roster now use the current integer house capacity
when it is between two and six. They use six as the fallback when a validated
capacity is unavailable. Four-in-a-row keeps its fixed two-player denominator.
The whole-house production change is confined to that picture-count expression;
the component change is confined to calculating and displaying the denominator.
CSS, menu structure, focus, consent, recovery and six-person behavior are unchanged.

Matching fixtures for each capacity 2, 3, 4, 5 and 6 include that many permanent
residents, connected players in distinct available game chairs, and roster members.
The whole-house tests render the actual picture component and assert the badge and
component agree. No six-member roster is used in a two-capacity house. Invalid or
unavailable component capacities have separate fallback cases.

## Verification

- capacity-red.txt: **8 regressions fail**, with 7 passing controls/fallback cases.
- capacity-green.txt: **207/207 affected tests PASS** (69 picture component and
  138 whole-house UI).
- capacity-first-typecheck.txt preserves two missing callback type annotations in
  the new fixture. After their type-only correction, project typecheck PASS and
  capacity-final-fixtures.txt verifies all **15/15** final capacity cases again.
- Node syntax for both changed production modules and scoped diff checks PASS.
- Final production diff inspected against the preserved candidate. No current
  coverage percentage is claimed for this tiny denominator change.

Source is frozen for final contextual review and parent-owned native capture.
This lane ran no browser, service, benchmark, resource probe, backend or geometry
change, HTML edit or commit.
