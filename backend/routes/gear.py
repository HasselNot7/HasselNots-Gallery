"""器材（机身 / 镜头）实体。

照片表里的 camera_model / lens_model 是 EXIF 自由文本，这里把它们提成有品牌、封面、备注的条目。
对齐方式是 model 字符串相等（后台从 /api/gear/detected 的实测值里选，不手打），
所以老照片不用重传就能挂上新器材卡片。
"""
import os
import re
import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from PIL import Image, ImageOps
from sqlalchemy import func
from sqlalchemy.orm import Session

import brand_norm as bn
import storage
from auth import require_admin
from database import get_db
from models import Gear, Photo
from schemas import GearCreate, GearOut, GearUpdate

router = APIRouter(prefix="/api/gear", tags=["gear"])

GEAR_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "gear")
GEAR_KEY_PREFIX = "gear/"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
COVER_SIZE = (1000, 1000)
KINDS = ("camera", "lens")


def _local_path(stored_path: str) -> str:
    """R2 未配置时器材图落在 uploads/gear/，与 photos 的 _resolve_path 同一套退路。"""
    if not stored_path:
        return ""
    return os.path.join(GEAR_DIR, os.path.basename(stored_path))


def _drop(stored: str):
    if not stored:
        return
    if storage.is_remote(stored):
        storage.delete_object(stored)
    else:
        path = _local_path(stored)
        if os.path.exists(path):
            os.remove(path)


def _remove_image(gear: Gear):
    """展示图和原图永远成对增删，只留一张迟早对不上。"""
    _drop(gear.image_path)
    _drop(gear.image_full_path)
    gear.image_path = ""
    gear.image_full_path = ""


def _to_out(gear: Gear) -> GearOut:
    out = GearOut.model_validate(gear)
    out.has_image = bool(gear.image_path)
    out.has_full_image = bool(gear.image_full_path)
    return out


def worth_tracking(model: str) -> bool:
    """型号串里连数字都没有的不建条目：'Xiaomi'、'----' 是厂商名或固件占位，不是器材型号。"""
    return bool(model) and bool(re.search(r"\d", model))


def _get_or_create(db: Session, kind: str, model: str) -> Gear:
    gear = db.query(Gear).filter(Gear.kind == kind, Gear.model == model).first()
    if gear is None:
        brand = bn.camera_brand("", model) if kind == "camera" else bn.lens_brand("", model)
        gear = Gear(kind=kind, brand=brand, model=model)
        db.add(gear)
    return gear


def sync_gear_from_photo(db: Session, photo: Photo, exif_data: dict):
    """上传照片时顺手把器材补齐：新机身/新镜头自动登记，焦段与最大光圈从
    LensSpecification（0xA432）取——那是镜头固有属性，照片里问不到。
    只填空白字段，绝不覆盖后台手改过的内容。"""
    lens_spec = bn.describe_lens_spec(exif_data.get("LensSpecification"))
    if worth_tracking(photo.camera_model):
        gear = _get_or_create(db, "camera", bn.clean(photo.camera_model))
        if not gear.brand:
            gear.brand = bn.camera_brand(exif_data.get("Make"), photo.camera_model)
    lens_model = bn.clean(photo.lens_model)
    if worth_tracking(lens_model):
        gear = _get_or_create(db, "lens", lens_model)
        if not gear.brand:
            gear.brand = bn.lens_brand(exif_data.get("LensMake"), lens_model)
        if lens_spec[0] and not gear.focal_range:
            gear.focal_range, gear.max_aperture = lens_spec
    db.commit()


def _lens_suggestion(db: Session, lens_model: str) -> tuple[str, str]:
    """后台新建镜头条目时给个草稿：焦段取该镜头实际拍过的最小/最大值，
    最大光圈取用过的最小 f 值。变焦头一定拍过多个焦段，定焦头两个值相同。"""
    rows = (
        db.query(Photo.focal_length, Photo.aperture)
        .filter(Photo.lens_model == lens_model)
        .all()
    )
    focals, apertures = [], []
    for focal, aperture in rows:
        m = re.search(r"\d+(?:\.\d+)?", focal or "")
        if m:
            focals.append(float(m.group()))
        m = re.search(r"\d+(?:\.\d+)?", aperture or "")
        if m and float(m.group()) > 0:
            apertures.append(float(m.group()))
    if not focals:
        return "", ""
    lo, hi = min(focals), max(focals)
    focal_range = f"{int(lo)}mm" if lo == hi else f"{int(lo)}-{int(hi)}mm"
    max_aperture = f"F{min(apertures):g}" if apertures else ""
    return focal_range, max_aperture


