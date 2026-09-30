import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    title = Column(String, default="")
    description = Column(String, default="")
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, default="")
    file_hash = Column(String, default="")

    shoot_time = Column(DateTime, default=None)
    camera_model = Column(String, default="")
    # Make / LensMake 单独存列：型号串里品牌常被厂商吃掉
    # （ILCE-7CM2 看不出是 Sony，85mm F1.4 DG DN | Art 020 看不出是适马）
    camera_make = Column(String, default="")
    lens_model = Column(String, default="")
    lens_make = Column(String, default="")
    focal_length = Column(String, default="")
    aperture = Column(String, default="")
    shutter_speed = Column(String, default="")
    iso = Column(String, default="")

    latitude = Column(Float, default=None)
    longitude = Column(Float, default=None)
    altitude = Column(Float, default=None)
    location_name = Column(String, default="")
    original_latitude = Column(Float, default=None)
    original_longitude = Column(Float, default=None)

    image_width = Column(Integer, default=0)
    image_height = Column(Integer, default=0)

    views = Column(Integer, default=0)

    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    tags = Column(String, default="")
    album_id = Column(Integer, default=None)


class Gear(Base):
    """一条器材（机身或镜头）。照片表里的 camera_model/lens_model 是自由文本，
    这里把它升级成有封面、有品牌、有备注的实体：model 字段存 EXIF 原样型号串，
    与照片按字符串对上（后台从 /api/gear/detected 的实测值里挑，不手打，避免对不上）。"""

    __tablename__ = "gear"

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String, default="camera")  # camera | lens
    brand = Column(String, default="")       # Sony / Sigma / Fujifilm…
    model = Column(String, default="", index=True)  # EXIF Model / LensModel 原样
    label = Column(String, default="")       # 展示名，留空退到 brand + model
    note = Column(String, default="")        # 心得/规格备注
    focal_range = Column(String, default="")  # 镜头固有焦段，来自 0xA432 LensSpecification
    max_aperture = Column(String, default="")  # 最大光圈 F2.8 之类
    image_path = Column(String, default="")  # 展示图：gear/<uuid>-d.jpg，长边 1000px 的 JPEG
    image_full_path = Column(String, default="")  # 原图：gear/<uuid><ext>，字节原样留档
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Album(Base):
    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    cover_photo_id = Column(Integer, default=None)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, default=None)
    article_id = Column(Integer, default=None)
    author = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class VisitLog(Base):
    __tablename__ = "visit_logs"

    id = Column(Integer, primary_key=True, index=True)
    path = Column(String, default="")
    ip_hash = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    content_md = Column(String, default="")
    excerpt = Column(String, default="")
    tags = Column(String, default="")
    cover_photo_id = Column(Integer, default=None)

    views = Column(Integer, default=0)

    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value = Column(String, default="")
