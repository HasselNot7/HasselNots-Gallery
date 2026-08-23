import re
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Photo

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _num(text: str) -> float:
    m = re.search(r"\d+(?:\.\d+)?", text or "")
    return float(m.group()) if m else float("inf")


def _shutter_seconds(text: str) -> float:
    m = re.search(r"(\d+(?:\.\d+)?)(?:\s*/\s*(\d+(?:\.\d+)?))?", text or "")
    if not m:
        return float("inf")
    if m.group(2):
        return float(m.group(1)) / float(m.group(2))
    return float(m.group(1))


@router.get("/equipment")
def equipment_stats(db: Session = Depends(get_db)):
    def group(field, exclude=""):
        q = db.query(field, func.count(Photo.id).label("cnt")).filter(
            Photo.is_published == True, field != "", field.isnot(None)
        )
        if exclude:
            q = q.filter(field != exclude)
        rows = q.group_by(field).all()
        return [{"name": name, "count": cnt} for name, cnt in rows]

    total = db.query(func.count(Photo.id)).filter(Photo.is_published == True).scalar() or 0

    return {
        "total_photos": total,
        "cameras": sorted(group(Photo.camera_model), key=lambda r: -r["count"]),
        "lenses": sorted(group(Photo.lens_model, exclude="----"), key=lambda r: -r["count"]),
        "focal_lengths": sorted(group(Photo.focal_length, exclude="0mm"), key=lambda r: _num(r["name"])),
        "apertures": sorted(group(Photo.aperture), key=lambda r: _num(r["name"])),
        "isos": sorted(group(Photo.iso), key=lambda r: _num(r["name"])),
        "shutter_speeds": sorted(group(Photo.shutter_speed), key=lambda r: _shutter_seconds(r["name"])),
    }
