# Six-player picture controls: bounded comparison

23 October 2026. Baseline fbdc853. Common task: six residents in six real game chairs, six placements in the24-piece picture,390x844 phone. Inspect all participants, select from12 visible pieces, page and leave voluntarily. Keep the board, tray and paging exposed, with44px primary targets. Desktop and short landscape remain checks.

The original native failure remains at .local/spatial-six-browser/run-current-seats-first/failure-active.png. Parent measured board y464.78..688.16, tray y744..864 and paging y864..908. Later stages were not reached. The six-name wrap and persistent disabled replacement/Return rows consumed the play area; earlier test passes do not settle this observed failure.

| Candidate | Same-task tradeoff | Decision |
| --- | --- | --- |
| Inline names/actions plus smaller picture/fonts | Retains discovery but loses44px targets/readability or still clips paging. | Reject. |
| Persistent roster side rail | At390px leaves insufficient width for six44px columns; stacking it restores vertical growth. | Reject for this viewport. |
| Persistent self/count and primary toolbar; Players and options disclosure | Keeps Start/Join/Leave, Reference and Chat upfront; full names, Return and unfinished replacement stay explicitly reachable without default vertical growth. | Select, conditional on matched native fit/hit tests. |

The original board/tray scale stays. Four44px toolbar cells hold Players and options, Reference, Chat and the applicable Start/Join/Leave. A stable Start node moves into options only for unfinished replacement. Leave stays upfront; the existing outer Stand is unchanged. The bounded native disclosure keeps full plain-text names, open/focus state on ordinary updates, and closes with focus return on Escape. Context/round changes reset it. Pending retry/inspection remains reachable with visible feedback.

Primary-source guidance supplied by the parent supports this narrow choice: [NN/G progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) keeps frequent actions upfront and secondary access obvious. [W3C Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced) describes44x44 CSS pixels under SC2.5.5 Level AAA; this is not full WCAG compliance. The project already requires44px. Actual native framing, clipping and hit testing decide fit.

Old bytes/hashes are in picture-phone-six-preimages.json. Worker checks cover component behavior, CSS target invariants, types and scoped coverage. Parent owns the unchanged native grader, fresh review and browser GO. No backend, geometry, browser, service, load, harness or commit change is included.
