"""Backfill location_name for photos that have lat/lng but no location name."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Base, Photo
from routes.photos import _reverse_geocode

Base.metadata.create_all(bind=engine)
db = SessionLocal()

photos = db.query(Photo).filter(
    Photo.latitude.isnot(None),
    Photo.longitude.isnot(None),
    (Photo.location_name == None) | (Photo.location_name == ""),
).all()

print(f"Found {len(photos)} photos to backfill")
for p in photos:
    name = _reverse_geocode(p.latitude, p.longitude)
    if name:
        p.location_name = name
        print(f"  #{p.id} ({p.latitude:.4f}, {p.longitude:.4f}) -> {name}")
    else:
        print(f"  #{p.id} -> FAILED")
    db.commit()

db.close()
print("Done")
