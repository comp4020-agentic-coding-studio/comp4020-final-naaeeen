# Sofa crop continuity repair protocol

23 October 2026. Application baseline8be15ef; current verification-only HEAD6599615. This slice owns only gathering UI/CSS/spec. Earlier1364 passing tests do not accept these changes.

Common task: at390x844, follow a friend's off-centre picture crop, keep that visible crop when the presenter leaves, explicitly claim the frozen shared view, inspect another crop and point at the same image location. Compare native Pan buttons with touch dragging under the same image/session and permissions. Criteria: bounded normalized coordinates, at least44px native controls, keyboard access, clear separation between inspection and presenter pointing, no new gesture capture/cancellation state, and small UI/implementation cost.

Choose four labelled native Pan buttons, matching existing arrow-key0.05 steps. They cost one compact control row but avoid drag thresholds and conflicts with the existing click-to-point action. Touch dragging would add capture, pointer identity, threshold and cancel rules; defer it until native/device evidence shows buttons insufficient. This is a technical design comparison, not a human preference result.

Freeze contract: same image/session presenter loss or replacement stops Follow and copies the last actually displayed crop to independent local inspection. A successful explicit presenting claim adopts its returned authoritative frozen shared crop. New image/session resets independent inspection; stale lower-revision state cannot restore an old crop. Manual Pan/Zoom detaches from the currently displayed shared view, not an older local draft. Existing permission, explicit participation and close/withdrawal contracts remain.

Acceptance: failing then passing DOM transform tests for departure and claim; follower manual control, all four bounded native Pan actions, transformed-plane pointer mapping, new/stale image/session behavior and closed/context cleanup. Parent owns independent recheck and any later native run; no service, browser, load, backend or commit changes here.
