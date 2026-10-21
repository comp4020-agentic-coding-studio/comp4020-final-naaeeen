# Picture table prototype: declared technical comparison

Declared before the first browser run, 22 October 2026. UI prototype only. The
single changed factor is how a fixed shuffled tray exposes the same 24 pieces:
A = one bounded scrollable tray; B = a bounded tray with 12 pieces per page.
The same source, original SVG, 6x4 board, target sizes, labels, local peer simulator,
reference, chat, join and return controls are used. No backend is connected.

Common mixed-input task at native 1920x1080, 390x844 and 844x390: explicitly join;
open and close the shared visual/text reference; find the final piece in the fixed
shuffle using native tray scrolling or Next page; select by pointer/tap; try a
wrong cell and then its correct cell; send a local chat; select another piece with
keyboard Tab/Space; simulate a peer placing that selected piece while its button
has focus; select and place another piece with keyboard; leave to the local desk
placeholder, reopen, and check that local progress remains. Separately exercise
completion/empty tray with explicit local mock updates and reload reset.

Mechanical criteria: no horizontal document overflow; every enabled currently
exposed gameplay control is reachable and not clipped; always-visible exit; board
and loose-piece targets >=44 CSS px, including a roughly53px phone crop; selection
visible and named; wrong placement keeps selection and progress; peer update keeps
the same focused DOM node and explains selection loss; reference and chat reachable;
no JavaScript errors. Record geometry, input action counts and browsing actions
separately. Native screenshots must match the requested pixel dimensions. Pointer
and software touch are distinct from a physical phone; scripts know ground truth
and do not measure solving time or recognisability.

Order: desktop A then B; portrait B then A; landscape A then B. One bounded task
per candidate/viewport plus affected rechecks after material defects; stop when
mechanical criteria pass or an unresolved disqualifier is documented. Preserve
initial failed/aborted results and source hashes. Choose by disqualifiers first,
then mechanical access cost and maintenance; visual preference is a separate
explicit model judgement. No invented user preference, 3-6 human pilot, fun claim,
full screen-reader acceptance, network performance or persistence claim.
