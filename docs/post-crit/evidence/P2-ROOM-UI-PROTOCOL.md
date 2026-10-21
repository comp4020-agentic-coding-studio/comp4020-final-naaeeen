# P2 room UI verification protocol

Declared before native trials, 22 October 2026. Base P1 1699d44 plus P2 working diff.
The run uses current server imports and an isolated `.local/post-crit/p2-ui/data`
on loopback port 4102. The original 4093 runtime/data is outside this run.

## Decisions and checks

- Reuse the existing author-owned house-visible card/form instead of a second private task system. Inspect both bedroom self projection and lounge peer delivery through the real Socket.IO authority.
- Use a top-view SVG built from real preset footprints instead of swapping a 3D furniture draft for preview. Preview cannot change saved state or an existing draft. Applying replaces furniture, palette and lighting while keeping door access.
- Use explicit labelled lighting controls reached from either the lamp or My room. This avoids an unexplained cycle; standard must preserve legacy lighting, cosy/dim must visibly differ. No human preference claim follows.
- Keep authoritative chair headings/footprints and rotate only the visible chair back by pi. Check actual pose separately from collision/route validity.

Common task at actual CSS viewports 1920x1080, 390x844 and 844x390: two independent identities create/join and receive different rooms; walk to rooms; physical desk opens My work; save a next step in a bedroom and see it from the other identity in the lounge; visit a permitted room and open visitor's own work; owner lamp/lighting change reaches a visitor; close door revokes access; preview/apply with dirty-draft guard; sit/stand; reload/restart retain work and room; observer reads but does not save; membership removal clears private content. Native routes/clicks/forms perform product actions; read-only store snapshots inspect results only.

Deterministic race tests additionally cover unchanged bedroom cursor/newer work,
ACK before snapshot then Close, newer typing, close/new card, uncertain starter
UUID/preset/revision, stale lighting bases, late callbacks after identity changes,
original pending destination and authorized reconnect draft restoration.

Accept only actual visible/enabled native controls and expected saved/projection state; collect browser errors and actual viewport/overflow. Preserve failed runs and original PNGs; verify image dimensions before review. Stop after task criteria and actionable review findings are resolved. These are localhost synthetic-identity browser checks, not physical-phone, human A/B, deployed or resource-workload evidence.
