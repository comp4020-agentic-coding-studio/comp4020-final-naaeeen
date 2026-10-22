# Current place and maintained browser verification

23 October 2026. Local canonical WSL checkout, Node24.21.0, installed
Playwright1.63.0, Chromium sandbox enabled and SwiftShader. Parent restarted the
isolated4108 service in retained session74476/PID29271 after the frozen UI fixes.
No provider or deployed service was used.

One four-case attempt passed in2.7minutes, followed by one maintained13-case
attempt in2.7minutes. Both retain original case bounds and CI's300-second global
bound, with zero retries. max-failures=1 was only a stop condition; every selected
case passed and none was skipped. After each selection, all517 public/src/e2e and
runtime/config file hashes and the launch record matched. No new Playwright
executable process remained. The executable override was confirmed unset.

| Current place case | Actual duration/result |
| --- | --- |
| Room studio, named visit, private bytes/chat, local audio and reload |44.3s PASS |
| Off-centre sofa follow, departure freeze, explicit phone claim and native Pan |49.1s PASS |
| Study huddle, actual independent board editing and membership-loss clearing |31.5s PASS |
| Scoped drafts through real bedroom exit and return |34.3s PASS |

The sofa's actual shared view was{x:0.55,y:0.45,zoom:1.25}. Departure and the
phone's explicit claim retained it. Two44px native phone Pan taps reached
{x:0.45,y:0.45,zoom:1.25}; the other browser followed that normalized crop.
Leave/Stand/reseat still left the phone unjoined. Inline normalized transforms
are compared across viewports; computed pixel translations legitimately differ
with desktop/phone image dimensions.

The maintained13 selection passed native board lost-ACK recovery, sharing and
identity recovery; break/voice and Saved work return; two-identity house work;
four legacy first-night cases; three-friend picture withdrawal/Stand/reseat and
peer continuation; solo24-piece completion; and both title-dialog viewports.
Its exact seven-file selection is the one in tools/ci-browser.sh.

Source/runtime/cleanup metadata is in native-current-four-before/after.json and
native-current-thirteen-before/after.json. Raw logs, reports and captures remain
ignored under .local/spatial-native-ui-freeze-1 and
.local/spatial-maintained-ui-freeze-1. The first attempts are preserved; no
failure/retry was hidden. No application changes occurred during these runs.

Parent inspected all three new original sofa PNGs: readable reference/pointer,
the four Pan controls and claim caption, with no invite/cookie/token visible.
The other four PNGs exactly match previously parent-inspected bytes by size and
SHA256. Seven curated copies use new native-current-* names,987,047bytes total;
no old PNG was overwritten and every copy retains the source SHA256. Approval and
copy provenance are in native-current-image-approval.json. This is agent pixel
inspection, not a participant usefulness or physical-device trial.

The separate six-browser probe remains held for its own GO/source freeze. These
passes do not accept that six-person task, sustained resources, Fly behavior or
human value. Browser ownership is released for the parent's required/resource
checks; this lane will not start another browser without a new release signal.
