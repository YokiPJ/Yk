#!/usr/bin/env bash
# Instalador seguro: HINÁRIA 1.0.7.9 — sem misturar patches anteriores.
set -Eeuo pipefail
trap 'rc=$?; echo "[ERRO] Interrompido na linha $LINENO (código $rc). O backup original foi preservado." >&2' ERR
BASE="${1:-/workspaces/Apk}"
SRC="$BASE/HINARIA_1_0_7_9_LIMPA"
DST="$BASE/HINARIA_V7_ANDROID"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACK="$BASE/HINARIA_BACKUP_ANTES_1079_$STAMP"
EXPECTED='1.0.7.9 · BOSSES + PERFORMANCE · 31OUT'
if [[ ! -f "$SRC/tests/test_v79_balance.mjs" || ! -s "$SRC/assets/audio/ambiente-v79.mp3" ]]; then
  echo '[ERRO] Extraia HINARIA_1_0_7_9_COMPLETA.zip em /workspaces/Apk antes de continuar.' >&2; exit 2
fi
[[ -f "$DST/android/gradlew" ]] || { echo '[ERRO] A pasta android configurada nao foi encontrada.' >&2; exit 2; }
command -v node >/dev/null && command -v npm >/dev/null || { echo '[ERRO] Node.js/npm ausente.' >&2; exit 2; }
printf '\n[1/7] Validando o pacote NOVO antes de trocar arquivos...\n'
(cd "$SRC" && node tools/verify-release.mjs && node tests/test_v79_balance.mjs && node tests/test_v78_buttons_houses.mjs && node tests/test_mobile_controls.cjs && node test_quest.mjs)
printf '\n[2/7] Backup seguro: %s\n' "$BACK"
mkdir -p "$BACK"
tar -C "$DST" --exclude='./node_modules' --exclude='./android' --exclude='./www' --exclude='./APK_GERADO' -cf - . | tar -C "$BACK" -xf -
mkdir -p "$BACK/android/app"
[[ ! -f "$DST/android/app/build.gradle" ]] || cp -a "$DST/android/app/build.gradle" "$BACK/android/app/build.gradle"
printf '\n[3/7] Substituindo TODO o codigo web (preservando android e icone)...\n'
for d in src assets tools tests; do rm -rf "$DST/$d"; cp -a "$SRC/$d" "$DST/$d"; done
for f in index.html package.json capacitor.config.json server.js; do cp -a "$SRC/$f" "$DST/$f"; done
for f in "$SRC"/test_*.mjs "$SRC"/validate_imports.js "$SRC"/check_exports.js "$SRC"/LEIA_1079.md; do [[ ! -f "$f" ]] || cp -a "$f" "$DST"; done
cd "$DST"
if [[ -x /usr/lib/jvm/java-21-openjdk-amd64/bin/java ]]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
  export PATH="$JAVA_HOME/bin:$PATH"
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
[[ ! -d "$ANDROID_HOME" ]] || printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
printf '\n[4/7] Rodando testes de compatibilidade...\n'
node tools/verify-release.mjs
node tests/test_v79_balance.mjs
node tests/test_entity_tags.mjs
node tests/test_arsenal_v7.mjs
node tests/test_v78_buttons_houses.mjs
node tests/test_v78_house_runtime.mjs
node tests/test_mobile_controls.cjs
node test_quest.mjs
node test_v7_village.mjs
printf '\n[5/7] Instalando dependencias e construindo pacote web OFFLINE...\n'
npm install --no-audit --no-fund
npm run build:web
[[ -s www/assets/audio/ambiente-v79.mp3 && -s www/assets/audio/boss-original-v79.mp3 ]] || { echo '[ERRO] Trilhas nao foram empacotadas.' >&2; exit 1; }
node tools/test-package.mjs
printf '\n[6/7] Atualizando versionCode e compilando APK...\n'
node tools/bump-android-version.mjs
npm run android:debug
APK="$DST/APK_GERADO/HINARIA_1_0_7_9_PERFORMANCE_BOSSES.apk"
[[ -s "$APK" ]] || { echo "[ERRO] APK nao foi criado em $APK" >&2; exit 1; }
TEMP="$(mktemp)"; unzip -p "$APK" assets/public/index.html > "$TEMP"
if ! grep -Fq "$EXPECTED" "$TEMP"; then rm -f "$TEMP"; echo '[ERRO] APK ainda contém versão antiga!'; exit 1; fi
rm -f "$TEMP"
printf '\n[7/7] SUCESSO!\nAPK: %s\nBackup: %s\n' "$APK" "$BACK"
ls -lh "$APK"
