#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [[ -n "${HINARIA_JDK:-}" ]]; then
  hinaria_javac="$HINARIA_JDK/bin/javac"
  hinaria_jar="$HINARIA_JDK/bin/jar"
  hinaria_java="$HINARIA_JDK/bin/java"
else
  hinaria_javac="javac"
  hinaria_jar="jar"
  hinaria_java="java"
fi
if ! command -v "$hinaria_javac" >/dev/null 2>&1; then
  echo "JDK 17+ required. Install a JDK or set HINARIA_JDK to its directory." >&2
  exit 1
fi
mkdir -p build/classes output
"$hinaria_javac" --release 17 -encoding UTF-8 -d build/classes src/HinariaAnimator.java
"$hinaria_jar" --create --file HinariaMotion.jar --main-class HinariaAnimator -C build/classes . -C assets hinaria-rigs.json.gz
"$hinaria_java" -jar HinariaMotion.jar --out output "$@"
