from pydantic import BaseModel, Field
from defaults import DEFAULTS
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AdminCreate(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool

    model_config = {"from_attributes": True}


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
    hero_title: str = Field(default=DEFAULTS["hero_title"])
    hero_description: str = Field(default=DEFAULTS["hero_description"])
    site_tagline: str = Field(default=DEFAULTS["site_tagline"])
    site_title: str = Field(default=DEFAULTS["site_title"])
    site_name: str = Field(default=DEFAULTS["site_name"])
    hero_side_label: str = Field(default=DEFAULTS["hero_side_label"])
    hero_side_brand: str = Field(default=DEFAULTS["hero_side_brand"])
    footer_title: str = Field(default=DEFAULTS["footer_title"])
    footer_copyright: str = Field(default=DEFAULTS["footer_copyright"])
    hero_icon: str = Field(default=DEFAULTS["hero_icon"])
    hero_icon_url: str = Field(default=DEFAULTS["hero_icon_url"])
    bg_color1: str = Field(default=DEFAULTS["bg_color1"])
    bg_color2: str = Field(default=DEFAULTS["bg_color2"])
    bg_color3: str = Field(default=DEFAULTS["bg_color3"])
    bg_color4: str = Field(default=DEFAULTS["bg_color4"])
    bg_color5: str = Field(default=DEFAULTS["bg_color5"])
    bg_color6: str = Field(default=DEFAULTS["bg_color6"])
    bg_base: str = Field(default=DEFAULTS["bg_base"])
    water_ink1: str = Field(default=DEFAULTS["water_ink1"])
    water_ink2: str = Field(default=DEFAULTS["water_ink2"])
    water_ink_top: str = Field(default=DEFAULTS["water_ink_top"])
    water_strength: str = Field(default=DEFAULTS["water_strength"])
    hero_gradient_size: str = Field(default=DEFAULTS["hero_gradient_size"])
    hero_gradient_count: str = Field(default=DEFAULTS["hero_gradient_count"])
    hero_speed: str = Field(default=DEFAULTS["hero_speed"])
    hero_color1_weight: str = Field(default=DEFAULTS["hero_color1_weight"])
    hero_color2_weight: str = Field(default=DEFAULTS["hero_color2_weight"])
    show_hero_decorations: str = Field(default=DEFAULTS["show_hero_decorations"])
    show_hero_shader: str = Field(default=DEFAULTS["show_hero_shader"])
    show_water_ripple: str = Field(default=DEFAULTS["show_water_ripple"])


class SettingsUpdate(BaseModel):
    hero_title: Optional[str] = None
    hero_description: Optional[str] = None
    site_tagline: Optional[str] = None
    site_title: Optional[str] = None
    site_name: Optional[str] = None
    hero_side_label: Optional[str] = None
    hero_side_brand: Optional[str] = None
    footer_title: Optional[str] = None
    footer_copyright: Optional[str] = None
    hero_icon: Optional[str] = None
    hero_icon_url: Optional[str] = None
    bg_color1: Optional[str] = None
    bg_color2: Optional[str] = None
    bg_color3: Optional[str] = None
    bg_color4: Optional[str] = None
    bg_color5: Optional[str] = None
    bg_color6: Optional[str] = None
    bg_base: Optional[str] = None
    water_ink1: Optional[str] = None
    water_ink2: Optional[str] = None
    water_ink_top: Optional[str] = None
    water_strength: Optional[str] = None
    hero_gradient_size: Optional[str] = None
    hero_gradient_count: Optional[str] = None
    hero_speed: Optional[str] = None
    hero_color1_weight: Optional[str] = None
    hero_color2_weight: Optional[str] = None
    show_hero_decorations: Optional[str] = None
    show_hero_shader: Optional[str] = None
    show_water_ripple: Optional[str] = None
    # 写入通道有、读取通道（SettingsOut）没有：公开的 GET /api/settings 拿不到它，
    # 浏览器改从公开的 /api/map-config 取。别把它们加进 SettingsOut。
    carto_api_key: Optional[str] = None
    osm_tile_source: Optional[str] = None
    default_map_layer: Optional[str] = None
