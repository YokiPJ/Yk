#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
command -v node >/dev/null || { echo 'Instale Node.js 22 ou superior.' >&2; exit 1; }
if ! node hinaria/tools/runtime-dependencies.mjs --quiet; then npm run setup; fi
node hinaria/tools/runtime-dependencies.mjs
exec node hinaria/server.js --open
