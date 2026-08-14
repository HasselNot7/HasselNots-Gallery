"""Re-sync photo EXIF data from image files into the database.
Preserves user-edited fields: title, description, location_name.
Recalculates: shoot_time, camera/lens, focal, aperture, shutter, iso,
lat/lng/alt, dimensions. Also regenerates thumbnails."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from io import BytesIO
from PIL import Image, ImageOps
from database import SessionLocal
from models import Photo
from routes.photos import (
    _read_exif, _parse_date, _format_focal, _format_aperture,
    _format_shutter, _reverse_geocode, THUMBNAIL_SIZE, _resolve_path,
)

db = SessionLocal()
photos = db.query(Photo).all()
print(f"Found {len(photos)} photos")

for p in photos:
    file_path = _resolve_path(p.file_path) if p.file_path else ""
    if not file_path or not os.path.exists(file_path):
        print(f"  #{p.id}: FILE MISSING ({p.file_path}) - skipped")
        continue

    try:
        img = Image.open(file_path)
        exif = _read_exif(img)
        img = ImageOps.exif_transpose(img)
        w, h = img.size

        # --- EXIF fields (recalculated from file) ---
        p.shoot_time = _parse_date(
            exif.get("DateTimeOriginal")
            or exif.get("DateTimeDigitized")
            or exif.get("DateTime")
        )
        p.camera_model = str(exif.get("Model", ""))
        p.lens_model = str(exif.get("LensModel", "")).replace("\x00", "").strip()
        p.focal_length = _format_focal(exif.get("FocalLength"))
        p.aperture = _format_aperture(exif.get("FNumber"))
        p.shutter_speed = _format_shutter(exif.get("ExposureTime"))
        p.iso = str(exif.get("ISOSpeedRatings", ""))
        p.latitude = exif.get("parsed_latitude")
        p.longitude = exif.get("parsed_longitude")
        p.altitude = exif.get("parsed_altitude")
        p.image_width = w
        p.image_height = h

        # --- Regenerate thumbnail ---
        try:
            thumb_img = img.copy()
            thumb_img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
            thumb_name = "thumb_" + os.path.basename(file_path)
            if not p.thumbnail_path or not os.path.exists(_resolve_path(p.thumbnail_path)):
                p.thumbnail_path = thumb_name
            thumb_img.save(_resolve_path(p.thumbnail_path))
        except Exception as e:
            print(f"  #{p.id}: thumb fail: {e}")

        # --- location_name: keep manual value unless it was empty & we have coords ---
        if (not p.location_name) and p.latitude is not None and p.longitude is not None:
            p.location_name = _reverse_geocode(p.latitude, p.longitude)

        print(f"  #{p.id}: {p.shoot_time} | {p.camera_model} | f{p.aperture} {p.shutter_speed} ISO{p.iso} | {w}x{h}")
        db.commit()
    except Exception as e:
        print(f"  #{p.id}: ERROR {e}")

db.close()
print("Done")
