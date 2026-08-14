from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routes import auth, photos, settings, articles

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gallery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(photos.router)
app.include_router(settings.router)
app.include_router(articles.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
