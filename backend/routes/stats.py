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


FOCAL_RANGES = [
    ("<16mm", lambda v: v < 16),
    ("16-24mm", lambda v: 16 <= v < 24),
    ("24-35mm", lambda v: 24 <= v < 35),
    ("35-70mm", lambda v: 35 <= v < 70),
    ("70-105mm", lambda v: 70 <= v < 105),
    ("105-200mm", lambda v: 105 <= v < 200),
    (">200mm", lambda v: v >= 200),
]


def _focal_bucket(text: str) -> str | None:
    v = _num(text)
    if v == float("inf"):
        return None
    for label, in_range in FOCAL_RANGES:
        if in_range(v):
            return label
    return None


def _focal_buckets(db: Session) -> list[dict]:
    values = (
        db.query(Photo.id, Photo.focal_length)
        .filter(Photo.is_published == True, Photo.focal_length.isnot(None), Photo.focal_length != "")
        .all()
    )
    counts: dict[str, int] = {}
    for _, raw in values:
        label = _focal_bucket(raw)
        if label:
            counts[label] = counts.get(label, 0) + 1
    return [{"name": label, "count": counts.get(label, 0)} for label, _ in FOCAL_RANGES]


APERTURE_RANGES = [
    (">f/1.4", lambda v: 0 < v < 1.4),
    ("f/1.4-f/2.0", lambda v: 1.4 <= v < 2.0),
    ("f/2.0-f/2.8", lambda v: 2.0 <= v < 2.8),
    ("f/2.8-f/4.0", lambda v: 2.8 <= v < 4.0),
    ("f/4.0-f/8.0", lambda v: 4.0 <= v < 8.0),
    ("<f/8.0", lambda v: v >= 8.0),
]


def _aperture_bucket(text: str) -> str | None:
    v = _num(text)
    if v == float("inf") or v <= 0:
        return None
    for label, in_range in APERTURE_RANGES:
        if in_range(v):
            return label
    return None


def _aperture_buckets(db: Session) -> list[dict]:
    values = (
        db.query(Photo.id, Photo.aperture)
        .filter(Photo.is_published == True, Photo.aperture.isnot(None), Photo.aperture != "")
        .all()
    )
    counts: dict[str, int] = {}
    for _, raw in values:
        label = _aperture_bucket(raw)
        if label:
            counts[label] = counts.get(label, 0) + 1
    return [{"name": label, "count": counts.get(label, 0)} for label, _ in APERTURE_RANGES]


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
        "focal_lengths": _focal_buckets(db),
        "apertures": _aperture_buckets(db),
        "isos": sorted(group(Photo.iso), key=lambda r: _num(r["name"])),
        "shutter_speeds": sorted(group(Photo.shutter_speed), key=lambda r: _shutter_seconds(r["name"])),
    }
