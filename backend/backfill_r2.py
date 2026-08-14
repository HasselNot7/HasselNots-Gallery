"""Backfill existing local uploads to Cloudflare R2.

Uploads every original + thumbnail currently stored under backend/uploads/,
updates the DB paths to r2:// keys, and (optionally) removes the local files.

Usage:
    cd backend && .venv/bin/python backfill_r2.py [--delete-local]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import storage
from database import SessionLocal
from models import Photo

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
DELETE_LOCAL = "--delete-local" in sys.argv

if not storage.ENABLED:
    print("R2 is not configured. Set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in backend/.env")
    sys.exit(1)

db = SessionLocal()
photos = db.query(Photo).all()
print(f"Found {len(photos)} photos")

ok = 0
failed = 0
for p in photos:
    if storage.is_remote(p.file_path):
        # Already on R2; only clean up leftover local files when requested
        if DELETE_LOCAL:
            for stored in (p.file_path, p.thumbnail_path):
                if not stored:
                    continue
                local = os.path.join(UPLOAD_DIR, os.path.basename(stored))
                if os.path.exists(local):
                    os.remove(local)
        print(f"  #{p.id}: already remote, skip")
        ok += 1
        continue
    local_file = os.path.join(UPLOAD_DIR, os.path.basename(p.file_path))
    local_thumb = os.path.join(UPLOAD_DIR, os.path.basename(p.thumbnail_path or ""))
    if not os.path.exists(local_file):
        print(f"  #{p.id}: FILE MISSING ({local_file}) - skipped")
        failed += 1
        continue

    r2_file = storage.upload_file(local_file, f"photos/{os.path.basename(local_file)}")
    r2_thumb = None
    if local_thumb and os.path.exists(local_thumb):
        r2_thumb = storage.upload_file(local_thumb, f"photos/{os.path.basename(local_thumb)}")

    if not r2_file or (local_thumb and not r2_thumb):
        print(f"  #{p.id}: R2 upload FAILED - skipped")
        failed += 1
        continue

    p.file_path = r2_file
    p.thumbnail_path = r2_thumb or p.thumbnail_path
    db.commit()
    print(f"  #{p.id}: uploaded -> {r2_file}")

    if DELETE_LOCAL:
        try:
            if os.path.exists(local_file):
                os.remove(local_file)
            if local_thumb and os.path.exists(local_thumb):
                os.remove(local_thumb)
        except OSError as e:
            print(f"  #{p.id}: local cleanup failed: {e}")

    ok += 1

db.close()
print(f"Done: {ok} ok, {failed} failed" + (" (local files deleted)" if DELETE_LOCAL else " (local files kept)"))
