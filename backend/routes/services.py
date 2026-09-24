"""服务健康检查：探测前端/后端依赖的全部外部服务与内部组件。

供管理后台 Services tab 使用，方便及时发现失效服务（地图瓦片、地理编码、
字体 CDN、R2 存储等）并替换。
"""
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from database import get_db, SessionLocal
from auth import require_admin
from routes.settings import get_setting
import storage

router = APIRouter(prefix="/api/services", tags=["services"])

# 与前端 lib/mapLayers.ts 的 CARTO_SUB 保持一致：检测必须打前端真正会请求的那个主机。
# 早先这里写死 a.，前端写死 abc.，两边探的不是同一批瓦片，才出现
# 「服务检测报 CARTO 正常、用户看着满屏水印」的矛盾。
CARTO_HOST = "b.basemaps.cartocdn.com"
# z6 的陆地瓦片：海洋空瓦片 ifsz=103 只有灰底，水印叠不叠都看不出差别
CARTO_PROBE_TILE = "6/33/21.png"

# OSM 两套主机，与前端 lib/mapLayers.ts 的 OSM_SOURCES 逐字一致。
# 探测对象必须等于站点此刻真正在用的那个主机 —— 这是本文件第二次修这类坑
# （第一次是 CARTO 的 a. vs abc.）：写死 .org 会在站点已切到 .de 时探错东西。
OSM_SOURCES = {
    "de": "tile.openstreetmap.de",
    "official": "tile.openstreetmap.org",
}
OSM_DEFAULT_SOURCE = "de"
# 与 CARTO_PROBE_TILE 同一区域（德国）的陆地瓦片，别用海洋空瓦
OSM_PROBE_TILE = "6/33/21.png"


def _osm_url(source: str) -> str:
    return f"https://{OSM_SOURCES.get(source, OSM_SOURCES[OSM_DEFAULT_SOURCE])}/{OSM_PROBE_TILE}"


def _services_for(osm_source: str) -> list[dict]:
    """把 OSM 那条的 url 换成当前配置指向的主机，其余条目原样。"""
    return [{**s, "url": _osm_url(osm_source)} if s["kind"] == "osm" else s for s in SERVICES]


def _map_settings() -> dict:
    """check 入口读一次 DB：CARTO key 与 OSM 源都从这里取，不在各 _check_* 里重复连库。"""
    db = SessionLocal()
    try:
        return {
            "carto_api_key": get_setting(db, "carto_api_key"),
            "osm_tile_source": get_setting(db, "osm_tile_source") or OSM_DEFAULT_SOURCE,
        }
    finally:
        db.close()

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
        "url": "",  # 由 _services_for() 按当前 osm_tile_source 填，写死会探错对象
        "kind": "osm",
        "signup": False,
        "policy": "官方域名 tile.openstreetmap.org 在中国大陆被 DNS 污染（A/AAAA 被打到 "
                  "Meta 段），大陆访客须用 FOSSGIS 镜像 tile.openstreetmap.de；两者都受 "
                  "OSM tile usage policy 约束，禁止批量下载与高并发，违规封 IP/UA",
    },
    {
        "name": "CARTO Light Tiles",
        "url": f"https://{CARTO_HOST}/light_all/{CARTO_PROBE_TILE}",
        "kind": "carto",
        "style": "light_all",
        "needs_key": True,
        "policy": "非商业免费档 5M 请求/月（商业 1M/月），按账户所有 key 合并计数；"
                  "未配置 key 时瓦片照常 200，但被叠上 API KEY REQUIRED 水印；超量后转水印或限流",
    },
    {
        "name": "CARTO Dark Tiles",
        "url": f"https://{CARTO_HOST}/dark_all/{CARTO_PROBE_TILE}",
        "kind": "carto",
        "style": "dark_all",
        "needs_key": True,
        "policy": "与 Light 共用同一个 key 与同一份额度，配额按账户合并统计",
    },
    {
        "name": "Esri Satellite Tiles",
        "url": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/15/22",
        "kind": "http",
        "signup": False,
        "policy": "免密钥，但受 Esri 配额政策约束且必须保留 Attribution 文案",
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
        "signup": True,
        "policy": "非公开授权接口（未申请 key 的裸瓦片端点），高德随时可能改参数或封 Referer",
    },
    {
        "name": "Gaode Satellite Tiles",
        "url": "https://webst01.is.autonavi.com/appmaptile?style=6&x=26979&y=12416&z=15",
        "kind": "http",
        "signup": True,
        "policy": "同上：无授权凭据，失效无预告",
    },
    {
        "name": "Gaode Label Overlay",
        "url": "https://webst01.is.autonavi.com/appmaptile?style=7&x=26979&y=12416&z=15",
        "kind": "http",
        "signup": True,
        "policy": "同上：无授权凭据，失效无预告",
    },
    {
        "name": "Nominatim Reverse Geocode",
        "url": "https://nominatim.openstreetmap.org/status",
        "kind": "http",
        "signup": False,
        "policy": "公共实例限速 ≤1 req/s 且必须带可识别 User-Agent；超限返回 429 直至封禁",
    },
    {
        "name": "BigDataCloud Geocode",
        "url": "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=39.9&longitude=116.4",
        "kind": "http",
        "signup": False,
        "policy": "reverse-geocode-client 免费档仅限非商业用途，商用需取得授权",
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


def _get_headers(url: str, referer: str) -> dict:
    headers = {"User-Agent": "Mozilla/5.0 GalleryCheck/1.0"}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=8) as resp:
        resp.read(64)
        return {k.lower(): v for k, v in resp.headers.items()}


