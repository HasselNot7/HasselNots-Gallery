import datetime
import re
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
import brand_norm as bn
from models import Gear, Photo

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
    ("35-50mm", lambda v: 35 <= v < 50),
    ("50-85mm", lambda v: 50 <= v < 85),
    ("85-135mm", lambda v: 85 <= v < 135),
    ("135-200mm", lambda v: 135 <= v < 200),
    ("200-300mm", lambda v: 200 <= v < 300),
    (">300mm", lambda v: v >= 300),
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
    # 名字里的 ">" 指光圈更大（f 数更小），跟数值大小相反 —— 沿用摄影习惯写法
    (">f/1.4", lambda v: 0 < v < 1.4),
    ("f/1.4-1.8", lambda v: 1.4 <= v < 1.8),
    ("f/1.8-2", lambda v: 1.8 <= v < 2.0),
    ("f/2-2.8", lambda v: 2.0 <= v < 2.8),
    ("f/2.8-4", lambda v: 2.8 <= v < 4.0),
    ("f/4-5.6", lambda v: 4.0 <= v < 5.6),
    ("f/5.6-8", lambda v: 5.6 <= v < 8.0),
    ("<f/8", lambda v: v >= 8.0),
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


def _opt_num(text) -> float | None:
    """从 'f/2.8'、'35mm' 这类串里取第一个数字；取不到给 None（_num 给 inf，别混用）。"""
    m = re.search(r"\d+(?:\.\d+)?", text or "")
    return float(m.group()) if m else None


def _brand_counts(db: Session, field) -> list[dict]:
    """品牌分布。没存过 Make 的老照片归进「未记录」，环形图各扇区之和才等于总张数。"""
    rows = (
        db.query(field, func.count(Photo.id))
        .filter(Photo.is_published == True)
        .group_by(field)
        .all()
    )
    counts: dict[str, int] = {}
    for name, cnt in rows:
        key = bn.clean(name) or "未记录"
        counts[key] = counts.get(key, 0) + cnt
    return sorted(({"name": k, "count": v} for k, v in counts.items()), key=lambda r: -r["count"])


def _yearly_counts(db: Session) -> list[dict]:
    rows = (
        db.query(func.strftime("%Y", Photo.shoot_time), func.count(Photo.id))
        .filter(Photo.is_published == True, Photo.shoot_time.isnot(None))
        .group_by(func.strftime("%Y", Photo.shoot_time))
        .all()
    )
    return sorted(({"name": y, "count": c} for y, c in rows if y), key=lambda r: r["name"])


def _recent_months(anchor, span: int = 12) -> list[str]:
    """以最后一张有拍摄时间的照片为锚点往回数 span 个月；用今天会让老库全是空柱。"""
    labels = []
    year, month = anchor.year, anchor.month
    for _ in range(span):
        labels.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return list(reversed(labels))


def _gear_rows(db: Session, months: list[str], total: int) -> list[dict]:
    """每条器材的实际用量：出片张数、占比、近 12 个月序列、拍过的焦段区间、常用最大光圈。
    与照片的对应关系是 model 字符串相等（两边都先 clean 掉 NUL 与 '----'）。"""
    shots = (
        db.query(
            Photo.camera_model, Photo.lens_model, Photo.camera_make, Photo.lens_make,
            Photo.focal_length, Photo.aperture, Photo.shoot_time,
        )
        .filter(Photo.is_published == True)
        .all()
    )
    slot_of = {label: i for i, label in enumerate(months)}
    buckets: dict[tuple[str, str], list] = {}
    for s in shots:
        for kind, model, make in (
            ("camera", s.camera_model, s.camera_make),
            ("lens", s.lens_model, s.lens_make),
        ):
            key = (kind, bn.clean(model))
            if key[1]:
                buckets.setdefault(key, []).append(s)

    out = []
    for g in db.query(Gear).all():
        rows = buckets.get((g.kind, bn.clean(g.model)), [])
        series = [0] * len(months)
        focals, apertures, dates, brands = [], [], [], []
        for s in rows:
            if s.shoot_time:
                dates.append(s.shoot_time)
                slot = slot_of.get(s.shoot_time.strftime("%Y-%m"))
                if slot is not None:
                    series[slot] += 1
            focal = _opt_num(s.focal_length)
            if focal:
                focals.append(focal)
            aperture = _opt_num(s.aperture)
            if aperture:
                apertures.append(aperture)
            make = bn.clean(s.camera_make if g.kind == "camera" else s.lens_make)
            if make:
                brands.append(make)
        # 焦段与最大光圈是镜头的属性，机身卡片上出现「F1.4」只会让人以为是快门参数。
        # 没登记过的镜头退回「拍过的值」：定焦头一定准，变焦头只是下限，后台填了就以它为准。
        observed_range = observed_aperture = ""
        if g.kind == "lens" and focals:
            lo, hi = min(focals), max(focals)
            observed_range = f"{int(lo)}mm" if lo == hi else f"{int(lo)}-{int(hi)}mm"
            observed_aperture = f"F{min(apertures):g}" if apertures else ""
        out.append({
            "id": g.id,
            "kind": g.kind,
            # 后台填的品牌优先，空了才退回照片里的 Make
            "brand": bn.clean(g.brand) or (brands[0] if brands else ""),
            "model": g.model,
            "label": g.label,
            "note": g.note,
            "focal_range": g.focal_range or observed_range,
            "max_aperture": g.max_aperture or observed_aperture,
            "has_image": bool(g.image_path),
            "photos": len(rows),
            "share": round(len(rows) / total * 100, 1) if total else 0.0,
            "series": series,
            "first_shot": min(dates).strftime("%Y-%m-%d") if dates else "",
            "last_shot": max(dates).strftime("%Y-%m-%d") if dates else "",
        })
    out.sort(key=lambda r: (-r["photos"], r["brand"], r["model"]))
    return out


