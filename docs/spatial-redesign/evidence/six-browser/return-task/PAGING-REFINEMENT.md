# Captured paging target observation

The fresh source review found that the six-active phone checkpoint checked the
board/tray and actual cells, but did not explicitly assert both captured page
buttons before later native clicks could auto-scroll. The same common44px paging
outcome already governs the component comparison.

The revised observer now passes that first unscrolled surface's `controls` into
`assertPagingTargets` before opening Players/options. Both Previous and Next must
occur exactly once, be fully exposed, and have width/height at least44px. Existing
board/clip/target checks, native task,240-second deadline,6contexts and retries
remain unchanged. The original unrun packet and evaluator are preserved as
`pre-paging-*`; original six-browser failure remains untouched.

The pure calibration accepts valid captured buttons and rejects an occluded Next
or a Previous narrower than44px. It completed104 controls, retaining the previous
101. This was a compound syntax/calibration/inspect command and briefly overlapped
the parent's resource run. See `HOST-ACTIVITY-OVERLAP.json`; the result is evaluator
calibration only, not workload or optimization acceptance. No further checks or
native runs are authorized while that resource lane remains active.
