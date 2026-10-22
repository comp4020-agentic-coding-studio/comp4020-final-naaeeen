# Personal studio ambience adapter evidence

23 October 2026. Scope: `public/house-ambience.js` and
`spec/house-ambience.test.ts`; integration is owned by the parent. Canonical
Ubuntu/lizhi repository; commands used the Windows-to-WSL bridge and Linux
`mise exec node@24.21.0 pnpm@11.9.0 -- pnpm`.

## Requirement and choice

Saved room presets and local listening are separate. Construction, local volume
changes and mute changes allocate no audio context. Only explicit `listen()`
creates/resumes audio. Presets are `off`, `rain`, `fire`, `night`. The adapter has
no network, recordings, third-party assets, dependencies or automatic retries.

Under the common task of quiet, explicit, local atmosphere with bounded resources,
a generated loop needs no media provenance or requests. Recorded clips could offer
more realism but add media bytes and provenance/selection work. The owner assigned
procedural audio, so this pass compares lifecycle/resource implications rather than
claiming an observed sound-quality preference. Generated Rain/Fire/Night are original
noise/tone algorithms, with no melody or music playback. Each playing graph uses
one three-second mono buffer capped at144,000 samples/576,000 raw sample bytes,
one source and one gain. Local gain is capped at0.18; default volume is0.3.
Rapid switches keep at most one retiring graph alongside the current graph.

For leaving a room or hiding the page, retaining a suspended graph would preserve
resources and a restart path. The selected teardown closes the context and drops
node/buffer references. Stop invalidates pending starts immediately. A running source
fades for80ms and receives an audio-time stop; a100ms timer disconnects and closes.
Background timer throttling can delay final close, while the scheduled source stop
still bounds the fade in audio time. A pending resume has no source to play and is
closed immediately; cancellation also settles the caller without waiting for it.

Primary API reference checked23October2026:
[W3C Web Audio API1.1](https://www.w3.org/TR/webaudio/#dom-audiocontext-resume)
requires allowance to start for resume and can retain pending resume promises.
[Context close](https://www.w3.org/TR/webaudio/#dom-audiocontext-close)
stops processing and releases system resources but does not automatically release
all context-created objects. This motivates generation cancellation plus explicit
source stop/disconnect and reference release. This is an implementation decision,
not browser playback evidence.

## Integration contract

`createHouseAmbience({ AudioContext?, onStatus? } = {})` returns
`{ listen(preset), stop(), setVolume(value), setMuted(bool), dispose(), status() }`.
`listen` is async and resolves the current snapshot; expected unavailable/startup
failures report an error snapshot instead of throwing. Explicit null AudioContext
supports the unavailable-browser path. Browser AudioContext/webkitAudioContext is
the default when the option is omitted. `dispose` is terminal and idempotent.

Status/callback snapshots are copies:

`{ preset, state: "off"|"starting"|"playing"|"error", volume, muted, message }`.

Initial status is preset/state `off`, volume0.3, mutedfalse, `Sound is off.`.
Parent must invoke stop on room departure/permission loss/page hidden and dispose
on component teardown. Reading or saving a studio preset must never invoke listen.
A failed resume/graph creation closes partial resources and presents a retryable
message. An interrupted playing context reports error and requires explicit Listen.
A delayed success/rejection from a superseded request cannot start sound or replace
the newer status. Local controls preserve muted volume without restarting audio.

## Red, green and refinement

- `studio-ui-ambience-red.txt`: initial module absent, exit1. This records the missing
  module, not a behavioral assertion.
- `studio-ui-ambience-behavior-red.txt`: minimal Off-only skeleton; focused blocked
  startup assertion failed with off versus required error, exit1. Other22cases
  were intentionally excluded by the test-name filter and are not passing evidence.
- `studio-ui-ambience-first-green.txt`: full focused adapter suite23/23, exit0.
- `studio-ui-ambience-coverage.txt`: same focused23/23 with V8 coverage restricted
  to `public/house-ambience.js`, exit0. Statements94.8%, branches87.64%,
  functions95.23%, lines95.79%. The uncovered paths include gain-method fallback
  and some defensive interruption/reentrant callback handling; percentages describe
  mocked module coverage, not real sound quality or browser acceptance.
- `studio-ui-ambience-typecheck.txt`: initial scoped TypeScript6CLI rejected
  explicit files with a present tsconfig (TS5112), exit1; no product error inferred.
- `studio-ui-ambience-typecheck-green.txt`: corrected scoped CLI using
  `--ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution bundler
  --allowJs --skipLibCheck --strict --lib ES2023,DOM --types node
  spec/house-ambience.test.ts`, exit0.

The mocked tests cover explicit initialization; original bounded finite samples;
all presets; volume/mute; source/graph/context disposal; immediate off state and
fade; pending resume cancellation; superseding and late-reject races; absent audio;
constructor/buffer/source/gain/connect/start failure and retry; suspended resume;
interrupted playback; rapid switching; invalid presets; callback failure and copied
status snapshots.

Independent review NOT RUN in this worker lane: a read-only documentation delegation
attempt hit the host thread limit. Parent is asked to include this module in the
later independent implementation review. No browser, server, full suite, physical
audio, human preference, commit, push or deployment was performed by this worker.
