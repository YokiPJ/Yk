"""Publish only the already verified HINARIA artifacts using GitHub Actions' token."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import tempfile

REPOSITORY = 'yorimiguel727-eng/Yk'
BRANCH = 'hinaria-downloads-v1.2.0'
TAG = 'v1.2.0'
MARKER = '<!-- hinaria-build-65a91fc2221f -->'
FILES = ['HINARIA_UPGRADE_1.2.0.zip', 'HINARIA_UPGRADE_DEBUG_1.2.0.apk',
         'README.md', 'TEST_RESULTS.md', 'CHANGELOG_HINARIA_UPGRADE.md', 'SHA256SUMS.txt']
EXPECTED = {
    'HINARIA_UPGRADE_1.2.0.zip': '67952e440e918563b548b22eed8e9a271ce93ecc047e279caafe4f5cb79d8331',
    'HINARIA_UPGRADE_DEBUG_1.2.0.apk': '51d4ce9507031f2e03a7128efc75aee5df09f9526aa8347d0a1746c85471280f',
}
stage = 'initialization'

def run(*args, check=True):
    result = subprocess.run(args, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError(f'{args[0]} exited {result.returncode}: {result.stderr[-1500:]}')
    return result

def get_release():
    # Authenticated release listings include our unpublished drafts as well.
    result = run('gh', 'api', f'repos/{REPOSITORY}/releases?per_page=100')
    releases = json.loads(result.stdout)
    matches = [release for release in releases if release.get('tag_name') == TAG]
    if len(matches) > 1:
        raise RuntimeError('More than one release uses v1.2.0; existing releases were preserved')
    return matches[0] if matches else None


def checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def check_files(folder):
    for name in FILES:
        if not (folder / name).is_file():
            raise RuntimeError('Missing asset: ' + name)
    for name, expected in EXPECTED.items():
        if checksum(folder / name) != expected:
            raise RuntimeError('Artifact checksum mismatch: ' + name)
    entries = {}
    for line in (folder / 'SHA256SUMS.txt').read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        name = name.lstrip('*')
        if name not in FILES or name in entries or len(digest) != 64:
            raise RuntimeError('Unexpected checksum entry')
        if checksum(folder / name) != digest:
            raise RuntimeError('Checksum mismatch: ' + name)
        entries[name] = digest
    if set(entries) != set(FILES) - {'SHA256SUMS.txt'}:
        raise RuntimeError('Incomplete checksum list')
    return entries

def record(proof):
    Path('release-proof.json').write_text(json.dumps(proof, indent=2, ensure_ascii=False) + '\n')
    run('git', 'config', 'user.name', 'github-actions[bot]')
    run('git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    run('git', 'add', 'release-proof.json')
    if run('git', 'diff', '--cached', '--quiet', check=False).returncode == 0:
        return
    run('git', 'commit', '-m', 'Registra resultado da publicação HINÁRIA 1.2.0')
    run('git', 'push', 'origin', f'HEAD:refs/heads/{BRANCH}')

try:
    if os.environ.get('GITHUB_REPOSITORY') != REPOSITORY:
        raise RuntimeError('Unexpected repository')
    stage = 'verify checked-out artifacts'
    hashes = check_files(Path('.'))
    stage = 'query release'
    release = get_release()
    if release and release['draft'] and MARKER not in (release.get('body') or ''):
        raise RuntimeError('An unrelated draft already uses v1.2.0; it was preserved')
    if release is None:
        stage = 'create draft release'
        run('gh', 'release', 'create', TAG, '--repo', REPOSITORY, '--draft',
            '--target', os.environ['GITHUB_SHA'], '--title', 'HINÁRIA 1.2.0 · Web + APK debug',
            '--notes-file', '.github/release-notes-v1.2.0.md')
        release = get_release()
    if release['draft']:
        stage = 'upload verified release assets'
        run('gh', 'release', 'upload', TAG, *FILES, '--repo', REPOSITORY, '--clobber')
    stage = 'download and verify uploaded assets'
    with tempfile.TemporaryDirectory(prefix='hinaria-assets-') as folder:
        run('gh', 'release', 'download', TAG, '--repo', REPOSITORY, '--dir', folder)
        uploaded_hashes = check_files(Path(folder))
    if uploaded_hashes != hashes:
        raise RuntimeError('Uploaded checksums differ from the checked-out distribution')
    release = get_release()
    if release['draft']:
        stage = 'publish verified release'
        run('gh', 'release', 'edit', TAG, '--repo', REPOSITORY, '--draft=false', '--latest')
        release = get_release()
    if release['draft'] or release['tag_name'] != TAG:
        raise RuntimeError('Release publication was not confirmed')
    assets = {asset['name']: asset for asset in release['assets']}
    if not set(FILES).issubset(assets):
        raise RuntimeError('Published release is missing assets')
    proof = {
        'status': 'published', 'tag': TAG, 'url': release['html_url'],
        'target': release['target_commitish'], 'run_id': os.environ.get('GITHUB_RUN_ID'),
        'run_url': f"https://github.com/{REPOSITORY}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}",
        'verified_sha256': hashes,
        'assets': [{'name': name, 'size': assets[name]['size'],
                    'download_url': assets[name]['browser_download_url']} for name in FILES],
    }
    stage = 'record publication proof'
    record(proof)
    print('Release published and verified: ' + release['html_url'])
except Exception as error:
    failure = {'status': 'failed', 'stage': stage, 'error': str(error),
               'run_url': f"https://github.com/{REPOSITORY}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}"}
    try:
        record(failure)
    except Exception as record_error:
        print('Could not record failure: ' + str(record_error))
    raise
