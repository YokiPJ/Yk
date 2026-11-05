"""Publish only the exact reviewed files prepared by tools/prepare-release.py."""
from pathlib import Path
import hashlib, json, os, re, subprocess, tempfile
from urllib.parse import quote

manifest = json.loads(Path('release-manifest.json').read_text(encoding='utf-8'))
repository, tag, source = manifest['repository'], manifest['tag'], manifest['source_commit']
if repository != 'YokiPJ/Yk' or os.environ.get('GITHUB_REPOSITORY') != repository:
    raise RuntimeError('Repositório inesperado')
if not re.fullmatch(r'v\d+\.\d+\.\d+', tag) or not re.fullmatch(r'[0-9a-f]{40}', source):
    raise RuntimeError('Tag ou commit inválido')
if os.environ.get('GITHUB_REF_NAME') != 'releases/' + tag:
    raise RuntimeError('Ramo de distribuição inesperado')
marker = '<!-- hinaria-release:' + tag + ':' + source + ' -->'
owned_markers={marker,*manifest.get('adopt_draft_markers',[])}
if any(not re.fullmatch(r'<!-- hinaria-release:'+re.escape(tag)+r':[0-9a-f]{40} -->',item) for item in owned_markers):
    raise RuntimeError('Marcador de adoção inválido')
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
    matches = [item for item in results if item['tag_name'] == tag or any(value in (item.get('body') or '') for value in owned_markers)]
    if len(matches) > 1:
        raise RuntimeError('Mais de uma release usa a tag')
    return matches[0] if matches else None

def api_json(method,path,payload):
    with tempfile.NamedTemporaryFile(mode='w',suffix='.json',encoding='utf-8') as file:
        json.dump(payload,file,ensure_ascii=False);file.flush()
        return json.loads(run('gh','api','--method',method,path,'--input',file.name).stdout)

def read_release(release_id):
    return json.loads(run('gh','api',f'repos/{repository}/releases/{release_id}').stdout)

def download_asset(asset,path):
    with path.open('wb') as stream:
        result=subprocess.run(['gh','api',f"repos/{repository}/releases/assets/{asset['id']}",'-H','Accept: application/octet-stream'],stdout=stream,stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError('Download do anexo falhou: '+result.stderr.decode(errors='replace')[-700:])

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
    if current and not any(value in (current.get('body') or '') for value in owned_markers):
        raise RuntimeError('Já existe uma release de outra publicação nesta tag; preservada')
    payload={'tag_name':tag,'target_commitish':source,'name':manifest['title'],'body':notes,'draft':True,'prerelease':False}
    if current is None:
        stage='create draft'
        current=api_json('POST',f'repos/{repository}/releases',payload)
    elif current['draft']:
        stage='resume owned draft'
        current=api_json('PATCH',f"repos/{repository}/releases/{current['id']}",payload)
    elif marker not in (current.get('body') or ''):
        raise RuntimeError('Uma versão anterior já está publicada; preservada')
    if not isinstance(current,dict) or not isinstance(current.get('id'),int):
        raise RuntimeError('GitHub não retornou um ID de release válido')
    release_id=current['id']
    if current['draft']:
        stage='upload verified files by release ID'
        existing={asset['name']:asset for asset in current.get('assets',[])}
        for name in expected:
            if name in existing:
                run('gh','api','--method','DELETE',f"repos/{repository}/releases/assets/{existing[name]['id']}")
            upload=current['upload_url'].split('{',1)[0]+'?name='+quote(name,safe='')
            response=json.loads(run('gh','api','--method','POST',upload,'-H','Content-Type: application/octet-stream','--input',name).stdout)
            if response.get('name')!=name or response.get('size')!=Path(name).stat().st_size:
                raise RuntimeError('Upload incompleto: '+name)
    stage='download and verify uploaded files by asset ID'
    current=read_release(release_id)
    uploaded={asset['name']:asset for asset in current['assets']}
    if not set(expected).issubset(uploaded):
        raise RuntimeError('GitHub não retornou todos os anexos enviados')
    with tempfile.TemporaryDirectory(prefix='hinaria-release-') as directory:
        for name in expected:
            download_asset(uploaded[name],Path(directory)/name)
        if validate(Path(directory))!=expected:
            raise RuntimeError('Anexos enviados divergem da preparação')
    if current['draft']:
        stage='publish by release ID'
        current=api_json('PATCH',f'repos/{repository}/releases/{release_id}',{'draft':False,'make_latest':'true'})
    current=read_release(release_id)
    if current['draft'] or current['tag_name']!=tag or tag_commit()!=source:
        raise RuntimeError('Publicação/tag não confirmada')
    published = {asset['name']: asset for asset in current['assets']}
    if not set(expected).issubset(published):
        raise RuntimeError('Release publicada sem todos os anexos')
    proof = {'status':'published', 'release_id':release_id, 'tag':tag, 'source_commit':source, 'tag_commit':tag_commit(),
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
