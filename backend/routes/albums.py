import datetime
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Album, Photo
from schemas import AlbumOut, AlbumCreate, AlbumUpdate
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/albums", tags=["albums"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", text.strip()).strip("-").lower()
    return slug or "album"


def _to_out(album: Album, db: Session) -> AlbumOut:
    photos = (
        db.query(Photo)
        .filter(Photo.album_id == album.id, Photo.is_published == True)
        .order_by(Photo.shoot_time.desc().nullslast(), Photo.id.desc())
        .all()
    )
    out = AlbumOut.model_validate(album)
    out.photo_count = len(photos)
    # 封面自动回退：cover_photo_id 为空或不属于本专辑时，用专辑内最新照片
    if not out.cover_photo_id or not any(p.id == out.cover_photo_id for p in photos):
        out.cover_photo_id = photos[0].id if photos else None
    return out


@router.get("", response_model=list[AlbumOut])
def list_albums(
    published_only: bool = True,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Album)
    if published_only and (current_user is None or not current_user.is_admin):
        query = query.filter(Album.is_published == True)
    elif not published_only and (current_user is None or not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Admin access required")
    albums = query.order_by(Album.created_at.desc()).all()
    return [_to_out(a, db) for a in albums]


@router.get("/{slug}", response_model=AlbumOut)
def get_album(slug: str, db: Session = Depends(get_db)):
    album = db.query(Album).filter(Album.slug == slug).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return _to_out(album, db)


@router.post("", response_model=AlbumOut)
def create_album(
    payload: AlbumCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    slug = payload.slug.strip() or _slugify(payload.title)
    if db.query(Album).filter(Album.slug == slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    album = Album(
        slug=slug,
        title=payload.title,
        description=payload.description,
        cover_photo_id=payload.cover_photo_id,
        is_published=payload.is_published,
    )
    db.add(album)
    db.commit()
    db.refresh(album)
    return _to_out(album, db)


@router.patch("/{slug}", response_model=AlbumOut)
def update_album(
    slug: str,
    payload: AlbumUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    album = db.query(Album).filter(Album.slug == slug).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    if payload.slug is not None and payload.slug.strip() and payload.slug != album.slug:
        if db.query(Album).filter(Album.slug == payload.slug.strip()).first():
            raise HTTPException(status_code=400, detail="Slug already exists")
        album.slug = payload.slug.strip()
    if payload.title is not None:
        album.title = payload.title
    if payload.description is not None:
        album.description = payload.description
    if "cover_photo_id" in payload.model_fields_set:
        album.cover_photo_id = payload.cover_photo_id
    if payload.is_published is not None:
        album.is_published = payload.is_published
    album.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(album)
    return _to_out(album, db)


@router.delete("/{slug}")
def delete_album(
    slug: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    album = db.query(Album).filter(Album.slug == slug).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    # 相册删除后照片回到未分组状态
    db.query(Photo).filter(Photo.album_id == album.id).update({"album_id": None})
    db.delete(album)
    db.commit()
    return {"ok": True}
