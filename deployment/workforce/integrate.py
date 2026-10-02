#!/usr/bin/env python3
import hashlib, json, os, pathlib, shutil, sys, time
release = pathlib.Path(sys.argv[1]).resolve()
assert str(release).startswith('/var/www/workforce-releases/workforce-')
manifest = json.loads((release/'deployment/workforce/primary-manifest.json').read_text())
root = pathlib.Path('/var/www/alterlabs')
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
# Validate the complete set before writing the first page.
for row in manifest['files']:
    target = root / row['route'].lstrip('/') / 'index.html'
    source = release / row['file']
    assert digest(target) == row['before_sha256'], f"Primary page changed: {row['route']}"
    assert digest(source) == row['after_sha256'], f"Integration payload changed: {row['route']}"
backup = pathlib.Path('/var/www/workforce-releases') / ('primary-backup-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()))
backup.mkdir()
shutil.copy2(release/'deployment/workforce/primary-manifest.json',backup/'manifest.json')
written=[]
try:
    for row in manifest['files']:
        target = root / row['route'].lstrip('/') / 'index.html'
        saved = backup / row['route'].lstrip('/') / 'index.html'
        saved.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(target,saved)
        temporary = target.with_name('index.html.workforce-new')
        shutil.copy2(release/row['file'],temporary)
        os.replace(temporary,target)
        written.append((target,saved))
        assert digest(target)==row['after_sha256']
        print('UPDATED',row['route'],row['changes'])
except Exception:
    for target,saved in written:
        shutil.copy2(saved,target)
    raise
print('PRIMARY_BACKUP',backup)
