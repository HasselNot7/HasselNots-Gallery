import datetime
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from database import get_db
from models import Comment, Photo, Article, VisitLog
from schemas import CommentOut, CommentCreate
from auth import require_admin
import ratelimit

router = APIRouter(prefix="/api", tags=["comments"])

# 评论限速：每 IP 每小时 20 条
_COMMENT_MAX = 20
_COMMENT_WINDOW = 3600
# PV 打点限速：每 IP 每分钟 300 次（拦截脚本灌库，不影响正常浏览）
_VISIT_MAX = 300
_VISIT_WINDOW = 60


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.get("/comments", response_model=list[CommentOut])
def list_comments(
    photo_id: int | None = Query(None),
    article_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Comment)
    if photo_id is not None:
        query = query.filter(Comment.photo_id == photo_id)
    if article_id is not None:
        query = query.filter(Comment.article_id == article_id)
    return query.order_by(Comment.created_at.asc()).all()


@router.post("/comments", response_model=CommentOut)
def create_comment(payload: CommentCreate, request: Request, db: Session = Depends(get_db)):
    ip = _client_ip(request)
    key = f"comment:{ip}"
    lockout = ratelimit.blocked(key, _COMMENT_MAX, _COMMENT_WINDOW)
    if lockout > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Too many comments. Try again in {lockout} seconds.",
            headers={"Retry-After": str(lockout)},
        )
    if not payload.author.strip() or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Author and content required")
    if len(payload.content) > 2000:
        raise HTTPException(status_code=400, detail="Comment too long")
    if payload.photo_id is None and payload.article_id is None:
        raise HTTPException(status_code=400, detail="Missing target")
    if payload.photo_id is not None:
        if not db.query(Photo).filter(Photo.id == payload.photo_id).first():
            raise HTTPException(status_code=404, detail="Photo not found")
    if payload.article_id is not None:
        if not db.query(Article).filter(Article.id == payload.article_id).first():
            raise HTTPException(status_code=404, detail="Article not found")
    comment = Comment(
        photo_id=payload.photo_id,
        article_id=payload.article_id,
        author=payload.author.strip()[:50],
        content=payload.content.strip(),
    )
    ratelimit.record(key, _COMMENT_WINDOW)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return {"ok": True}


@router.post("/visit")
def record_visit(request: Request, db: Session = Depends(get_db)):
    """记录一次页面访问（PV），用 IP 哈希 + 日期做 UV 去重。"""
    key = f"visit:{_client_ip(request)}"
    lockout = ratelimit.blocked(key, _VISIT_MAX, _VISIT_WINDOW)
    if lockout > 0:
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={"Retry-After": str(lockout)},
        )
    ratelimit.record(key, _VISIT_WINDOW)
    path = (request.query_params.get("path") or "/")[:300]
    ip = request.client.host if request.client else ""
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    db.add(VisitLog(path=path, ip_hash=ip_hash))
    db.commit()
    return {"ok": True}


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    today = datetime.date.today()
    start_today = datetime.datetime.combine(today, datetime.time.min)
    start_week = start_today - datetime.timedelta(days=6)

    total_pv = db.query(VisitLog).count()
    today_pv = db.query(VisitLog).filter(VisitLog.created_at >= start_today).count()
    week_pv = db.query(VisitLog).filter(VisitLog.created_at >= start_week).count()
    total_uv = db.query(VisitLog.ip_hash).distinct().count()
    today_uv = (
        db.query(VisitLog.ip_hash)
        .filter(VisitLog.created_at >= start_today)
        .distinct()
        .count()
    )

    top_pages = (
        db.query(VisitLog.path, VisitLog.created_at)
        .filter(VisitLog.created_at >= start_week)
        .all()
    )
    page_counts: dict[str, int] = {}
    for path, _ in top_pages:
        page_counts[path] = page_counts.get(path, 0) + 1
    top_pages_out = sorted(page_counts.items(), key=lambda x: -x[1])[:10]

    top_photos = (
        db.query(Photo)
        .order_by(Photo.views.desc())
        .filter(Photo.views > 0)
        .limit(10)
        .all()
    )
    top_articles = (
        db.query(Article)
        .order_by(Article.views.desc())
        .filter(Article.views > 0)
        .limit(5)
        .all()
    )

    # 最近 7 天 PV 曲线
    days = []
    for i in range(7):
        day_start = start_today - datetime.timedelta(days=6 - i)
        day_end = day_start + datetime.timedelta(days=1)
        count = (
            db.query(VisitLog)
            .filter(VisitLog.created_at >= day_start, VisitLog.created_at < day_end)
            .count()
        )
        days.append({"date": day_start.date().isoformat(), "pv": count})

    return {
        "total_pv": total_pv,
        "today_pv": today_pv,
        "week_pv": week_pv,
        "total_uv": total_uv,
        "today_uv": today_uv,
        "top_pages": [{"path": p, "count": c} for p, c in top_pages_out],
        "top_photos": [
            {"id": p.id, "title": p.title, "views": p.views, "location": p.location_name}
            for p in top_photos
        ],
        "top_articles": [
            {"slug": a.slug, "title": a.title, "views": a.views} for a in top_articles
        ],
        "daily": days,
    }
