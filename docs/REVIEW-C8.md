# Crit8 integrated review record

6October2026. Reviewers were read-only, with no parent conversation or preferred
answer. Findings are verified against actual source/tests, not counted as votes.

- Backend review: unbounded live streams could grow memory. Add3/session and200
  total connection bounds, close slow buffers; actual per-session429/release test.
- Renderer review: context restore during pending asset load could start a second
  animation loop. Single frame-ID guard; targeted geometry/resource checks passed.
  Real GPU/browser appearance was subsequently observed by the parent.
- Frontend review: a changed cookie identity must clear drafts/rebind its stream;
  old-generation responses/SSE must not overwrite current state. A bounded DOM
  discriminator reproduced the defect and passed after the fix.
- Integrated review: a403identity mismatch offered no recovery control, leaving an
  old tab stuck after two first visits raced or its cookie changed. Expose explicit
  Read latest/current-window action rather than silently publishing the old draft.
  Actual browser regression covers the same old-page/new-cookie path.
- Document review: README evidence URL broke when relative under/readme/. Use an
  absolute repository link. The drafts distinguish imported prototype/human trials
  and live-release claims.
- Parent verification: static code cached for1h could survive a redeploy. App
  scripts/styles revalidate; fixed vendor/models maycache. A production directory
  is not proof of a mount, so startup checks/data device separately before SQLite.

A setView optional call initially did nothing. A bounded focus setter now gives
the shared lamp closer framing while preserving the room camera; this is not a
claim of a complete3Dstreet. Future growth retains renderer-independent semantic
records and replaceable Store APIs. No unobserved human preference results.
