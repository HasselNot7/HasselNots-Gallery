"""用存着的原图重算所有器材封面的展示图。

背景：展示图一度统一转成 JPEG，而 JPEG 没有透明通道，透明底产品图被 convert('RGB')
压成了黑底。修好管线后不必让后台逐件重传 —— 原图是字节原样存的，重新派生一次即可。

    cd backend && .venv/bin/python regenerate_gear_covers.py

只改 image_path（展示图），不动原图与任何文字字段；没有原图的行跳过。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Gear
from routes.gear import _regenerate_display

db = SessionLocal()
targets = db.query(Gear).filter(Gear.image_full_path != "", Gear.image_full_path.isnot(None)).all()
print(f"有原图的器材: {len(targets)} 条")
done = skipped = 0
for gear in targets:
    old = gear.image_path
    if _regenerate_display(db, gear):
        done += 1
        print(f"  #{gear.id} {gear.model[:38]:<38} {os.path.basename(old)} → {os.path.basename(gear.image_path)}")
    else:
        skipped += 1
        print(f"  #{gear.id} {gear.model[:38]:<38} 跳过（原图取不到或解码失败）")
db.close()
print(f"重算 {done} 条，跳过 {skipped} 条")
