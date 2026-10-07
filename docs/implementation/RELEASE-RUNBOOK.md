# Local candidate and production release runbook

7 October 2026. The owner explicitly approved the checkpoint/main repository pushes
and the existing CI/Fly release. The checkpoint branch and reviewed main commits
have been published. A private mounted backup preflight succeeded; see
[backup evidence](RELEASE-BACKUP-EVIDENCE.md). The redesigned production release passed CI and deployed; selected live game, room
and board flows also pass. Current run results are in
[release status](RELEASE-STATUS.md). Local evidence alone does not grant broader
publication, credential, hosting or data-replacement authority. Preserve the frozen
`crit-8` tag and the configured one shared-CPU
machine with 256 MB RAM and one 1 GB volume.

## Prepare the authorized candidate

Record the reviewed commit, required checks, native source hashes and completed
L1/L2 results. Keep failed and calibration runs distinct from full acceptance; use
[operational evidence](operations-evidence.md) and [load refinement](../revisit/LOAD-PACING-REFINEMENT.md)
for the current status. Review the final diff, secret scan and dependency result.
Confirm the actual Fly app and volume identities from current CLI output.

[fly.toml](../../fly.toml) configures `/data` and
`PUBLIC_ORIGIN=https://comp4020-final-naaeeen.fly.dev`; verify the live settings and
Secure cookies. The pinned [Dockerfile](../../Dockerfile) has not been built or run
in this local WSL lane because Docker integration is unavailable. The native
factory rehearsal checks the service/origin/cookie contract, not the image or
mounted production entrypoint; see [CI verification](CI-VERIFICATION.md).

## Back up and rehearse restoration

Back up the mounted data before a schema release. Fly's
[release command](https://docs.fly.io/reference/configuration#run-one-off-commands-before-releasing-a-deployment)
runs without persistent volumes, so it cannot back up or migrate this `/data`.
Use SQLite's online backup API on the mounted machine rather than copying only a
live main file and omitting WAL writes.

The following illustrates the call pattern tested locally. It is not an executed
production command or a complete backup program. Before using it, verify the
actual runtime and `node:sqlite` backup export, create a unique private destination
with owner-only permissions, and refuse an existing destination file. The
[Node backup API](https://github.com/nodejs/node/blob/v24.21.0/doc/api/sqlite.md#L1309)
can overwrite an existing file; the operator's checks are necessary preconditions.

```js
import { DatabaseSync, backup } from 'node:sqlite';

// The private destination directory is already created and checked.
const source = new DatabaseSync('/data/neighbourhood.sqlite', { readOnly: true });
try {
  await backup(source, '/data/PRIVATE-UNIQUE-BACKUP/neighbourhood.sqlite');
} finally {
  source.close();
}
```

Use the reviewed [mounted backup helper](../../tools/backup-mounted-data.mjs) for
the authorized operation. It uses fixed app/file names, creates a private unique
backup directory and verifies each copied database before deployment. Include
`house.sqlite` and `board.sqlite` when they exist; do not create absent optional
files during backup. The first house/board startup is additive. The legacy and house
databases use SQLite `user_version=1`; house wire/export
`schemaVersion=2` is a different version. The new database is additive and leaves
legacy data separate. Verify against the actual [store](../../src/house-store.ts)
and [architecture](../architecture/SHARED-HOUSE-IMPLEMENTATION.md) before a future
migration.

Each database backup is consistent individually, but separate backups do not
represent one common instant. Quiesce writes if that paired boundary is needed;
record capture times and later writes. Store a private copy outside the same
single volume before depending on it for recovery. Keep backups, manifests,
sessions and raw data out of Git, HTTP serving and broad CI artifacts.

Restore a disposable copy with the compatible runtime. Verify integrity and
foreign keys, sessions, room/card/chat state and original receipts. The
[five-case operations suite](../../spec/house-operations.test.ts) includes one
backup/restore case that proves a main-file copy misses WAL data and that a write
made after backup stays absent from the restored snapshot. The suite also covers
additive startup, unsupported schemas and process contention. This is local
rehearsal, not a completed production restoration.

## Deploy and verify the actual service

After authorization, deploy the exact candidate through the existing course path
and fixed one-machine configuration. A public main-branch push can trigger the
[deployment workflow](../../.github/workflows/checks.yml) after checks pass; treat
it as a release action. Mounted startup creates `house.sqlite` without moving
`crit-8` or reseeding the legacy database.

Verify live `/`, `/board/`, `/readme/`, `/healthz`, HTTPS/Secure cookies and two
independent browser flows: join/move/chat, seats and room access, saved DIY/cards,
board drawing/text/chat/save/reload, return, recovery and own-data export. A full mounted-process restart remains a separately recorded operation;
do not claim it from an ordinary page reload. Export contains the current own room/cards
and private archives, not a chat transcript. Check actual logs and resource use.
An HTTP 200 response alone does not establish gameplay or persistence.

## Roll back without discarding new work

The frozen C8 code understands unchanged `neighbourhood.sqlite` and ignores
`house.sqlite`. A binary/UI rollback must retain the house database and later writes
for a future roll-forward; the old UI cannot expose new-house features. An
incompatible future house schema needs tested backward compatibility or an explicit
restored copy.

An earlier backup omits later writes. Coordinate or stop writers and disclose that
boundary before replacing data; preserve original files for recovery. This runbook
authorizes no automatic pruning or permanent downgrade. Review catalogue IDs,
footprints, migrations, receipt retention and volume growth before extending.