def _check_carto(style: str, api_key: str, referer: str = ""):
    """CARTO 底图：无 key 也出图，只是被 Fastly IO 叠上 'API KEY REQUIRED' 水印，
    而且无 key / 错 key / 对 key 三种情况 HTTP 全是 200 —— 状态码在这里没有任何信息量。
    唯一可信的判据是「带 key 的响应和无 key 的响应不是同一份字节」：
    etag 变了、且负责合成水印的 fastly-io-info 头消失，才算 key 真的生效。

    referer 必须一起带上：CARTO 的 key 通常绑了域名白名单，不带 Referer 时**有效 key 也会
    被 403 拒掉**。所以这里探的是「key 对当前这个来源好不好使」，两次请求用同一个 referer，
    etag 的差异才只归因于 key。
    """
    start = time.time()
    base = f"https://{CARTO_HOST}/{style}/{CARTO_PROBE_TILE}"
    probe = f"（探测来源 {referer.rstrip('/')}）" if referer else "（未拿到探测来源，绑域名的 key 必被拒）"
    origin_txt = referer.rstrip("/") if referer else "空 —— 浏览器没带 Referer，绑域名的 key 必被拒"
    try:
        anon = _get_headers(base, referer)
    except urllib.error.HTTPError as e:
        # 基线请求本身被拒。不能并进下面的「不可达」：那会把「CARTO 活着但拒了我们」
        # 误报成网络故障 —— 正是这一串坑里最贵的那个。
        return False, int((time.time() - start) * 1000), f"CARTO 拒绝无 key 基线请求 HTTP {e.code}{probe}"
    except Exception as e:
        return False, int((time.time() - start) * 1000), f"CARTO 不可达：{str(e)[:100]}"
    if not api_key:
        return False, int((time.time() - start) * 1000), "未配置 key：瓦片带 API KEY REQUIRED 水印"
    try:
        keyed = _get_headers(f"{base}?key={api_key}", referer)
    except urllib.error.HTTPError as e:
        # 详情里绝不回显 URL —— key 就拼在上面那个串里
        if e.code == 403:
            return False, int((time.time() - start) * 1000), (
                f"被 CARTO 拒绝 HTTP 403：该 key 的 Referer 白名单不含当前探测来源 "
                f"{origin_txt}。key 本身可能仍然有效，去后台把它要用的域名加进白名单"
            )
        return False, int((time.time() - start) * 1000), f"带 key 请求返回 HTTP {e.code}{probe}"
    except Exception as e:
        return False, int((time.time() - start) * 1000), f"带 key 请求失败：{type(e).__name__}{probe}"
    etag_changed = keyed.get("etag") != anon.get("etag")
    io_gone = "fastly-io-info" not in keyed
    ms = int((time.time() - start) * 1000)
    if etag_changed and io_gone:
        return True, ms, f"key 生效：etag 变化且 fastly-io-info 已消失{probe}"
    if etag_changed:
        return True, ms, f"key 生效：etag 与无 key 时不同{probe}"
    return False, ms, f"key 无效：etag 与无 key 完全一致，仍在返回水印瓦片{probe}"


def _check_osm(url: str):
    """OSM 瓦片不能只看状态码：官方域名在大陆是解析层面挂掉，镜像偶尔回极小的空白瓦。
    判据是「响应头说这是图片、且字节数过门槛」—— 同一块陆地瓦实测 5.6 万字节，
    灰底空瓦只有百来字节，两者差三个数量级，不会误判。
    """
    start = time.time()
    try:
        headers = _get_headers(url, "")
    except Exception as e:
        return False, int((time.time() - start) * 1000), f"{str(e)[:110]}"
    ctype = headers.get("content-type", "")
    try:
        size = int(headers.get("content-length") or 0)
    except ValueError:
        size = 0
    ms = int((time.time() - start) * 1000)
    host = url.split("/")[2]
    if "image/" not in ctype:
        return False, ms, f"{host} 返回的不是图片（content-type={ctype or '缺失'}）"
    if size < 2000:
        return False, ms, f"{host} 疑似空白瓦（{ctype} 仅 {size}B）"
    return True, ms, f"{host} 真瓦片 {ctype} {size}B"


def _check_one(service: dict, carto_key: str = "", referer: str = ""):
    kind = service["kind"]
    if kind == "db":
        ok, ms, detail = _check_db()
    elif kind == "r2":
        ok, ms, detail = _check_r2()
    elif kind == "r2_public":
        ok, ms, detail = _check_r2_public()
    elif kind == "carto":
        ok, ms, detail = _check_carto(service["style"], carto_key, referer)
    elif kind == "osm":
        ok, ms, detail = _check_osm(service["url"])
    else:
        ok, ms, detail = _check_http(service["url"])
    return {**service, "ok": ok, "latency_ms": ms, "detail": detail}


@router.get("/check")
def check_services(request: Request, current_user=Depends(require_admin)):
    cfg = _map_settings()
    referer = request.headers.get("referer", "")
    results = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        for r in pool.map(
            lambda s: _check_one(s, cfg["carto_api_key"], referer),
            _services_for(cfg["osm_tile_source"]),
        ):
            results.append(r)
    ok_count = sum(1 for r in results if r["ok"])
    return {
        "services": results,
        "ok_count": ok_count,
        "total": len(results),
        "checked_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


@router.get("/check/{name}")
def check_one_service(name: str, request: Request, current_user=Depends(require_admin)):
    from urllib.parse import unquote
    target = unquote(name)
    cfg = _map_settings()
    service = next(
        (s for s in _services_for(cfg["osm_tile_source"]) if s["name"] == target), None
    )
    if not service:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Unknown service: {target}")
    result = _check_one(service, cfg["carto_api_key"], request.headers.get("referer", ""))
    return {**result, "checked_at": time.strftime("%Y-%m-%d %H:%M:%S")}
