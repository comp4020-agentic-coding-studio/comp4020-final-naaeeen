#!/usr/bin/env python3
# Restore public pinned source into a fresh ignored directory; never read secrets.
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, shutil, subprocess
repo=Path(__file__).resolve().parents[2]
evidence=Path(__file__).resolve().parent/'evidence'
manifest=json.loads((evidence/'frozen-manifest.json').read_text())
dest=repo/'.local'/('crit9-policy-replay-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
dest.mkdir(parents=True,exist_ok=False)
for name in ['protocol.json','parent-protocol.json','evaluate.mjs','deltas.diff','source-manifest.json','frozen-manifest.json']:
    shutil.copyfile(evidence/name,dest/name)
for policy in ['S','P','O']:
    for name,expected in manifest['originalSourceHashes'].items():
        data=subprocess.check_output(['git','show',manifest['sourceCommit']+':'+name],cwd=repo)
        assert hashlib.sha256(data).hexdigest()==expected,name
        target=dest/'frozen'/policy/name
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
p=dest/'frozen/P/src/house-store.ts';text=p.read_text()
pairs=[
 ('existing && (existing.author_id !== id || existing.house_id !== h.id)','existing && existing.house_id !== h.id'),
 ('!existing || existing.author_id !== id || existing.house_id !== h.id','!existing || existing.house_id !== h.id')]
for before,after in pairs:
    assert text.count(before)==1
    text=text.replace(before,after)
p.write_text(text)
p=dest/'frozen/O/src/board-store.ts';text=p.read_text()
before='                    const row = this.prepared("SELECT value FROM elements WHERE house_id=? AND id=?").get(p.houseId, incoming.id) as { value: string } | undefined;'
after='                    const row = this.prepared("SELECT value,author_id FROM elements WHERE house_id=? AND id=?").get(p.houseId, incoming.id) as { value: string; author_id: string } | undefined;\n                    if (row && row.author_id !== actorId) boardFail("FORBIDDEN", "Only the original object author may edit this object.");'
assert text.count(before)==1;text=text.replace(before,after);p.write_text(text)
for name,expected in manifest['hashes'].items():
    assert hashlib.sha256((dest/name).read_bytes()).hexdigest()==expected,name
print(dest.relative_to(repo))
print('Frozen hashes match. Execute with pinned Linux runtime on matching production source.')
