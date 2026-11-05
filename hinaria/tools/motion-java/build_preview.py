"""Embed Three.js, its official GLTFLoader and Java-generated GLBs in one HTML."""
from pathlib import Path
import re,json,base64
ROOT=Path(__file__).resolve().parent
VENDOR=ROOT/"preview/vendor"
def namespace(source,name):
    match=re.search(r"export\s*\{([^}]*)\}\s*;?\s*$",source)
    if not match: raise ValueError("Named exports not found: "+name)
    pairs=[]
    for item in match.group(1).split(","):
        if not item.strip():continue
        names=re.split(r"\s+as\s+",item.strip())
        if not all(re.fullmatch(r"[\w$]+",n) for n in names):raise ValueError("Invalid export")
        pairs.append(names[-1]+":"+names[0])
    source=source[:match.start()]+"\nwindow."+name+"={"+",".join(pairs)+"};"
    source=re.sub(r"^export\s+function\s+","function ",source,flags=re.M)
    return source
def imports(source):
    source=re.sub(r"import\s*\{([^}]*)\}\s*from\s*'three';",r"const {\1}=THREE;",source)
    source=source.replace("import { toTrianglesDrawMode } from '../utils/BufferGeometryUtils.js';","const {toTrianglesDrawMode}=ZeroBufferUtils;")
    if re.search(r"^import\s",source,re.M):raise ValueError("Unresolved import")
    return source
def wrap(source):return '(function(){"use strict";\n'+source+"\n})();"
core=wrap(namespace((VENDOR/"three.module.min.js").read_text(encoding='utf-8'),"THREE"))
controls=wrap(imports((VENDOR/"OrbitControls.js").read_text(encoding='utf-8')).replace("export { OrbitControls };","window.ZeroOrbitControls=OrbitControls;"))
utils=wrap(namespace(imports((VENDOR/"BufferGeometryUtils.js").read_text(encoding='utf-8')),"ZeroBufferUtils"))
loader=wrap(imports((VENDOR/"GLTFLoader.js").read_text(encoding='utf-8')).replace("export { GLTFLoader };","window.ZeroGLTFLoader=GLTFLoader;"))
manifest=json.loads((ROOT/"output/manifest.json").read_text(encoding='utf-8'))
for model in manifest["models"]:
    model["data"]=base64.b64encode((ROOT/"output"/model["file"]).read_bytes()).decode("ascii")
values={"__THIRD_PARTY_LICENSE__":(VENDOR/"THREE-LICENSE.txt").read_text(encoding='utf-8'),
        "__THREE_SOURCE__":core,"__CONTROLS_SOURCE__":controls,"__UTILS_SOURCE__":utils,
        "__LOADER_SOURCE__":loader,"__MODEL_DATA__":json.dumps(manifest,ensure_ascii=False,separators=(",",":")),
        "__APP_SOURCE__":(ROOT/"preview/app.js").read_text(encoding='utf-8')}
html=(ROOT/"preview/index.template.html").read_text(encoding='utf-8')
for key,value in values.items():
    if key!="__THIRD_PARTY_LICENSE__":value=re.sub(r"</script",r"<\\/script",value,flags=re.I)
    html=html.replace(key,value)
target=ROOT/"HINARIA_MOTION_JAVA_PREVIEW.html"
target.write_text(html,encoding='utf-8')
print("Built offline preview:",target.stat().st_size,"bytes")
