from pathlib import Path
import hashlib
import json
import shutil
import subprocess

source = Path('/mnt/c/Users/lizhi/OneDrive/图片/文档/ChatGPT/4020/final-project-docs').resolve()
target = Path('/home/lizhi/comp4020/comp4020-final-naaeeen').resolve()
assert target.name == 'comp4020-final-naaeeen' and (target / '.git').exists()
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=target).strip(), 'Preserve existing edits: inspect before migration'
destination = target / 'docs' / 'planning-source'
records = []
for old in sorted(source.rglob('*')):
    rel = old.relative_to(source)
    if not old.is_file() or any(part in ('node_modules', '.cache', '.git', 'data', '__pycache__') for part in rel.parts):
        continue
    new = destination / rel
    data = old.read_bytes()
    if new.exists():
        assert new.read_bytes() == data, f'Refuse overwrite: {new}'
    else:
        new.parent.mkdir(parents=True, exist_ok=True)
        new.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    assert hashlib.sha256(new.read_bytes()).hexdigest() == digest
    records.append({'path': rel.as_posix(), 'bytes': len(data), 'sha256': digest})
(target / 'docs').mkdir(exist_ok=True)
(target / 'docs' / 'migration-manifest.json').write_text(json.dumps({
    'migratedOn': '2026-10-06', 'source': str(source), 'destination': str(destination),
    'baseline': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=target, text=True).strip(),
    'mode': 'Byte-verified copy. Windows originals retained until successful handoff; no runtime/cache/demo data copied.',
    'records': records,
}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'files': len(records), 'bytes': sum(x['bytes'] for x in records), 'destination': str(destination)}))
