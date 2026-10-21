# Client integration protocol

The parent owns `house-client.js` and its tests during P3/P4 integration. Preserve
identity/house/zone/UUID binding and the existing 16-entry/32 KiB overall outbox.
A maximum of two game entries per identity/house keeps an uncertain action and
withdrawal bounded; UI blocks new play while an earlier game action is uncertain.
Existing UUID retry is checked before the game cap. Study commands keep their
existing limits. A saturated whole outbox remains an explicit recoverable error;
closing the panel or navigating never waits for an acknowledgement.

Run a meaningful red regression before the cap, then affected client checks.
Version compatibility will be specified from the source-backed cutover decision
before its tests/implementation. Native and multiplayer checks belong to the
subsequent integrated acceptance; these client tests alone do not establish them.
