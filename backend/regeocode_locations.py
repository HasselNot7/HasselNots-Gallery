"""重新编码全部照片的地名（市级粒度）。

统一使用 _reverse_geocode（Nominatim 优先，BigDataCloud 回退），
并在编码前优先复用附近已有照片的地名，保证同地点命名一致。

用法：
    cd backend && .venv/bin/python regeocode_locations.py
"""
import os
import sys
import math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Photo
from routes.photos import _reverse_geocode

db = SessionLocal()
photos = (
    db.query(Photo)
    .filter(Photo.latitude.isnot(None), Photo.longitude.isnot(None))
    .all()
)
changed = 0
failed = 0

for p in photos:
    deg_lat = 0.01
    deg_lng = deg_lat / max(abs(math.cos(math.radians(p.latitude))), 0.1)
    nearby = (
        db.query(Photo)
        .filter(
            Photo.latitude.isnot(None),
            Photo.longitude.isnot(None),
            Photo.location_name != "",
            Photo.latitude.between(p.latitude - deg_lat, p.latitude + deg_lat),
            Photo.longitude.between(p.longitude - deg_lng, p.longitude + deg_lng),
        )
        .first()
    )
    if nearby:
        name = nearby.location_name
    else:
        name = _reverse_geocode(p.latitude, p.longitude)

    if name and name != p.location_name:
        print(f"#{p.id}: '{p.location_name}' -> '{name}'")
        p.location_name = name
        db.commit()
        changed += 1
    elif not name:
        print(f"#{p.id}: geocode FAILED (keep '{p.location_name}')")
        failed += 1

db.close()
print(f"Done: {changed} changed, {failed} failed")
