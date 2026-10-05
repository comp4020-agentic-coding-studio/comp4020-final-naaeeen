# ADR 0001: a public rehearsal before private circles

Date:6October2026. Status: selected for Crit8, revisit after the first release.
The fixed inputs are the live Crit8 brief, the user's cosy3D/DIY/sustainability
aim, one256MBFlyMachine/volume and a12:00cutoff. This is a requirements/engineering
comparison, not a user preference A/B experiment.

Candidate A follows the original invite-only friends' circle. It supports privacy
and bounded membership, but an unfamiliar marker needs a separate grant and an
available slot before they can leave a trace. That is a poor defaultC8 entry.
Candidate B exposes a clearly labelled public rehearsal: a visitor immediately
gets an opaque cookie identity, can make their own window and lamp contribution,
and can return to it. It reuses the ownership/persistence semantics without the
invitation/recovery/archive complexity. It requires explicit public-content notice
and bounded public projection rather than pretending all visitors are close friends.

Select B forC8. Render latest8published windows/parts plus the visitor's own even
when older, so a stranger is not locked out by eight early guests. Viewing does
not publish a named window. All edits still need the session-owned identity.
Later introduce actual circle membership/privacy as new capabilities and migration,
not a client checkbox that hides publicly served content. Do not silently migrate
public contributions into confidential circles. Keep stable visitor/window/part IDs.

Sources: https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/08-its-alive/
and docs/planning-source/design/night-neighbourhood/SYSTEM-DESIGN.md.
C9real-time/final privacy promises remain distinguishable from thisC8 contract.

Verification: predeclareddomain/store/HTTP/browser tasks; validguest save/return,
failedcross-owner/stale/collision/id-reuse, actualSQLite restart, two viewport
layouts and own oldwindow accessibility. A real-friends value trial is not run.
Revisit if users cannot explain why to contribute or public contents undermine
the desired small-circle experience. User allows a route change when evidence
supports it; this is not an irrevocable architecture.
