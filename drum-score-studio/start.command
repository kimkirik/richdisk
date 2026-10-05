#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
for candidate in "${DRUMSCORE_PYTHON:-}" python3.12 python3.11 python3.10 python3 "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"; do
  if [ -n "$candidate" ] && "$candidate" -c 'import sys; raise SystemExit(not (3,10) <= sys.version_info[:2] <= (3,12))' 2>/dev/null; then
    exec "$candidate" start-engine.py
  fi
done
echo "Python 3.12를 설치한 뒤 다시 실행해 주세요. https://www.python.org/downloads/"
read -r -p "Enter를 누르면 닫습니다."
