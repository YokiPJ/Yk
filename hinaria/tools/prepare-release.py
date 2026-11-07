"""Prepare a delivery branch without publishing or touching existing releases."""
from pathlib import Path
import hashlib, json, re, shutil, subprocess, argparse, sys, tempfile, zipfile

GAME = Path(__file__).resolve().parent.parent
ROOT = GAME.parent
RELEASE = json.loads((GAME / 'release.json').read_text(encoding='utf-8'))
sys.path.insert(0, str(ROOT / '.github/scripts'))
from release_policy import publication_policy
policy = publication_policy(RELEASE['tag'], RELEASE.get('prerelease', False))
if RELEASE['tag'] != 'v' + RELEASE['version']:
    raise RuntimeError('A versão e a tag da release precisam corresponder.')
parser=argparse.ArgumentParser()
parser.add_argument('--adopt-draft-source',help='Commit exato de um draft criado por esta preparação anteriormente')
options=parser.parse_args()
if options.adopt_draft_source and not re.fullmatch(r'[0-9a-f]{40}',options.adopt_draft_source):
    raise RuntimeError('Commit anterior inválido')

def run(*args):
    return subprocess.run(args, cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()

if run('git', 'status', '--porcelain'):
    raise RuntimeError('Faça commit do código e dos resultados antes de preparar a release.')
source = run('git', 'rev-parse', 'HEAD')
run('node', str(GAME / 'tools/verify-apk.mjs'))
target = ROOT / 'dist' / RELEASE['tag']
if target.exists():
    raise RuntimeError('Pasta de preparação já existe; escolha outra versão ou revise a preparação existente.')
target.mkdir(parents=True)
for relative in [f"downloads/{RELEASE['apk']}", 'downloads/HinariaMotion.jar',
                 f"docs/releases/{RELEASE['version']}/RELEASE_NOTES.md", f"docs/qa/{RELEASE['version']}/results.json"]:
    name = 'MOBILE_TEST_RESULTS.json' if relative.endswith('/results.json') else Path(relative).name
    shutil.copy2(GAME / relative, target / name)
notes = target / 'RELEASE_NOTES.md'
notes.write_text(notes.read_text(encoding='utf-8') + '\n<!-- hinaria-release:' + RELEASE['tag'] + ':' + source + ' -->\n', encoding='utf-8')
for image in sorted((GAME / 'studio/scenery').glob('*.png')):
    shutil.copy2(image, target / image.name)
archive = target / ('HINARIA_PROJETO_' + RELEASE['version'] + '.zip')
run('git', 'archive', '--format=zip', '--output=' + str(archive), source)
with tempfile.TemporaryDirectory(prefix='hinaria-runtime-') as directory:
    runtime = Path(directory)
    run('node', str(GAME / 'tools/prepare-runtime.mjs'), str(runtime))
    if not (runtime / 'runtime-manifest.json').is_file():
        raise RuntimeError('O pacote precisa das dependências locais de execução.')
    def attach_runtime(path):
        with zipfile.ZipFile(path, 'a', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipped:
            for file in sorted(runtime.rglob('*')):
                if file.is_file():
                    name='hinaria/vendor/'+file.relative_to(runtime).as_posix()
                    if name in zipped.namelist():raise RuntimeError('Arquivo duplicado no pacote: '+name)
                    zipped.write(file,name)
    attach_runtime(archive)
    previous=RELEASE.get('patch_base')
    if previous:
        publication_policy(previous, '-beta.' in previous)
        run('git','merge-base','--is-ancestor',previous,source)
        changed=run('git','diff','--name-only','--diff-filter=ACMR',previous,source).splitlines()
        changed=[name for name in changed if not name.startswith('hinaria/docs/qa/')]
        patch_name=RELEASE.get('patch_name', 'HINARIA_CORRECAO_INICIO_' + RELEASE['version'] + '.zip')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+\.zip',patch_name):
            raise RuntimeError('Nome de patch inválido: use um nome ZIP sem diretórios.')
        patch=target / patch_name
        run('git','archive','--format=zip','--output='+str(patch),source,*changed)
        attach_runtime(patch)
        with zipfile.ZipFile(patch,'a',compression=zipfile.ZIP_DEFLATED) as zipped:
            zipped.writestr('APLICAR_CORRECAO.txt',
                'Feche o servidor anterior. Extraia este ZIP sobre a pasta que contém INICIAR_PROJETO.bat, substituindo os arquivos.\n'
                'Execute INICIAR_PROJETO.bat. O jogo abre automaticamente em http://localhost:8080/.\n'
                'Com um servidor estático, abra a raiz do projeto; a entrada redireciona para hinaria/.\n'
                'Não é necessário apagar os dados do navegador.\n')
files = sorted(path for path in target.iterdir() if path.is_file())
checksum = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
(target / 'SHA256SUMS.txt').write_text(''.join(checksum(path) + '  ' + path.name + '\n' for path in files), encoding='utf-8')
files = sorted(path for path in target.iterdir() if path.is_file())
manifest = {'schemaVersion':1, 'repository':RELEASE['repository'], 'tag':RELEASE['tag'],
            'title':RELEASE['title'], 'source_commit':source, 'prerelease':policy['prerelease'],
            'assets':[{'name':path.name,'bytes':path.stat().st_size,'sha256':checksum(path)} for path in files]}
if options.adopt_draft_source:
    run('git','merge-base','--is-ancestor',options.adopt_draft_source,source)
    manifest['adopt_draft_markers']=['<!-- hinaria-release:'+RELEASE['tag']+':'+options.adopt_draft_source+' -->']
(target / 'release-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for relative in ['.github/workflows/publish-release.yml', '.github/scripts/publish-release.py', '.github/scripts/release_policy.py']:
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / relative, destination)
print('Preparação verificada: ' + str(target))
print('Ramo de distribuição: releases/' + RELEASE['tag'])
