#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
command -v node >/dev/null || { echo 'Instale Node.js 22 ou superior.' >&2; exit 1; }
if [[ ! -d hinaria/node_modules ]]; then npm run setup; fi
npm start
