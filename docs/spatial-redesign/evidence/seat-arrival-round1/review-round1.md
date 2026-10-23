# First fresh review of the client-seat candidate

Fresh-context GPT-6 Astra max reviewed client743c08c6 and spec e9a53b15 without
execution. Parent independently inspected the complete client diff and checked
actual realtime release/room-edit producer code. The first candidate is not
accepted from its346passing focused checks alone.

## API ordering finding

The exported client permits a new claim while its current head still says seated.
A valid sequence is seatedA/gen2 -> Stand ACK -> claimB before standing head ->
queued standinggen3 -> B ACK after the server seatsB/gen4. Comparing only3>2 can
clearB's latch too early. Current UI callers wait/stand and do not expose that
exact trace; this is an exported API contract hole, not a reproduced permission
bypass or native regression. The parent selected a focused known-seated client
precondition and ordering regression, preserving the server contract. Parent
checked realtime release:87 increments seatGeneration only when releasing a seat;
standing room-geometry reset also changes controller generation:238.

## Evidence calibration

Initial generation-only release fixtures were labelled room editing. Actual
room-edit reconciliation changes pose AND controller generation, so those fields
must be modelled or the test labelled a synthetic same-scope lease-release
contract. Preserve the first artifacts and publish a correction rather than
retrospectively claiming they exercised the actual room-edit producer.

The initial late-motion case exercises the client, not World; its two-unit pose
change would exceed World's1.15-unit reset threshold. It does not prove an
otherwise-current World flight is settled. A coupled realUI/World/client case
with a smaller correction and unchanged broader scope is required for that claim.

The actual Places-to-study arrival reproduction, authority retirement, unknown
reply recovery and ordinary control tests remain useful. The review verifies
original raw coverage mapping, with whole-client statement/branch gaps retained.
New refinements need unique source/evidence identities and contextual recheck;
the original review and RED histories remain immutable.
