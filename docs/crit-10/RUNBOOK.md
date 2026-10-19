# Crit 10 operator rehearsal

The owner has authorized publication of the prepared Crit 10 candidate through
main and the existing CI/Fly workflow. Verify the actual pushed head and live
release before presenting; earlier local-only records describe preparation. The existing public health
endpoint returned 200 on 19 October. The direct CLI lacked authentication, while the existing project credential loader
successfully ran read-only status and recent-log commands. No recent structured
actions were available to correlate. No credential files were printed or changed.

## Explain the server's rules

Read [permissions and why](PERMISSIONS-AND-LOGGING.md). A cookie identity, not a
name or submitted header, is the actor. Two people may choose the same name.
Room visiting, personal edits, shared co-editing and membership administration
are different authorities. A former member's own contribution export is an
intentional exception to current-member shared access.

For the central reflection example, use a disposable house: one person places
a sticky note, another rewrites it, then the owner removes its contributor.
The already-open standalone board offers the former contributor's saved version;
current board access is denied. Reloading currently loses the discovery route.
Do not promise a complete current board, full history or self-contained images.

## At the actual crit

1. After the owner has separately handled publication, confirm that the public
   URL and repository contain the intended candidate and exact reflection filename.
2. Give two classmates only the app URL. They use separate Chrome profiles or
   incognito contexts, create/join using the controls on the page and choose
   distinguishable avatar colours. The house creator can see/copy its invite code.
3. They converse and change shared work. The presenter watches server output and
   narrates who created, joined, sent, edited or was denied; do not operate the
   presenter's own app to infer what happened.
4. Ask the users what they expected the export to contain after a rewrite. Record
   their answer and retrieval difficulties as observations, not as a prearranged
   success. The automated rehearsal did not answer that question.

The course-supported read-only command is:

```sh
mise exec -- flyctl logs -a comp4020-final-naaeeen
```

Use existing configured credentials. Do not paste tokens, recovery keys or private
messages into a prompt or evidence file. No new provider configuration is needed
for the stdout format. Platform retention is not an indefinite audit guarantee.

## Read the structured events

An actor UUID is a saved browser identity, not proof of a verified person. Identify
the first `house.create` and `house.join` actors in the disposable house; later
operations retain those IDs even when names match. `action` states the operation,
`outcome` distinguishes accepted activity from a bounded failure code. Where
applicable, `houseId`/`zoneId` bind context and `commandId`/`sequence` correlate a
receipt. A retry can repeat an accepted event without another stored mutation.
No message or board contents are logged. Reads without an event are not proof of
no access; instrument coverage is documented in the technical record.

The actual local two-browser evidence records native create/join, avatars and
status, room chat, board edits/chat, peer rewrite, removal, personal export and
a denied shared read. See [acceptance](ACCEPTANCE.md) for the final run/config,
source binding and limitations. This is Chromium technical evidence, not a claim
that two classmates have completed the activity.
