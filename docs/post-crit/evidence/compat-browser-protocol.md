# Frozen browser compatibility protocol

22 October 2026. Local synthetic clients only. Owner-approved scope:
tools/post-crit-compat-browser.mjs and compat-browser* evidence. No production
source changes, provider change, push, release or production data read.

Run with Linux Node24.21.0 through mise. Default --inspect starts no services.
--run --label NAME creates a unique ignored .local/compat-fixture directory and
unique dated result/screenshots; earlier attempts are never replaced.

The tool archives exact8cdad6a with git archive and symlinks the existing canonical
node_modules without installing. It copies actual current src/public/README into
a separate fixture and verifies captured hashes before/after copying. Later root
source edits do not alter the copied run. All three databases are synthetic.
Only house SQLite migration is compared by logical rows in each original column.

Acceptance sequence:

1. Serve frozen HTML/UI/client/world/geometry through the genuine frozen service.
   Observe actual served bytes and match Git hashes. Create/join through native UI,
   establish original controller state, save a room/card/private chat, and create
   one synthetic former-member archive with the frozen store.
2. Retain a lounge unsent chat while submitting a real card through old UI.
   Inject one exact fault: immediately after the frozen store commits state and
   receipt, destroy only this isolated service's TCP transports and close it
   before its realtime handler can ACK. Record actual command UUID/body/receipt.
   Native WebSocket observation must show the command sent and no receipt ACK.
3. Start the copied current service on the same port/data. Require schema1→4 with
   all original table/column rows unchanged. Leave both old pages loaded.
4. Observe old UI reconnect read-only with no controller, generation0 and players[].
   Require zero native avatar labels/self mesh, same-zone unsent chat available,
   exact Pending entry retained, existing takeover action explaining the update,
   and a real Pending download containing the original command.
5. A new page loaded from copied current source must acquire actual current control
   independently. Current owner's door closure must clear old guest private DOM;
   reopening then removing that member must clear the private view again.
6. Copy available unsent text before deliberate same-tab reload. The current client
   must keep original sessionStorage, regain control explicitly if observing, clear
   Pending through the old receipt and leave saved card revision/content unchanged.
   The ordinary unsent chat is expected to be lost on deliberate reload.

CDP temporarily pauses inside the actual served openPanel function to expose its
existing module-private client and state for observation/direct capability calls.
It neither replaces the client nor rewrites source/authentication. Native UI is
used for admission, editors, Pending download, takeover and deliberate reload;
private subscription/removal use the actual UI client's public methods.

The old UI has one suspended draft slot and one room-draft object. Hidden drafts
from other zones are not universally exportable/recoverable. Pending export covers
queued commands, not all unsubmitted forms. Old roster/offline/another-tab wording
cannot become a new modern banner without loading new code. This protocol does
not accept universal lossless recovery, physical phones, friends' preferences,
live deployment or resource budgets.

Failures, source bindings and cleanup outcomes must remain in dated results.
Stop after this bounded acceptance and independent review; reopen only an actual
finding or changed source requiring an affected check.
