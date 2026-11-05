"""Publish only the exact reviewed files prepared by tools/prepare-release.py."""
from pathlib import Path
import hashlib, json, os, re, subprocess, tempfile

manifest = json.loads(Path('release-manifest.json').read_text(encoding='utf-8'))
repository, tag, source = manifest['repository'], manifest['tag'], manifest['source_commit']
if repository != 'yorimiguel727-eng/Yk' or os.environ.get('GITHUB_REPOSITORY') != repository:
    raise RuntimeError('Repositório inesperado')
if not re.fullmatch(r'v\d+\.\d+\.\d+', tag) or not re.fullmatch(r'[0-9a-f]{40}', source):
    raise RuntimeError('Tag ou commit inválido')
if os.environ.get('GITHUB_REF_NAME') != 'releases/' + tag:
    raise RuntimeError('Ramo de distribuição inesperado')
marker = '<!-- hinaria-release:' + tag + ':' + source + ' -->'
stage = 'validate artifacts'

def run(*args, check=True):
    result = subprocess.run(args, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError(args[0] + ' falhou: ' + result.stderr[-1600:])
    return result

def checksum(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def validate(folder):
    hashes = {}
    for asset in manifest['assets']:
        name = asset['name']
        if not re.fullmatch(r'[A-Za-z0-9_.-]+', name) or name in hashes:
            raise RuntimeError('Nome de anexo inválido')
        path = folder / name
        if path.stat().st_size != asset['bytes'] or checksum(path) != asset['sha256']:
            raise RuntimeError('SHA256/tamanho divergente: ' + name)
        hashes[name] = asset['sha256']
    return hashes

def release():
    results = json.loads(run('gh', 'api', f'repos/{repository}/releases?per_page=100').stdout)
    matches = [item for item in results if item['tag_name'] == tag]
    if len(matches) > 1:
        raise RuntimeError('Mais de uma release usa a tag')
    return matches[0] if matches else None

def tag_commit():
    response = run('gh', 'api', f'repos/{repository}/git/ref/tags/{tag}', check=False)
    if response.returncode:
        if '404' in response.stderr:
            return None
        raise RuntimeError('Não foi possível consultar a tag: ' + response.stderr[-500:])
    obj = json.loads(response.stdout)['object']
    while obj['type'] == 'tag':
        obj = json.loads(run('gh', 'api', f"repos/{repository}/git/tags/{obj['sha']}").stdout)['object']
    return obj['sha']

def record(proof):
    Path('release-proof.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    run('git', 'config', 'user.name', 'github-actions[bot]')
    run('git', 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    run('git', 'add', 'release-proof.json')
    if run('git', 'diff', '--cached', '--quiet', check=False).returncode:
        run('git', 'commit', '-m', 'Registra publicação verificada ' + tag)
        run('git', 'push', 'origin', 'HEAD:refs/heads/releases/' + tag)

try:
    expected = validate(Path('.'))
    notes = Path('RELEASE_NOTES.md').read_text(encoding='utf-8')
    if marker not in notes:
        raise RuntimeError('Notas não correspondem ao commit revisado')
    stage = 'check source commit and existing tag'
    run('gh', 'api', f'repos/{repository}/git/commits/{source}')
    existing_tag = tag_commit()
    if existing_tag is not None and existing_tag != source:
        raise RuntimeError('Tag existente aponta para outro commit; preservada')
    current = release()
    if current and marker not in (current.get('body') or ''):
        raise RuntimeError('Já existe uma release de outra publicação nesta tag; preservada')
    if current is None:
        stage = 'create draft'
        run('gh', 'release', 'create', tag, '--repo', repository, '--draft', '--target', source,
            '--title', manifest['title'], '--notes-file', 'RELEASE_NOTES.md')
        current = release()
    if current['draft']:
        stage = 'upload verified files'
        run('gh', 'release', 'upload', tag, *expected.keys(), '--repo', repository, '--clobber')
    stage = 'download and verify uploaded files'
    with tempfile.TemporaryDirectory(prefix='hinaria-release-') as directory:
        run('gh', 'release', 'download', tag, '--repo', repository, '--dir', directory)
        if validate(Path(directory)) != expected:
            raise RuntimeError('Anexos enviados divergem da preparação')
    if current['draft']:
        stage = 'publish'
        run('gh', 'release', 'edit', tag, '--repo', repository, '--draft=false', '--latest')
    current = release()
    if current['draft'] or tag_commit() != source:
        raise RuntimeError('Publicação/tag não confirmada')
    published = {asset['name']: asset for asset in current['assets']}
    if not set(expected).issubset(published):
        raise RuntimeError('Release publicada sem todos os anexos')
    proof = {'status':'published', 'tag':tag, 'source_commit':source, 'tag_commit':tag_commit(),
        'url':current['html_url'], 'run_url':f"https://github.com/{repository}/actions/runs/{os.environ['GITHUB_RUN_ID']}",
        'assets':[{'name':name,'sha256':digest,'bytes':published[name]['size'],
                   'download_url':published[name]['browser_download_url']} for name,digest in expected.items()]}
    stage = 'record publication'
    record(proof)
    print('Release publicada e anexos verificados: ' + current['html_url'])
except Exception as error:
    try:
        record({'status':'failed','stage':stage,'error':str(error),'tag':tag,'source_commit':source,
                'run_url':f"https://github.com/{repository}/actions/runs/{os.environ.get('GITHUB_RUN_ID')}"})
    except Exception as record_error:
        print('Falha ao registrar resultado: ' + str(record_error))
    raise
