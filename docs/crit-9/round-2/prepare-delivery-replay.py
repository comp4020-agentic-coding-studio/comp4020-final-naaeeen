#!/usr/bin/env python3
# Copy only the bounded current evaluator into fresh private space; never read secrets.
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,shutil
repo=Path(__file__).resolve().parents[3]
source=Path(__file__).resolve().parent/'evidence/delivery-probe'
freeze=json.loads((source/'freeze.json').read_text())
for name,expected in freeze['sourceSha256'].items():
    assert hashlib.sha256((repo/name).read_bytes()).hexdigest()==expected,name
assert hashlib.sha256((source/'probe.mjs').read_bytes()).hexdigest()==freeze['scriptSha256']
assert hashlib.sha256((source/'protocol.json').read_bytes()).hexdigest()==freeze['protocolSha256']
dest=repo/'.local'/('crit9-round2-replay-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))/'delivery-probe'
dest.mkdir(parents=True,exist_ok=False)
for name in ['probe.mjs','protocol.json','freeze.json','safety-amendment.json']:
    shutil.copyfile(source/name,dest/name)
print(dest.relative_to(repo))
print('Run from repository root with installed Node24.21.0. --delayed-sanity expects0; --early-failure-control expects1.')
