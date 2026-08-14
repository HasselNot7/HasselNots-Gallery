from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str


class PhotoOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    title: str
    description: str
    shoot_time: Optional[datetime] = None
    camera_model: str
    lens_model: str
    focal_length: str
    aperture: str
    shutter_speed: str
    iso: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    location_name: Optional[str] = ""
    original_latitude: Optional[float] = None
    original_longitude: Optional[float] = None
    image_width: int
    image_height: int
    views: int = 0
    tags: str = ""
    album_id: Optional[int] = None
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PhotoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_published: Optional[bool] = None
    shoot_time: Optional[str] = None
    camera_model: Optional[str] = None
    lens_model: Optional[str] = None
    focal_length: Optional[str] = None
    aperture: Optional[str] = None
    shutter_speed: Optional[str] = None
    iso: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    tags: Optional[str] = None
    album_id: Optional[int] = None


class BatchDelete(BaseModel):
    ids: list[int]


class BatchStatus(BaseModel):
    ids: list[int]
    is_published: bool


class PhotoLocationUpdate(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ArticleOut(BaseModel):
    id: int
    slug: str
    title: str
    content_md: str
    content_html: str = ""
    excerpt: str
    tags: str
    cover_photo_id: Optional[int] = None
    views: int = 0
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    slug: str
    title: str
    content_md: str = ""
    excerpt: str = ""
    tags: str = ""
    cover_photo_id: Optional[int] = None
    is_published: bool = False


class ArticleUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    content_md: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[str] = None
    cover_photo_id: Optional[int] = None
    is_published: Optional[bool] = None


class AlbumOut(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    cover_photo_id: Optional[int] = None
    photo_count: int = 0
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlbumCreate(BaseModel):
    slug: str = ""
    title: str
    description: str = ""
    cover_photo_id: Optional[int] = None
    is_published: bool = True


class AlbumUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    cover_photo_id: Optional[int] = None
    is_published: Optional[bool] = None


class CommentOut(BaseModel):
    id: int
    photo_id: Optional[int] = None
    article_id: Optional[int] = None
    author: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    photo_id: Optional[int] = None
    article_id: Optional[int] = None
    author: str
    content: str


class SettingsOut(BaseModel):
    hero_title: str = "Precision Capture.\nTimeless Frames."
    hero_description: str = "A curated collection of photographic works — each frame capturing the interplay of light, geometry, and fleeting moments across the globe."
    hero_icon: str = "photo_camera"
    hero_icon_url: str = ""
    bg_color1: str = "#316944"
    bg_color2: str = "#163828"
    bg_color3: str = "#85C093"
    bg_color4: str = "#0a0e27"
    bg_color5: str = "#98d4a6"
    bg_color6: str = "#1e4c32"
    bg_base: str = "#163828"


class SettingsUpdate(BaseModel):
    hero_title: Optional[str] = None
    hero_description: Optional[str] = None
    hero_icon: Optional[str] = None
    hero_icon_url: Optional[str] = None
    bg_color1: Optional[str] = None
    bg_color2: Optional[str] = None
    bg_color3: Optional[str] = None
    bg_color4: Optional[str] = None
    bg_color5: Optional[str] = None
    bg_color6: Optional[str] = None
    bg_base: Optional[str] = None
