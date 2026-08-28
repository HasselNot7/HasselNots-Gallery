import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import envfile
from database import engine, Base
from routes import auth, photos, settings, articles, albums, comments, services, stats, search

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gallery API")

# 浏览器与 API 同源（Next.js rewrites 反代），默认无需 CORS；
# 前后端分离部署时通过 CORS_ORIGINS 显式开启，例如 "https://a.com,https://b.com"
cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(photos.router)
app.include_router(settings.router)
app.include_router(articles.router)
app.include_router(albums.router)
app.include_router(comments.router)
app.include_router(services.router)
app.include_router(stats.router)
app.include_router(search.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
