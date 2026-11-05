#!/usr/bin/env bash
# Opcional: instala localmente 2 faixas CC0 da OpenGameArt para o APK offline.
# Falha segura: deixa o bossTrackConfig.js original e música padrão intactos.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUDIO="$ROOT/assets/audio"
CONFIG="$ROOT/src/audio/bossTrackConfig.js"
mkdir -p "$AUDIO"
command -v curl >/dev/null || { echo 'Falta curl.' >&2; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Fontes e licenças: links de download na seção "File(s)" das páginas.
# Wolfgang_ — Battle Theme, CC0: https://lpc.opengameart.org/content/battle-theme-0
# MintoDog — Heavy Boss Battle 1, CC0: https://opengameart.org/content/heavy-boss-battle-1
printf 'Baixando Battle Theme (Troll Ancião)...\n'
curl --fail --location --retry 2 --connect-timeout 15 --max-time 120 \
 'https://lpc.opengameart.org/sites/default/files/Battle.mp3' -o "$TMP/boss-troll-cc0.mp3"
printf 'Baixando Heavy Boss Battle 1 (Rei dos Orcs)...\n'
curl --fail --location --retry 2 --connect-timeout 15 --max-time 120 \
 'https://opengameart.org/sites/default/files/heavy_boss_battle_1_bpm200_0.ogg' -o "$TMP/boss-orc-cc0.ogg"

for f in "$TMP/boss-troll-cc0.mp3" "$TMP/boss-orc-cc0.ogg"; do
  [ "$(wc -c < "$f")" -gt 100000 ] || { echo 'Áudio baixado incompleto. Nenhum arquivo de configuração foi modificado.' >&2; exit 1; }
  if command -v ffprobe >/dev/null; then
    ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$f" | grep -q audio || { echo "Arquivo sem áudio válido: $f" >&2; exit 1; }
  fi
done
cp "$TMP/boss-troll-cc0.mp3" "$AUDIO/boss-troll-cc0.mp3"
cp "$TMP/boss-orc-cc0.ogg" "$AUDIO/boss-orc-cc0.ogg"
cat > "$CONFIG" <<'JS'
/** Faixas CC0 instaladas localmente. Consulte CREDITOS_MUSICAS_BOSS.md. */
export const BOSS_MUSIC_FILES = Object.freeze({
  troll_ancient: 'assets/audio/boss-troll-cc0.mp3',
  orc_king: 'assets/audio/boss-orc-cc0.ogg',
});
JS
printf 'Trilhas CC0 instaladas. Execute npm run android:debug ou npm run build:web para atualizar o pacote.\n'
