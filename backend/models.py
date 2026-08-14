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

    shoot_time = Column(DateTime, default=None)
    camera_model = Column(String, default="")
    lens_model = Column(String, default="")
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

    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value = Column(String, default="")
