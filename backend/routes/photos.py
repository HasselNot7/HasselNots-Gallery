import os
import uuid
import base64
import datetime
import json
import urllib.request
import urllib.parse
from fractions import Fraction
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from PIL import ImageOps
from database import get_db
from models import Photo
from schemas import PhotoOut, PhotoUpdate, BatchDelete, BatchStatus, PhotoLocationUpdate
from auth import get_current_user, require_admin
import storage

# Register HEIF/HEIC opener so PIL can decode iPhone photos
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

router = APIRouter(prefix="/api/photos", tags=["photos"])
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
THUMBNAIL_SIZE = (800, 800)


def _resolve_path(stored_path: str) -> str:
    """Resolve a stored path to a real filesystem path.

    New uploads store bare filenames; legacy rows may contain absolute paths
    from another machine. Always prefer resolving against UPLOAD_DIR so the
    DB stays portable across servers.
    """
    if not stored_path:
        return ""
    name = os.path.basename(stored_path)
    local = os.path.join(UPLOAD_DIR, name)
    if os.path.exists(local):
        return local
    if os.path.exists(stored_path):
        return stored_path
    return local


def _remove_media(stored_paths):
    """Delete stored media files (local or remote R2 object)."""
    for stored in stored_paths:
        if not stored:
            continue
        if storage.is_remote(stored):
            storage.delete_object(stored)
        else:
            path = _resolve_path(stored)
            if path and os.path.exists(path):
                os.remove(path)


