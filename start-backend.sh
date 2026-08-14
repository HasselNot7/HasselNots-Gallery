#!/bin/bash
cd "$(dirname "$0")/backend"
source .venv/bin/activate
python init_db.py
exec uvicorn main:app --host 127.0.0.1 --port 8001
