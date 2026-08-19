from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Photo, Article
from schemas import PhotoOut, ArticleOut

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search(q: str = Query(..., min_length=1, max_length=100), db: Session = Depends(get_db)):
    like = f"%{q.strip()}%"
    photos = (
        db.query(Photo)
        .filter(
            Photo.is_published == True,
            (
                Photo.title.ilike(like)
                | Photo.description.ilike(like)
                | Photo.location_name.ilike(like)
                | Photo.camera_model.ilike(like)
                | Photo.lens_model.ilike(like)
                | Photo.tags.ilike(like)
                | Photo.original_filename.ilike(like)
            ),
        )
        .order_by(Photo.shoot_time.desc().nullslast(), Photo.created_at.desc())
        .limit(60)
        .all()
    )
    articles = (
        db.query(Article)
        .filter(
            Article.is_published == True,
            (
                Article.title.ilike(like)
                | Article.excerpt.ilike(like)
                | Article.tags.ilike(like)
            ),
        )
        .order_by(Article.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "query": q.strip(),
        "photos": [PhotoOut.model_validate(p) for p in photos],
        "articles": [ArticleOut.model_validate(a) for a in articles],
    }