@router.get("/detected")
def detected_models(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """照片里真实出现过的型号 + 已建/未建标记，后台一键导入用。"""
    items = []
    for kind, field in (("camera", Photo.camera_model), ("lens", Photo.lens_model)):
        rows = (
            db.query(field, func.count(Photo.id))
            .filter(field.isnot(None), field != "")
            .group_by(field)
            .all()
        )
        for raw_model, count in rows:
            model = bn.clean(raw_model)
            if not model:
                continue
            gear = db.query(Gear).filter(Gear.kind == kind, Gear.model == model).first()
            focal_range, max_aperture = ("", "")
            if kind == "lens":
                focal_range, max_aperture = _lens_suggestion(db, raw_model)
            items.append({
                "kind": kind,
                "model": model,
                "photos": count,
                "known": gear is not None,
                "gear_id": gear.id if gear else None,
                "suggested_brand": (
                    (gear.brand if gear else "")
                    or (bn.camera_brand("", model) if kind == "camera" else bn.lens_brand("", model))
                ),
                "suggested_focal_range": (gear.focal_range if gear and gear.focal_range else focal_range),
                "suggested_max_aperture": (gear.max_aperture if gear and gear.max_aperture else max_aperture),
            })
    return sorted(items, key=lambda i: (-i["photos"], i["model"]))


@router.get("", response_model=list[GearOut])
def list_gear(db: Session = Depends(get_db)):
    gears = db.query(Gear).all()
    gears.sort(key=lambda g: (g.kind != "camera", g.brand.lower(), g.model.lower()))
    return [_to_out(g) for g in gears]


def _serve(stored: str):
    """器材图公开可读（器材页本身不带鉴权）。<img> 带不了 Authorization 头，
    所以这里也不能要求登录。"""
    if storage.is_remote(stored):
        url = storage.public_url(stored)
        if not url:
            raise HTTPException(status_code=404, detail="Image not found")
        # 302 本身不能缓存：后台换图后接口地址不变，把跳转缓存一年就等于永远看不到新图。
        # 真正不可变的是 R2 对象地址（每次上传换 uuid），由 R2 那边缓存。
        return RedirectResponse(url, status_code=302, headers={"Cache-Control": "no-store"})
    path = _local_path(stored)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@router.get("/{gear_id}/image")
def get_gear_image(gear_id: int, db: Session = Depends(get_db)):
    """展示图（1000px JPEG），卡片用的就是这张。"""
    gear = db.query(Gear).filter(Gear.id == gear_id).first()
    if gear is None or not gear.image_path:
        raise HTTPException(status_code=404, detail="No gear image")
    return _serve(gear.image_path)


@router.get("/{gear_id}/image/full")
def get_gear_image_full(gear_id: int, db: Session = Depends(get_db)):
    """原图，字节原样存档；换图之前的历史版本不做保留，只留最新一份。"""
    gear = db.query(Gear).filter(Gear.id == gear_id).first()
    if gear is None or not gear.image_full_path:
        raise HTTPException(status_code=404, detail="No gear original")
    return _serve(gear.image_full_path)


@router.patch("/{gear_id}", response_model=GearOut)
def update_gear(
    gear_id: int,
    payload: GearUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    gear = db.query(Gear).filter(Gear.id == gear_id).first()
    if gear is None:
        raise HTTPException(status_code=404, detail="Gear not found")
    data = payload.model_dump(exclude_none=True)
    if "kind" in data:
        kind = (data["kind"] or "").strip().lower()
        if kind not in KINDS:
            raise HTTPException(status_code=400, detail="kind must be 'camera' or 'lens'")
        data["kind"] = kind
    for field in ("brand", "model", "label", "focal_range", "max_aperture"):
        if field in data:
            data[field] = bn.clean(data[field])
    if data.get("model") and data["model"] != gear.model:
        clash = (
            db.query(Gear)
            .filter(Gear.kind == data.get("kind", gear.kind), Gear.model == data["model"], Gear.id != gear_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail=f"{data['model']} 已存在")
    for key, value in data.items():
        setattr(gear, key, value)
    db.commit()
    db.refresh(gear)
    return _to_out(gear)


@router.delete("/{gear_id}")
def delete_gear(
    gear_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    gear = db.query(Gear).filter(Gear.id == gear_id).first()
    if gear is None:
        raise HTTPException(status_code=404, detail="Gear not found")
    _remove_image(gear)
    db.delete(gear)
    db.commit()
    return {"ok": True, "deleted": gear_id}


@router.post("/{gear_id}/image", response_model=GearOut)
def upload_gear_image(
    gear_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """一次上传存两份：原图字节原样留档（gear/<uuid><ext>），另存一张
    长边 1000px、q88 的 JPEG 当展示图（gear/<uuid>-d.jpg，同一个 uuid 好认）。
    卡片位实测只要 690px（345 CSS px × 2 倍屏），1000px 留足余量；
    后台传的多是相机产品图，动辄好几 MB，直接展示既慢又费流量。"""
    gear = db.query(Gear).filter(Gear.id == gear_id).first()
    if gear is None:
        raise HTTPException(status_code=404, detail="Gear not found")

    ext = os.path.splitext(file.filename or "gear.jpg")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format (jpg/png/webp)")
    contents = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 10MB)")
    try:
        img = Image.open(BytesIO(contents))
        img = ImageOps.exif_transpose(img)
        img.thumbnail(COVER_SIZE, Image.LANCZOS)
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot decode image")

    os.makedirs(GEAR_DIR, exist_ok=True)
    stem = uuid.uuid4().hex
    full_name, disp_name = f"{stem}{ext}", f"{stem}-d.jpg"
    local_full = os.path.join(GEAR_DIR, full_name)
    local_disp = os.path.join(GEAR_DIR, disp_name)
    with open(local_full, "wb") as f:
        f.write(contents)
    img.convert("RGB").save(local_disp, format="JPEG", quality=88)

    old_full, old_disp = gear.image_full_path, gear.image_path
    remote_full = storage.upload_file(local_full, f"{GEAR_KEY_PREFIX}{full_name}")
    remote_disp = storage.upload_file(local_disp, f"{GEAR_KEY_PREFIX}{disp_name}")
    if remote_full and remote_disp:
        gear.image_full_path, gear.image_path = remote_full, remote_disp
        for leftover in (local_full, local_disp):
            if os.path.exists(leftover):
                os.remove(leftover)
    else:
        # 只传上去一半就作废，两份必须同生同死；R2 完全没配时这份判断让两张都留本地
        _drop(remote_full)
        _drop(remote_disp)
        gear.image_full_path, gear.image_path = full_name, disp_name
    db.commit()
    db.refresh(gear)
    _drop(old_disp)
    _drop(old_full)
    return _to_out(gear)


@router.delete("/{gear_id}/image", response_model=GearOut)
def delete_gear_image(
    gear_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    gear = db.query(Gear).filter(Gear.id == gear_id).first()
    if gear is None:
        raise HTTPException(status_code=404, detail="Gear not found")
    _remove_image(gear)
    db.commit()
    db.refresh(gear)
    return _to_out(gear)


@router.post("", response_model=GearOut)
def create_gear(
    payload: GearCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    kind = (payload.kind or "").strip().lower()
    if kind not in KINDS:
        raise HTTPException(status_code=400, detail="kind must be 'camera' or 'lens'")
    model = bn.clean(payload.model)
    if not model:
        raise HTTPException(status_code=400, detail="model is required")
    if db.query(Gear).filter(Gear.kind == kind, Gear.model == model).first():
        raise HTTPException(status_code=409, detail=f"{model} 已存在")
    gear = Gear(
        kind=kind,
        model=model,
        brand=bn.clean(payload.brand),
        label=bn.clean(payload.label),
        note=payload.note or "",
        focal_range=bn.clean(payload.focal_range),
        max_aperture=bn.clean(payload.max_aperture),
    )
    db.add(gear)
    db.commit()
    db.refresh(gear)
    return _to_out(gear)
