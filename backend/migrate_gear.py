"""器材功能的一次性迁移：给 photos 补 camera_make/lens_make 两列、回填品牌、按实测型号建器材条目。

仓库里没有 alembic，只有 main.py 的 Base.metadata.create_all —— 它只建表，
**不会**给已存在的表加列，所以这两列必须在这里手动 ALTER。
脚本幂等，可反复执行；生产库上跑之前先备份（scripts/backup.sh）。

    cd backend && .venv/bin/python migrate_gear.py
"""
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import func

import brand_norm as bn
from database import Base, engine, SessionLocal
from models import Gear, Photo

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gallery.db")

# (表, 列, 定义)。一律默认空串：老行没有这些值，留空比塞错值好
NEW_COLUMNS = [
    ("photos", "camera_make", "VARCHAR DEFAULT ''"),
    ("photos", "lens_make", "VARCHAR DEFAULT ''"),
    ("gear", "image_full_path", "VARCHAR DEFAULT ''"),
]


def add_missing_columns() -> list[str]:
    conn = sqlite3.connect(DB_PATH)
    try:
        added = []
        for table, name, decl in NEW_COLUMNS:
            have = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
            if name in have:
                continue
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {decl}")
            added.append(f"{table}.{name}")
        conn.commit()
        return added
    finally:
        conn.close()


def backfill_brands(db) -> int:
    """品牌全部由型号串推断（brand_norm 实测 22/22 命中）：
    重新下载原图读 Make 要跑 74 次网络请求，收益一样，不值得。"""
    filled = 0
    for p in db.query(Photo).all():
        if not bn.clean(p.camera_make):
            p.camera_make = bn.camera_brand("", p.camera_model)
            filled += 1 if p.camera_make else 0
        model = bn.clean(p.lens_model)
        if model and not bn.clean(p.lens_make):
            p.lens_make = bn.lens_brand("", model)
    db.commit()
    return filled


def seed_gear(db) -> list[Gear]:
    """按照片里真实出现过的型号建条目，model 取库里的原样字符串（自由文本对不上就没图）。
    型号串连数字都没有的一律跳过：'----'、'Xiaomi' 这类是固件占位或厂商名，不是镜头型号。"""
    created = []
    for kind, field in (("camera", Photo.camera_model), ("lens", Photo.lens_model)):
        rows = (
            db.query(field, func.count(Photo.id))
            .filter(field.isnot(None), field != "")
            .group_by(field)
            .all()
        )
        for model, _count in rows:
            model = bn.clean(model)
            if not model or not re.search(r"\d", model):
                continue
            if db.query(Gear).filter(Gear.kind == kind, Gear.model == model).first():
                continue
            brand = bn.camera_brand("", model) if kind == "camera" else bn.lens_brand("", model)
            gear = Gear(kind=kind, brand=brand, model=model)
            db.add(gear)
            created.append(gear)
    db.commit()
    return created


def fill_gear_brands(db) -> int:
    """品牌规则改进后重跑就能补上老条目的空品牌，只填不加，后台手改过的值一律不覆盖。"""
    filled = 0
    for g in db.query(Gear).all():
        if bn.clean(g.brand):
            continue
        g.brand = bn.camera_brand("", g.model) if g.kind == "camera" else bn.lens_brand("", g.model)
        filled += 1 if g.brand else 0
    db.commit()
    return filled


def main():
    # gear 是新表，create_all 建得出来；photos 的列它管不了
    Base.metadata.create_all(bind=engine)
    added = add_missing_columns()
    db = SessionLocal()
    try:
        filled = backfill_brands(db)
        created = seed_gear(db)
        branded = fill_gear_brands(db)
        print(f"photos 新列: {added or '已存在'}")
        print(f"回填品牌: {filled} 张照片拿到品牌，{branded} 条器材补上品牌")
        print(f"新建器材: {len(created)} 条")
        for g in db.query(Gear).all():
            print(f"  #{g.id} [{g.kind}] {g.brand or '?':<10} {g.model}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