def _reverse_geocode(lat: float, lng: float) -> str:
    """Return 'City, Country' from coordinates. Nominatim primary, BigDataCloud fallback."""
    try:
        url = "https://nominatim.openstreetmap.org/reverse?" + urllib.parse.urlencode(
            {"lat": lat, "lon": lng, "format": "json", "zoom": 10, "accept-language": "en"}
        )
        req = urllib.request.Request(url, headers={"User-Agent": "GalleryApp/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
        addr = data.get("address", {})
        city = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("municipality")
            or addr.get("state")
            or addr.get("county")
            or ""
        )
        country = addr.get("country", "")
        if city and country:
            return f"{city}, {country}"
        if city:
            return city
    except Exception:
        pass

    # Fallback: BigDataCloud (no API key required)
    try:
        url = "https://api.bigdatacloud.net/data/reverse-geocode-client?" + urllib.parse.urlencode(
            {"latitude": lat, "longitude": lng, "localityLanguage": "en"}
        )
        req = urllib.request.Request(url, headers={"User-Agent": "GalleryApp/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        city = data.get("city") or data.get("locality") or data.get("principalSubdivision") or ""
        country = data.get("countryName", "")
        if city and country:
            return f"{city}, {country}"
        return city or ""
    except Exception:
        return ""


def _format_shutter(value) -> str:
    if value is None:
        return ""
    try:
        val = float(value)
    except (ValueError, TypeError):
        return str(value)
    if val >= 1:
        return f"{val:.1f}s"
    frac = Fraction(val).limit_denominator(10000)
    return f"1/{frac.denominator}s"


def _format_aperture(value) -> str:
    if value is None:
        return ""
    try:
        val = float(value)
        if val == int(val):
            return f"f/{int(val)}"
        return f"f/{val:.1f}"
    except (ValueError, TypeError):
        return str(value)


def _format_focal(value) -> str:
    if value is None:
        return ""
    try:
        val = float(value)
        return f"{int(val)}mm"
    except (ValueError, TypeError):
        return str(value)


def _convert_to_degrees(value):
    d, m, s = value
    return float(d) + float(m) / 60.0 + float(s) / 3600.0


def _read_exif(image: Image.Image) -> dict:
    exif_data = {}
    try:
        getter = getattr(image, "getexif", None) or getattr(image, "_getexif", None)
        exif = getter() if getter else None
        if exif is None:
            return exif_data

        # Newer PIL: getexif() returns an Exif object where GPSInfo/ExifOffset are IFD pointers
        gps_ifd = None
        try:
            gps_ifd = exif.get_ifd(0x8825)
        except Exception:
            gps_ifd = None

        if gps_ifd is None and isinstance(exif, dict):
            raw = exif
        else:
            # Rebuild plain dict for older-style parsing; keep raw values for others
            raw = {}
            for tag_id, value in exif.items():
                raw[tag_id] = value

        for tag_id, value in raw.items():
            tag_name = TAGS.get(tag_id, tag_id)
            exif_data[tag_name] = value

        # Prefer IFD-resolved GPS dictionary
        gps_info = gps_ifd or exif_data.get("GPSInfo")
        if gps_info:
            gps_dict = {}
            for k, v in gps_info.items():
                gps_dict[GPSTAGS.get(k, k)] = v

            lat = gps_dict.get("GPSLatitude")
            lat_ref = gps_dict.get("GPSLatitudeRef", "N")
            lon = gps_dict.get("GPSLongitude")
            lon_ref = gps_dict.get("GPSLongitudeRef", "E")

            if lat and lon:
                latitude = _convert_to_degrees(lat)
                longitude = _convert_to_degrees(lon)
                if lat_ref == "S":
                    latitude = -latitude
                if lon_ref == "W":
                    longitude = -longitude
                exif_data["parsed_latitude"] = latitude
                exif_data["parsed_longitude"] = longitude

            alt = gps_dict.get("GPSAltitude")
            if alt is not None:
                alt_ref = gps_dict.get("GPSAltitudeRef", 0)
                # AltitudeRef may be int 0/1 or a bytes value like b"\x00"/b"\x01"
                if isinstance(alt_ref, (bytes, bytearray)):
                    alt_ref = int(alt_ref[0]) if alt_ref else 0
                else:
                    try:
                        alt_ref = int(alt_ref)
                    except (ValueError, TypeError):
                        alt_ref = 0
                exif_data["parsed_altitude"] = float(alt) if alt_ref == 0 else -float(alt)

        # Exif IFD (DateTimeOriginal etc.) is at offset 0x8769 in new PIL
        try:
            exif_ifd = exif.get_ifd(0x8769)
        except Exception:
            exif_ifd = None
        if exif_ifd:
            for tag_id, value in exif_ifd.items():
                tag_name = TAGS.get(tag_id, tag_id)
                exif_data[tag_name] = value
    except Exception:
        pass

    return exif_data


def _parse_date(value) -> datetime.datetime | None:
    if value is None:
        return None
    try:
        s = str(value).strip()
        if not s:
            return None
        for fmt in ["%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M"]:
            try:
                return datetime.datetime.strptime(s, fmt)
            except ValueError:
                continue
        return None
    except Exception:
        return None


@router.get("")
def list_photos(
    published_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=100),
    album_id: int | None = Query(None),
    tag: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Photo)
    if published_only and (current_user is None or not current_user.is_admin):
        query = query.filter(Photo.is_published == True)
    if album_id is not None:
        query = query.filter(Photo.album_id == album_id)
    if tag:
        query = query.filter(Photo.tags.like(f"%{tag}%"))

    total = query.count()
    photos = query.order_by(Photo.shoot_time.desc().nullslast(), Photo.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [PhotoOut.model_validate(p) for p in photos], "total": total}


@router.get("/geotagged", response_model=list[PhotoOut])
def list_geotagged(db: Session = Depends(get_db)):
    photos = (
        db.query(Photo)
        .filter(Photo.latitude.isnot(None), Photo.longitude.isnot(None), Photo.is_published == True)
        .order_by(Photo.shoot_time.desc().nullslast())
        .all()
    )
    return [PhotoOut.model_validate(p) for p in photos]


@router.post("/batch-delete")
def batch_delete_photos(
    payload: BatchDelete,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    photos = db.query(Photo).filter(Photo.id.in_(payload.ids)).all()
    for photo in photos:
        _remove_media((photo.file_path, photo.thumbnail_path))
        db.delete(photo)
    db.commit()
    return {"ok": True, "deleted": len(photos)}


@router.post("/batch-status")
def batch_status_photos(
    payload: BatchStatus,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    photos = db.query(Photo).filter(Photo.id.in_(payload.ids)).all()
    for photo in photos:
        photo.is_published = payload.is_published
    db.commit()
    return {"ok": True, "updated": len(photos)}


@router.get("/{photo_id}", response_model=PhotoOut)
def get_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return PhotoOut.model_validate(photo)


@router.get("/{photo_id}/image")
def get_photo_image(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if storage.is_remote(photo.file_path):
        url = storage.public_url(photo.file_path)
        if not url:
            raise HTTPException(status_code=404, detail="File not found")
        headers = {"Cache-Control": "public, max-age=31536000, immutable"} if storage.PUBLIC_URL else {}
        return RedirectResponse(url, status_code=302, headers=headers)
    path = _resolve_path(photo.file_path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


@router.get("/{photo_id}/thumbnail")
def get_photo_thumbnail(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    stored = photo.thumbnail_path or photo.file_path
    if storage.is_remote(stored):
        url = storage.public_url(stored)
        if not url:
            raise HTTPException(status_code=404, detail="File not found")
        headers = {"Cache-Control": "public, max-age=31536000, immutable"} if storage.PUBLIC_URL else {}
        return RedirectResponse(url, status_code=302, headers=headers)
    path = _resolve_path(stored)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)


def _compress_to_size(img: Image.Image, target_bytes: int) -> bytes:
    """Recompress image to fit target file size without changing dimensions."""
    work = img.convert("RGB") if img.mode not in ("RGB", "L") else img
    if img.mode == "RGBA":
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1])
        work = background

    lo, hi = 5, 95
    best: bytes | None = None
    while lo <= hi:
        q = (lo + hi) // 2
        buf = BytesIO()
        work.save(buf, format="JPEG", quality=q, optimize=True)
        data = buf.getvalue()
        if len(data) <= target_bytes:
            best = data
            lo = q + 1
        else:
            hi = q - 1
    return best if best is not None else work.save(BytesIO(), format="JPEG", quality=5, optimize=True)


def _dms_to_deg(vals) -> float:
    """Convert [deg, min, sec] (possibly rational pairs) to decimal degrees."""
    total = 0.0
    for i, v in enumerate(vals):
        if isinstance(v, (list, tuple)) and len(v) == 2:
            num, den = v
            val = float(num) / float(den) if den else 0.0
        else:
            val = float(v)
        total += val / (60.0 ** i)
    return total


def _apply_exif_json(photo, data: dict):
    """Apply client-provided EXIF JSON onto a Photo object (safe overrides)."""
    if data.get("datetime_original"):
        photo.shoot_time = _parse_date(str(data["datetime_original"]))
    elif data.get("datetime_digitized"):
        photo.shoot_time = _parse_date(str(data["datetime_digitized"]))
    if data.get("model"):
        photo.camera_model = str(data["model"])
    if data.get("make") and not photo.camera_model:
        photo.camera_model = str(data["make"])
    if data.get("lens_model"):
        photo.lens_model = str(data["lens_model"])
    if data.get("focal_length") is not None:
        photo.focal_length = _format_focal(data["focal_length"])
    if data.get("f_number") is not None:
        photo.aperture = _format_aperture(data["f_number"])
    if data.get("exposure_time") is not None:
        photo.shutter_speed = _format_shutter(data["exposure_time"])
    if data.get("iso") is not None:
        photo.iso = str(int(data["iso"]))
    gps_lat = data.get("gps_lat") or {}
    gps_lng = data.get("gps_lng") or {}
    if gps_lat.get("deg") and gps_lng.get("deg"):
        lat = _dms_to_deg(gps_lat["deg"])
        lng = _dms_to_deg(gps_lng["deg"])
        if str(gps_lat.get("ref", "")).upper() == "S":
            lat = -lat
        if str(gps_lng.get("ref", "")).upper() == "W":
            lng = -lng
        photo.latitude = lat
        photo.longitude = lng
        if data.get("gps_alt") is not None:
            photo.altitude = float(data["gps_alt"])


@router.post("/upload", response_model=PhotoOut)
def upload_photo(
    file: UploadFile = File(...),
    title: str = Form(""),
    description: str = Form(""),
    compress: bool = Form(False),
    target_size_mb: float = Form(1.0),
    exif_base64: str = Form(""),
    exif_json: str = Form(""),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "photo.jpg")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tiff", ".tif"):
        raise HTTPException(status_code=400, detail="Unsupported file format")

    # 重复检测：以收到的文件内容哈希为准（客户端压缩过的文件哈希稳定）
    import hashlib
    contents = file.file.read()
    file_hash = hashlib.sha256(contents).hexdigest()
    dup = db.query(Photo).filter(Photo.file_hash == file_hash).first()
    if dup:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate image: already uploaded as #{dup.id} ({dup.title or 'Untitled'})",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    thumb_path = os.path.join(UPLOAD_DIR, f"thumb_{unique_name}")
    img = Image.open(file_path)
    exif_data = _read_exif(img)
    img = ImageOps.exif_transpose(img)

    # Optional recompression to target size (dimensions unchanged)
    if compress:
        target_bytes = max(int(target_size_mb * 1024 * 1024), 1)
        if os.path.getsize(file_path) > target_bytes:
            data = _compress_to_size(img, target_bytes)
            jpg_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.jpg")
            with open(jpg_path, "wb") as f:
                f.write(data)
            os.remove(file_path)
            file_path = jpg_path
            unique_name = os.path.basename(jpg_path)
            thumb_path = os.path.join(UPLOAD_DIR, f"thumb_{unique_name}")
            img = Image.open(file_path)

    # If the client provided EXIF (from frontend compression), inject it back
    # (raw byte-exact segment; piexif supports both JPEG and WebP)
    if exif_base64 and ext in (".jpg", ".jpeg", ".webp"):
        try:
            import piexif
            exif_bytes = base64.b64decode(exif_base64)
            piexif.insert(exif_bytes, file_path)
            # Client-compressed pixels are already orientation-correct; drop the
            # orientation flag so it is not applied twice (double rotation).
            exif_dict = piexif.load(file_path)
            exif_dict["0th"].pop(274, None)
            piexif.insert(piexif.dump(exif_dict), file_path)
            img = Image.open(file_path)
            exif_data = _read_exif(img)
        except Exception as e:
            import logging
            logging.getLogger("photos").warning("EXIF injection failed: %s", e)

    w, h = img.size
    # Thumbnails always saved as JPEG (HEIC has no encoder; RGBA needs RGB)
    thumb_img = img.convert("RGB")
    thumb_img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
    thumb_path = os.path.join(UPLOAD_DIR, f"thumb_{os.path.splitext(unique_name)[0]}.jpg")
    thumb_img.save(thumb_path, format="JPEG", quality=85)

    shoot_time = _parse_date(
        exif_data.get("DateTimeOriginal")
        or exif_data.get("DateTimeDigitized")
        or exif_data.get("DateTime")
    )

    photo = Photo(
        filename=unique_name,
        original_filename=file.filename or "photo.jpg",
        title=title or (file.filename or "Untitled"),
        description=description,
        file_path=unique_name,
        thumbnail_path=f"thumb_{os.path.splitext(unique_name)[0]}.jpg",
        file_hash=file_hash,
        shoot_time=shoot_time,
        camera_model=str(exif_data.get("Model", "")),
        lens_model=str(exif_data.get("LensModel", "")).replace("\x00", "").strip(),
        focal_length=_format_focal(exif_data.get("FocalLength")),
        aperture=_format_aperture(exif_data.get("FNumber")),
        shutter_speed=_format_shutter(exif_data.get("ExposureTime")),
        iso=str(exif_data.get("ISOSpeedRatings", "")),
        latitude=exif_data.get("parsed_latitude"),
        longitude=exif_data.get("parsed_longitude"),
        altitude=exif_data.get("parsed_altitude"),
        location_name=_reverse_geocode(
            exif_data["parsed_latitude"], exif_data["parsed_longitude"]
        ) if exif_data.get("parsed_latitude") is not None and exif_data.get("parsed_longitude") is not None else "",
        image_width=w,
        image_height=h,
        is_published=True,
    )
    # Prefer client-provided EXIF JSON (reliable path for frontend-compressed uploads)
    if exif_json:
        try:
            _apply_exif_json(photo, json.loads(exif_json))
        except Exception:
            pass
    # Clean NaN coords that may come from corrupt injected EXIF
    import math
    if photo.latitude is not None and (isinstance(photo.latitude, float) and math.isnan(photo.latitude)):
        photo.latitude = None
    if photo.longitude is not None and (isinstance(photo.longitude, float) and math.isnan(photo.longitude)):
        photo.longitude = None
    # Reverse geocode if we now have coordinates but no location name
    if photo.latitude is not None and photo.longitude is not None and not photo.location_name:
        # 优先复用附近（约 1km）已有照片的地名，保证同地点命名一致
        # 纬度 0.01 度 ≈ 1.1km，经度按纬度缩放
        deg_lat = 0.01
        deg_lng = deg_lat / max(abs(math.cos(math.radians(photo.latitude))), 0.1)
        nearby = (
            db.query(Photo)
            .filter(
                Photo.latitude.isnot(None),
                Photo.longitude.isnot(None),
                Photo.location_name != "",
                Photo.latitude.between(photo.latitude - deg_lat, photo.latitude + deg_lat),
                Photo.longitude.between(photo.longitude - deg_lng, photo.longitude + deg_lng),
            )
            .first()
        )
        if nearby:
            photo.location_name = nearby.location_name
        else:
            photo.location_name = _reverse_geocode(photo.latitude, photo.longitude)
    # Snapshot the EXIF-derived coordinates so the admin can reset manual edits later
    photo.original_latitude = photo.latitude
    photo.original_longitude = photo.longitude

    # Upload to R2 if configured; keep local files otherwise
    r2_file = storage.upload_file(file_path, f"photos/{os.path.basename(file_path)}")
    r2_thumb = storage.upload_file(thumb_path, f"photos/{os.path.basename(thumb_path)}")
    if r2_file:
        if r2_thumb is None:
            storage.delete_object(r2_file)
        else:
            photo.file_path = r2_file
            photo.thumbnail_path = r2_thumb
            # Local copies are no longer needed once safely in R2
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
            except OSError:
                pass

    db.add(photo)
    db.commit()
    db.refresh(photo)
    return PhotoOut.model_validate(photo)


@router.post("/{photo_id}/location", response_model=PhotoOut)
def set_photo_location(
    photo_id: int,
    payload: PhotoLocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.latitude = payload.latitude
    photo.longitude = payload.longitude
    if photo.latitude is not None and photo.longitude is not None:
        photo.location_name = _reverse_geocode(photo.latitude, photo.longitude)
    else:
        photo.location_name = ""
    photo.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(photo)
    return PhotoOut.model_validate(photo)


@router.post("/{photo_id}/location/reset", response_model=PhotoOut)
def reset_photo_location(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.latitude = photo.original_latitude
    photo.longitude = photo.original_longitude
    if photo.latitude is not None and photo.longitude is not None:
        photo.location_name = _reverse_geocode(photo.latitude, photo.longitude)
    else:
        photo.location_name = ""
    photo.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(photo)
    return PhotoOut.model_validate(photo)


@router.post("/{photo_id}/view")
def increment_photo_view(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    photo.views = (photo.views or 0) + 1
    db.commit()
    return {"ok": True, "views": photo.views}


@router.patch("/{photo_id}", response_model=PhotoOut)
def update_photo(
    photo_id: int,
    payload: PhotoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if payload.title is not None:
        photo.title = payload.title
    if payload.description is not None:
        photo.description = payload.description
    if payload.is_published is not None:
        photo.is_published = payload.is_published
    if payload.shoot_time is not None:
        if payload.shoot_time.strip():
            photo.shoot_time = _parse_date(payload.shoot_time)
    if payload.camera_model is not None and payload.camera_model != "":
        photo.camera_model = payload.camera_model
    if payload.lens_model is not None and payload.lens_model != "":
        photo.lens_model = payload.lens_model
    if payload.focal_length is not None and payload.focal_length != "":
        photo.focal_length = payload.focal_length
    if payload.aperture is not None and payload.aperture != "":
        photo.aperture = payload.aperture
    if payload.shutter_speed is not None and payload.shutter_speed != "":
        photo.shutter_speed = payload.shutter_speed
    if payload.iso is not None and payload.iso != "":
        photo.iso = payload.iso
    if payload.latitude is not None:
        photo.latitude = payload.latitude
    if payload.longitude is not None:
        photo.longitude = payload.longitude
    if payload.location_name is not None:
        photo.location_name = payload.location_name
    if payload.tags is not None:
        photo.tags = payload.tags
    if payload.album_id is not None:
        photo.album_id = payload.album_id
    photo.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(photo)
    return PhotoOut.model_validate(photo)


@router.delete("/{photo_id}")
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    _remove_media((photo.file_path, photo.thumbnail_path))
    db.delete(photo)
    db.commit()
    return {"ok": True}
