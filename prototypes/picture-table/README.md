# Picture table UI prototype

Original code and continuous SVG artwork, authored for this bounded prototype on
22 October 2026. No external assets, packages, generator or competitor artwork.
This is a locally simulated surface; no production source, backend or data is used.
Open `index.html?tray=scroll` or `index.html?tray=pages` through the isolated static
server in `tools/post-crit-picture-prototype.mjs`. The runner serves only this
folder on a random IPv4 loopback port and closes its server/browser in finally.

All 24 piece descriptions are in app.js. Each crop is part of the same 600x400 image.
The tray is fixed and shuffled; its labels are descriptive, without answer indices.
The full visual/text reference, local chat, explicit join, selection, incorrect
placement, mock peer race, completed state and return placeholder are interactive.
Progress exists only in this page's memory and resets on reload. Focused piece
buttons are retained after peer updates, using aria-disabled rather than removal.

See `docs/post-crit/evidence/picture-prototype-protocol.md` for declared comparison,
then the run-specific JSON/PNGs and review note. This cannot establish physical
phone performance, full screen-reader usability, equal group contribution,
network correctness, durable storage, human preference or whether breaks are fun.
