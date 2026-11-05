#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm install
npm run build:web
if [ ! -f android/gradlew ]; then npx cap add android; fi
npx cap sync android
node tools/assemble-debug.mjs
printf 'APK em APK_GERADO/HINARIA_V7_DEBUG.apk\n'
