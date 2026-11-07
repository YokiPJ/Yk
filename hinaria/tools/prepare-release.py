"""Prepare a delivery branch without publishing or touching existing releases."""
from pathlib import Path
import hashlib, json, re, shutil, subprocess, argparse, sys

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
