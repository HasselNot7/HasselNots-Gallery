"""浏览器运行时需要的地图配置：底图密钥、OSM 瓦片源、站点默认底图。

这个端点**故意公开、不加认证**：里面每一项都必然要被浏览器读到才能画图 —— key 拼在
访客直连 CARTO 的瓦片 URL 上（F12 一定看得到），另两项决定前端挑哪个图层。
所以它的安全模型不是"藏住值"，而是 provider 侧的三件事 ——
域名限制、月度配额、随时吊销（见 credentials.py 里 carto_api_key 的 provider_console）。
往这里加任何服务端机密之前请先停手：本文件没有 require_admin 是设计，不是遗漏。
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from routes.settings import get_setting

router = APIRouter(prefix="/api/map-config", tags=["map-config"])


@router.get("")
def get_map_config(db: Session = Depends(get_db)):
    # max-age=60 是吊销/轮换后的扩散上限：CDN 与浏览器最多缓存一分钟
    return JSONResponse(
        {
            "carto_api_key": get_setting(db, "carto_api_key"),
            "osm_tile_source": get_setting(db, "osm_tile_source"),
            "default_map_layer": get_setting(db, "default_map_layer"),
        },
        headers={"Cache-Control": "public, max-age=60"},
    )
