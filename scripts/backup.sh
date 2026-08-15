#!/bin/bash
# gallery 每日备份入口：优先用后端 venv 的 python（含 boto3）
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PY="$SCRIPT_DIR/../backend/.venv/bin/python"
[ -x "$PY" ] || PY=python3
exec "$PY" "$SCRIPT_DIR/backup.py" "$@"
