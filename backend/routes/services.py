"""服务健康检查：探测前端/后端依赖的全部外部服务与内部组件。

供管理后台 Services tab 使用，方便及时发现失效服务（地图瓦片、地理编码、
字体 CDN、R2 存储等）并替换。
"""
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends
from sqlalchemy import text
from database import get_db, SessionLocal
from auth import require_admin
import storage

router = APIRouter(prefix="/api/services", tags=["services"])

SERVICES = [
    {
        "name": "SQLite Database",
        "url": "本地 database.gallery.db",
        "kind": "db",
    },
    {
        "name": "Cloudflare R2 (S3 API)",
        "url": f"https://{storage.ACCOUNT_ID}.r2.cloudflarestorage.com/{storage.BUCKET}",
        "kind": "r2",
    },
    {
        "name": "R2 Public (r2.dev)",
        "url": storage.PUBLIC_URL or "未配置（使用签名 URL）",
        "kind": "r2_public",
    },
    {
        "name": "Bing Map Tiles",
        "url": "https://dynamic.t0.tiles.ditu.live.com/comp/ch/132100121100011?it=G,VE,BX,L,LA&mkt=zh-cn,syr&n=z&ur=CN",
        "kind": "http",
    },
    {
        "name": "Bing Satellite Tiles",
        "url": "https://ecn.t0.tiles.virtualearth.net/tiles/a132100121100011.jpeg?g=1",
        "kind": "http",
    },
    {
        "name": "OSM Tiles",
        "url": "https://tile.openstreetmap.org/5/15/22.png",
        "kind": "http",
    },
    {
        "name": "CARTO Light Tiles",
        "url": "https://a.basemaps.cartocdn.com/light_all/5/15/22.png",
        "kind": "http",
    },
    {
        "name": "CARTO Dark Tiles",
        "url": "https://a.basemaps.cartocdn.com/dark_all/5/15/22.png",
        "kind": "http",
    },
    {
        "name": "Esri Satellite Tiles",
        "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/15/22",
        "kind": "http",
    },
    {
        "name": "Esri Roads Overlay",
        "url": "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/5/15/22",
        "kind": "http",
    },
    {
        "name": "Esri Labels Overlay",
        "url": "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/5/15/22",
        "kind": "http",
    },
    {
        "name": "Gaode Street Tiles",
        "url": "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=26979&y=12416&z=15",
        "kind": "http",
    },
    {
        "name": "Gaode Satellite Tiles",
        "url": "https://webst01.is.autonavi.com/appmaptile?style=6&x=26979&y=12416&z=15",
        "kind": "http",
    },
    {
        "name": "Gaode Label Overlay",
        "url": "https://webst01.is.autonavi.com/appmaptile?style=7&x=26979&y=12416&z=15",
        "kind": "http",
    },
    {
        "name": "Nominatim Reverse Geocode",
        "url": "https://nominatim.openstreetmap.org/status",
        "kind": "http",
    },
    {
        "name": "BigDataCloud Geocode",
        "url": "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=39.9&longitude=116.4",
        "kind": "http",
    },
    {
        "name": "Open-Meteo Geocoding",
        "url": "https://geocoding-api.open-meteo.com/v1/search?name=Beijing&count=1",
        "kind": "http",
    },
    {
        "name": "Photon Geocoding",
        "url": "https://photon.komoot.io/api/?q=Beijing&limit=1",
        "kind": "http",
    },
    {
        "name": "Google Fonts CDN",
        "url": "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap",
        "kind": "http",
    },
    {
        "name": "Material Symbols CDN",
        "url": "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1",
        "kind": "http",
    },
]


def _check_db():
    start = time.time()
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True, int((time.time() - start) * 1000), "SELECT 1 OK"
    except Exception as e:
        return False, int((time.time() - start) * 1000), str(e)[:120]


def _check_r2():
    start = time.time()
    try:
        client = storage.get_client()
        if not client:
            return False, int((time.time() - start) * 1000), "R2 未配置（回退本地存储）"
        client.head_bucket(Bucket=storage.BUCKET)
        return True, int((time.time() - start) * 1000), f"bucket '{storage.BUCKET}' OK"
    except Exception as e:
        return False, int((time.time() - start) * 1000), str(e)[:120]


def _check_r2_public():
    start = time.time()
    try:
        if not storage.PUBLIC_URL:
            return True, 0, "未配置公开 URL，图片走签名 URL（正常）"
        # 取一张远程照片的真实对象做 HEAD 探测
        db = SessionLocal()
        photo = db.execute(
            text("SELECT file_path FROM photos WHERE file_path LIKE 'r2://%' LIMIT 1")
        ).fetchone()
        db.close()
        if not photo:
            return True, int((time.time() - start) * 1000), "无远程对象可探测（OK）"
        key = photo[0][len(storage.R2_PREFIX):]
        req = urllib.request.Request(
            f"{storage.PUBLIC_URL}/{key}",
            method="HEAD",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status < 400, int((time.time() - start) * 1000), f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        return False, int((time.time() - start) * 1000), f"HTTP {e.code}"
    except Exception as e:
        return False, int((time.time() - start) * 1000), str(e)[:120]


def _check_http(url: str):
    start = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 GalleryCheck/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = resp.read(1024)
            return resp.status < 400, int((time.time() - start) * 1000), f"HTTP {resp.status} ({len(data)}B)"
    except urllib.error.HTTPError as e:
        return False, int((time.time() - start) * 1000), f"HTTP {e.code}"
    except Exception as e:
        return False, int((time.time() - start) * 1000), str(e)[:120]


def _check_one(service: dict):
    kind = service["kind"]
    if kind == "db":
        ok, ms, detail = _check_db()
    elif kind == "r2":
        ok, ms, detail = _check_r2()
    elif kind == "r2_public":
        ok, ms, detail = _check_r2_public()
    else:
        ok, ms, detail = _check_http(service["url"])
    return {**service, "ok": ok, "latency_ms": ms, "detail": detail}


@router.get("/check")
def check_services(current_user=Depends(require_admin)):
    results = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        for r in pool.map(_check_one, SERVICES):
            results.append(r)
    ok_count = sum(1 for r in results if r["ok"])
    return {
        "services": results,
        "ok_count": ok_count,
        "total": len(results),
        "checked_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


@router.get("/check/{name}")
def check_one_service(name: str, current_user=Depends(require_admin)):
    from urllib.parse import unquote
    target = unquote(name)
    service = next((s for s in SERVICES if s["name"] == target), None)
    if not service:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Unknown service: {target}")
    result = _check_one(service)
    return {**result, "checked_at": time.strftime("%Y-%m-%d %H:%M:%S")}
