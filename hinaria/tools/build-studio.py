"""Rebuild and publish all standalone labs inside the original project."""
from pathlib import Path
import hashlib, json, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / 'tools'
for relative in ['motion-3d/build.py', 'motion-java/build_preview.py', 'model-review/build.py']:
    subprocess.run([sys.executable, str(TOOLS / relative)], check=True, cwd=ROOT)
labs = {
    'ui-motion': 'motion-ui/ZERO_MOTION_STUDIO.html',
    'three-motion': 'motion-3d/ZERO_MOTION_STUDIO_3D.html',
    'java-motion': 'motion-java/HINARIA_MOTION_JAVA_PREVIEW.html',
    'modelos': 'model-review/HINARIA_MODELOS_ANTES_DEPOIS.html',
}
manifest = {}
for name, relative in labs.items():
    source = TOOLS / relative
    target = ROOT / 'studio' / name / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    manifest[name] = {'path': f'{name}/index.html', 'bytes': source.stat().st_size,
                      'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}
downloads = ROOT / 'downloads'
downloads.mkdir(exist_ok=True)
shutil.copy2(TOOLS / 'motion-java/HinariaMotion.jar', downloads / 'HinariaMotion.jar')
(ROOT / 'studio/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
subprocess.run(['node', str(TOOLS / 'refresh-downloads.mjs')], check=True, cwd=ROOT)
print('Studio integrado: 4 laboratórios offline + JAR Java.')
