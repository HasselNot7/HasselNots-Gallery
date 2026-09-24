"""站点设置默认值的唯一来源。

本文件不得 import 项目内其他模块（schemas.py 与 routes/settings.py 都依赖它），
前端 frontend/lib/api-server.ts 的 DEFAULT_SETTINGS 与本表逐字一致。
"""

DEFAULTS = {
    "hero_title": "Precision Capture.\nTimeless Frames.",
    "hero_description": "A curated collection of photographic works — each frame capturing the interplay of light, geometry, and fleeting moments across the globe.",
    "site_tagline": "Precision photography portfolio. Every frame tells a story.",
    "site_title": "HasselNot's Gallery",
    "site_name": "Art",
    "hero_side_label": "Collection",
    "hero_side_brand": "HasselNot",
    "footer_title": "HASSELNOT'S GALLERY",
    "footer_copyright": "© {year} HASSELNOT'S GALLERY. All rights reserved.",
    "hero_icon": "photo_camera",
    "hero_icon_url": "",
    "bg_color1": "#141414",
    "bg_color2": "#2b2b2b",
    "bg_color3": "#3a3a3a",
    "bg_color4": "#262626",
    "bg_color5": "#4d4d4d",
    "bg_color6": "#1c1c1c",
    "bg_base": "#141414",
    "water_ink1": "#171717",
    "water_ink2": "#0a0a0a",
    "water_ink_top": "0.15",
    "water_strength": "1.0",
    "hero_gradient_size": "0.85",
    "hero_gradient_count": "12.0",
    "hero_speed": "1.1",
    "hero_color1_weight": "1.0",
    "hero_color2_weight": "1.3",
    # 全站 HUD 装饰总开关（首页 Hero、/gallery、/map），键名保留 hero 前缀以兼容既有 KV 数据
    "show_hero_decorations": "true",
    "show_hero_shader": "true",
    "show_water_ripple": "true",
    # 客户端底图密钥。故意只在这里 + SettingsUpdate 出现，不进 SettingsOut：
    # 公开的 GET /api/settings 靠 response_model 过滤掉它，浏览器改从 /api/map-config 取。
    "carto_api_key": "",
    # 下面两项同样是「只走 /api/map-config」的地图配置，不进 SettingsOut。
    # 值存图层名而不是数组下标：下标会随 TILE_LAYERS 增删静默错位。
    "osm_tile_source": "de",
    "default_map_layer": "Hybrid",
}
