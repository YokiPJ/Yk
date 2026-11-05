#!/usr/bin/env bash
# Linux x86_64: Google commandline-tools 23.0, verified against official metadata.
# Requires JDK 21, curl, unzip and sha1sum. Existing SDK packages are retained.
set -euo pipefail
HINARIA_ANDROID_SDK="${ANDROID_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/hinaria/android-sdk}"
HINARIA_SDK_TOOLS="$HINARIA_ANDROID_SDK/cmdline-tools/23.0"
HINARIA_SDK_TMP="$(mktemp -d)"
trap 'rm -rf "$HINARIA_SDK_TMP"' EXIT
if [[ ! -x "$HINARIA_SDK_TOOLS/bin/sdkmanager" ]]; then
  curl --fail --show-error --location --retry 2 \
    https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip \
    -o "$HINARIA_SDK_TMP/tools.zip"
  # repository2-3.xml, cmdline-tools;23.0, linux archive (Google HTTPS).
  printf '%s  %s\n' e025545c62a8e64c7559119566a569fb1dec5f60 "$HINARIA_SDK_TMP/tools.zip" | sha1sum --check --status
  unzip -q "$HINARIA_SDK_TMP/tools.zip" -d "$HINARIA_SDK_TMP"
  mkdir -p "$HINARIA_ANDROID_SDK/cmdline-tools"
  mv "$HINARIA_SDK_TMP/cmdline-tools" "$HINARIA_SDK_TOOLS"
fi
"$HINARIA_SDK_TOOLS/bin/android" --no-metrics --sdk="$HINARIA_ANDROID_SDK" sdk install \
  platforms/android-35 build-tools/34.0.0 build-tools/35.0.0 platform-tools
printf 'SDK Android instalado em %s\n' "$HINARIA_ANDROID_SDK"
printf 'Antes de compilar: export ANDROID_HOME=%q\n' "$HINARIA_ANDROID_SDK"