def _range_buckets(db: Session, field, parse, ranges) -> list[dict]:
    """按区间统计某个 EXIF 字符串字段。区间互斥，取第一个命中的；零值区间照样返回，
    柱状图靠它保持横轴连续（焦段/光圈两张图本来就是这个形状，ISO 与快门跟着对齐）。"""
    values = (
        db.query(field)
        .filter(Photo.is_published == True, field.isnot(None), field != "")
        .all()
    )
    counts: dict[str, int] = {}
    for (raw,) in values:
        v = parse(raw)
        if v is None:
            continue
        for label, in_range in ranges:
            if in_range(v):
                counts[label] = counts.get(label, 0) + 1
                break
    return [{"name": label, "count": counts.get(label, 0)} for label, _ in ranges]


# 边界一律「下开上闭」，这样 ISO 200 归 100-200、400 归 200-400，不会两头都数一遍
ISO_RANGES = [
    ("≤100", lambda v: v <= 100),
    ("100-200", lambda v: 100 < v <= 200),
    ("200-400", lambda v: 200 < v <= 400),
    ("400-800", lambda v: 400 < v <= 800),
    ("800-1600", lambda v: 800 < v <= 1600),
    ("1600-3200", lambda v: 1600 < v <= 3200),
    ("3200-6400", lambda v: 3200 < v <= 6400),
    ("6400-12800", lambda v: 6400 < v <= 12800),
    (">12800", lambda v: v > 12800),
]

# 快门按秒数排，从长曝到高速；1/15、1/4 这类用分数写才看得懂是快门而不是时长
SHUTTER_RANGES = [
    ("≥1s", lambda v: v >= 1),
    ("1/4-1s", lambda v: 0.25 <= v < 1),
    ("1/15-1/4", lambda v: 1 / 15 <= v < 0.25),
    ("1/60-1/15", lambda v: 1 / 60 <= v < 1 / 15),
    ("1/125-1/60", lambda v: 1 / 125 <= v < 1 / 60),
    ("1/250-1/125", lambda v: 1 / 250 <= v < 1 / 125),
    ("1/500-1/250", lambda v: 1 / 500 <= v < 1 / 250),
    ("1/1000-1/500", lambda v: 0.001 <= v < 1 / 500),
    ("<1/1000", lambda v: v < 0.001),
]


def _iso_num(text) -> float | None:
    return _opt_num(text)


def _shutter_num(text) -> float | None:
    seconds = _shutter_seconds(text)
    # _shutter_seconds 认不出来时给 inf，会被 ≥1s 那档全接走，必须先挡掉
    return None if seconds == float("inf") else seconds


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

    last_shot = (
        db.query(func.max(Photo.shoot_time))
        .filter(Photo.is_published == True, Photo.shoot_time.isnot(None))
        .scalar()
    )
    months = _recent_months(last_shot or datetime.datetime.now())

    return {
        "total_photos": total,
        "cameras": sorted(group(Photo.camera_model), key=lambda r: -r["count"]),
        "lenses": sorted(group(Photo.lens_model, exclude="----"), key=lambda r: -r["count"]),
        "focal_lengths": _focal_buckets(db),
        "apertures": _aperture_buckets(db),
        "iso_ranges": _range_buckets(db, Photo.iso, _iso_num, ISO_RANGES),
        "shutter_ranges": _range_buckets(db, Photo.shutter_speed, _shutter_num, SHUTTER_RANGES),
        "camera_brands": _brand_counts(db, Photo.camera_make),
        "lens_brands": _brand_counts(db, Photo.lens_make),
        "yearly": _yearly_counts(db),
        "months": months,
        "gear": _gear_rows(db, months, total),
    }
