# ADR 0002: use the installed native SQLite binding

Date:6October2026. Selected forC8. Actual repository pins Node24.21.0 andpnpm11.9.0.
A Linux query through its node:sqlite DatabaseSync reports SQLite3.53.4. This is
new evidence, not the Windows research prototype's Node24.15.0 version.

The earlier plan proposed better-sqlite3 to get short synchronous transactions.
Using the installed binding provides those operations without an additional
native addon/build. Within the deadline and256MBsingleMachine this removes one
packaging boundary. No superiority, performance or stable-API status is inferred
from the word built-in. Verify prepared statements, rollback, duplicate receipts,
restart persistence and the real Linux image; keep datastore behind Store methods.
The official v24.21.0 API source marks node:sqlite Release candidate. This is
an explicit trade-off, not a stable-API claim; keep Store replaceable and test
the installed operations.

Adopt mounted SQLite with short transactions, foreign keys, WAL andFULL, numbered
startup migration and strict data path. SQLite3.53.4 is later than the documented
WAL-reset fix3.51.3. A disk write failure must not confirm/broadcast success.
No ordinary Flyrelease_command migration because it has no mounted volume.
The app uses one connection/process, with asynchronous networking outside transactions.

Sources: https://github.com/nodejs/node/blob/v24.21.0/doc/api/sqlite.md ,
https://sqlite.org/wal.html ,
https://docs.fly.io/reference/configuration/ .
Actual store/domain tests and restart checks will be recorded separately.
