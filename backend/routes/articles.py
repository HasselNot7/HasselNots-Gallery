import datetime
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from schemas import ArticleOut, ArticleCreate, ArticleUpdate
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/articles", tags=["articles"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", text.strip()).strip("-").lower()
    return slug or "untitled"


def _render_markdown(md: str) -> str:
    try:
        import markdown
        return markdown.markdown(
            md,
            extensions=["fenced_code", "tables", "toc", "nl2br"],
            output_format="html5",
        )
    except ImportError:
        import html
        return "<p>" + html.escape(md).replace("\n", "<br/>") + "</p>"


def _to_out(article: Article) -> ArticleOut:
    out = ArticleOut.model_validate(article)
    out.content_html = _render_markdown(article.content_md)
    return out


@router.get("", response_model=list[ArticleOut])
def list_articles(
    published_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Article)
    if published_only and (current_user is None or not current_user.is_admin):
        query = query.filter(Article.is_published == True)
    elif not published_only and (current_user is None or not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Admin access required")
    articles = query.order_by(Article.created_at.desc()).all()
    return [_to_out(a) for a in articles]


@router.get("/{slug}", response_model=ArticleOut)
def get_article(slug: str, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return _to_out(article)


@router.post("", response_model=ArticleOut)
def create_article(
    payload: ArticleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    slug = payload.slug.strip() or _slugify(payload.title)
    existing = db.query(Article).filter(Article.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    article = Article(
        slug=slug,
        title=payload.title,
        content_md=payload.content_md,
        excerpt=payload.excerpt,
        tags=payload.tags,
        cover_photo_id=payload.cover_photo_id,
        is_published=payload.is_published,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return _to_out(article)


@router.patch("/{slug}", response_model=ArticleOut)
def update_article(
    slug: str,
    payload: ArticleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if payload.slug is not None and payload.slug.strip() and payload.slug != article.slug:
        conflict = db.query(Article).filter(Article.slug == payload.slug.strip()).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Slug already exists")
        article.slug = payload.slug.strip()
    if payload.title is not None:
        article.title = payload.title
    if payload.content_md is not None:
        article.content_md = payload.content_md
    if payload.excerpt is not None:
        article.excerpt = payload.excerpt
    if payload.tags is not None:
        article.tags = payload.tags
    if payload.cover_photo_id is not None:
        article.cover_photo_id = payload.cover_photo_id
    if payload.is_published is not None:
        article.is_published = payload.is_published
    article.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(article)
    return _to_out(article)


@router.delete("/{slug}")
def delete_article(
    slug: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    return {"ok": True}


@router.post("/{slug}/view")
def increment_article_view(slug: str, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.views = (article.views or 0) + 1
    db.commit()
    return {"ok": True, "views": article.views}
