"""Bundle local Three.js r160 + OrbitControls + app as one offline HTML."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
core = (ROOT / "vendor/three.module.min.js").read_text(encoding='utf-8')
match = re.search(r"export\s*\{([^}]*)\}\s*;?\s*$", core)
if not match:
    raise SystemExit("Expected the named exports of Three.js r160.")
exports = []
for item in match.group(1).split(","):
    names = re.split(r"\s+as\s+", item.strip())
    local, public = names[0], names[-1]
    if not re.fullmatch(r"[\w$]+", local) or not re.fullmatch(r"[\w$]+", public):
        raise SystemExit("Unexpected Three.js export.")
    exports.append(public + ":" + local)
core = "(function(){\n" + core[:match.start()] + "\nwindow.THREE={" + ",".join(exports) + "};\n})();"
controls = (ROOT / "vendor/OrbitControls.js").read_text(encoding='utf-8')
controls, count = re.subn(r"import\s*\{([^}]*)\}\s*from\s*'three';", r"const {\1}=THREE;", controls, count=1)
if count != 1 or "export { OrbitControls };" not in controls:
    raise SystemExit("Unexpected OrbitControls module format.")
controls = "(function(){\"use strict\";\n" + controls.replace("export { OrbitControls };", "window.ZeroOrbitControls=OrbitControls;") + "\n})();"
app = (ROOT / "src/app.js").read_text(encoding='utf-8')
html = (ROOT / "src/index.template.html").read_text(encoding='utf-8')
license_text = (ROOT / "vendor/THREE-LICENSE.txt").read_text(encoding='utf-8')
for key, value in {
    "__THIRD_PARTY_LICENSE__": license_text,
    "__THREE_SOURCE__": core,
    "__CONTROLS_SOURCE__": controls,
    "__APP_SOURCE__": app,
}.items():
    if key != "__THIRD_PARTY_LICENSE__":
        value = re.sub(r"</script", r"<\\/script", value, flags=re.I)
    html = html.replace(key, value)
if re.search(r"__(THREE|CONTROLS|APP)_SOURCE__", html):
    raise SystemExit("A build placeholder was not resolved.")
target = ROOT / "ZERO_MOTION_STUDIO_3D.html"
target.write_text(html,encoding='utf-8')
print(f"Built {target.name}: {target.stat().st_size:,} bytes; Three.js r160 + OrbitControls embedded.")
