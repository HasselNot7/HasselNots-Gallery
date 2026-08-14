import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Setting
from schemas import SettingsOut, SettingsUpdate
from auth import require_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULTS = {
    "hero_title": "Precision Capture.\nTimeless Frames.",
    "hero_description": "A curated collection of photographic works — each frame capturing the interplay of light, geometry, and fleeting moments across the globe.",
    "hero_icon": "photo_camera",
    "hero_icon_url": "",
    "bg_color1": "#316944",
    "bg_color2": "#163828",
    "bg_color3": "#85C093",
    "bg_color4": "#0a0e27",
    "bg_color5": "#98d4a6",
    "bg_color6": "#1e4c32",
    "bg_base": "#163828",
}

ICON_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "icon")
ICON_URL_PATH = "/api/settings/icon"


def _get_all(db: Session) -> dict:
    rows = db.query(Setting).all()
    result = dict(DEFAULTS)
    for r in rows:
        result[r.key] = r.value
    return result


def _set(db: Session, key: str, value: str):
    existing = db.query(Setting).filter(Setting.key == key).first()
    if existing:
        existing.value = value
    else:
        db.add(Setting(key=key, value=value))
    db.commit()


def _icon_file() -> str | None:
    if not os.path.isdir(ICON_DIR):
        return None
    files = [f for f in os.listdir(ICON_DIR) if not f.startswith(".")]
    if not files:
        return None
    return os.path.join(ICON_DIR, sorted(files)[-1])


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _get_all(db)


@router.put("", response_model=SettingsOut)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    data = payload.model_dump(exclude_none=True)
    for key, value in data.items():
        _set(db, key, value)
    return _get_all(db)


@router.post("/icon", response_model=SettingsOut)
def upload_icon(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    ext = os.path.splitext(file.filename or "icon.png")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"):
        raise HTTPException(status_code=400, detail="Unsupported image format")

    os.makedirs(ICON_DIR, exist_ok=True)
    for f in os.listdir(ICON_DIR):
        if not f.startswith("."):
            os.remove(os.path.join(ICON_DIR, f))

    filename = f"icon_{uuid.uuid4().hex}{ext}"
    with open(os.path.join(ICON_DIR, filename), "wb") as f:
        f.write(file.file.read())

    _set(db, "hero_icon_url", ICON_URL_PATH)
    return _get_all(db)


@router.delete("/icon", response_model=SettingsOut)
def delete_icon(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    path = _icon_file()
    if path and os.path.exists(path):
        os.remove(path)
    _set(db, "hero_icon_url", "")
    return _get_all(db)


@router.get("/icon")
def get_icon(db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "hero_icon_url").first()
    if not row or not row.value:
        raise HTTPException(status_code=404, detail="No custom icon")
    path = _icon_file()
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Icon file not found")
    return FileResponse(path)
