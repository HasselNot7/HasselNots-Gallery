"""凭据与外部服务密钥的唯一声明表。

本文件不得 import 项目内其他模块（routes/secrets.py 与 routes/services.py 都要读它，
任何依赖都会把 auth / storage 卷进声明层）。本表只描述"怎么判断有没有配、配在哪、
改它会有什么后果"，绝不包含任何凭据的值。

文件名刻意不叫 secrets.py：backend/ 是 uvicorn 的 sys.path[0]，顶层模块会遮蔽标准库
secrets，websockets（uvicorn 的 WebSocket 实现）里的 secrets.token_bytes 会直接
AttributeError。

字段语义：
  visibility "server" —— 值只存在于服务端进程/构建产物，面板只读盘点
  visibility "client" —— 值会被下发到浏览器，F12 可见；这不是泄露而是设计前提，
                         安全性依赖 provider 侧的域名白名单 + 配额 + 一键吊销，
                         因此面板允许直接编辑
  storage    "env"    —— 来自环境变量或 backend/.env，import 期即固化，改完必须重启
  storage    "db"     —— 来自 Setting KV 表，可在线改、即时生效
  secret              —— 值一旦外流会造成服务端损失（区别于"会不会被浏览器看到"）
"""

CREDENTIALS = [
    {
        "env_key": "JWT_SECRET_KEY",
        "label": "JWT 签名密钥",
        "secret": True,
        "required": True,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/auth.py:14"],
        "effect_if_missing": "后端拒绝启动（RuntimeError），整站 API 全不可用",
        "effect_if_rotated": "所有已签发 token 立即失效，全部在线用户被登出",
        "restart_required": True,
        "change_howto": "改 backend/.env 或 systemd 环境变量后 systemctl restart gallery-backend",
        "provider_console": "无需申请，自行生成：python -c 'import secrets; print(secrets.token_hex(32))'",
    },
    {
        "env_key": "ADMIN_PASSWORD",
        "label": "初始管理员密码",
        "secret": True,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/init_db.py:13"],
        "effect_if_missing": "init_db.py 改为交互式 getpass 提示；不影响已建库",
        "effect_if_rotated": "只影响下一次 init_db 建号，已有管理员密码不变",
        "restart_required": False,
        "change_howto": "在 backend/ 下执行 python init_db.py，或在后台「管理员」面板改密",
        "provider_console": "无（本地生成）",
    },
    {
        "env_key": "R2_ACCESS_KEY_ID",
        "label": "R2 Access Key ID",
        "secret": True,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/storage.py:21", "scripts/backup.py:54"],
        "effect_if_missing": "R2 不启用，照片写入本地 backend/uploads/ 并走本地静态服务",
        "effect_if_rotated": "旧 key 需在 Cloudflare 侧删除；签名 URL 全部重生成，已上传对象不受影响",
        "restart_required": True,
        "change_howto": "改 backend/.env 后 systemctl restart gallery-backend",
        "provider_console": "https://dash.cloudflare.com → R2 → Manage R2 API Tokens（创建/吊销）",
    },
    {
        "env_key": "R2_SECRET_ACCESS_KEY",
        "label": "R2 Secret Access Key",
        "secret": True,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/storage.py:22", "scripts/backup.py:55"],
        "effect_if_missing": "同上：R2 不启用，照片退回本地 backend/uploads/",
        "effect_if_rotated": "与 Access Key ID 成对轮换；只换其一会导致 head_bucket 直接 403",
        "restart_required": True,
        "change_howto": "改 backend/.env 后 systemctl restart gallery-backend",
        "provider_console": "https://dash.cloudflare.com → R2 → Manage R2 API Tokens（创建/吊销）",
    },
    {
        "env_key": "R2_ACCOUNT_ID",
        "label": "Cloudflare 账户 ID",
        "secret": False,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/storage.py:20", "scripts/backup.py:53"],
        "effect_if_missing": "R2 endpoint 无法拼出，等同未配置 R2",
        "effect_if_rotated": "换账户即换桶，旧对象不会自动迁移",
        "restart_required": True,
        "change_howto": "改 backend/.env 后 systemctl restart gallery-backend",
        "provider_console": "https://dash.cloudflare.com → R2 → API 详情页可见账户 ID",
    },
    {
        "env_key": "R2_BUCKET",
        "label": "R2 图片桶名",
        "secret": False,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/storage.py:23"],
        "effect_if_missing": "取默认值 gallery；桶不存在时上传失败并回退本地",
        "effect_if_rotated": "DB 里已记录的 r2:// 路径仍指向旧桶，需自行迁移对象",
        "restart_required": True,
        "change_howto": "改 backend/.env 后 systemctl restart gallery-backend",
        "provider_console": "https://dash.cloudflare.com → R2 → 桶列表",
    },
    {
        "env_key": "R2_BACKUP_BUCKET",
        "label": "R2 备份桶名",
        "secret": False,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["scripts/backup.py:56"],
        "effect_if_missing": "取默认值 gallery-backup",
        "effect_if_rotated": "只影响之后的备份落点，历史包不动",
        "restart_required": False,
        "change_howto": "改 backend/.env 即可（备份脚本每次运行重新读取），无需重启服务",
        "provider_console": "https://dash.cloudflare.com → R2 → 桶列表",
    },
    {
        "env_key": "R2_PUBLIC_URL",
        "label": "R2 公开访问域名",
        "secret": False,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/storage.py:24"],
        "effect_if_missing": "改用签名 URL（有效期 1 小时），图片仍可访问但 URL 不稳定",
        "effect_if_rotated": "换域名后旧 r2.dev 子域若被关闭，历史图片链接会 404",
        "restart_required": True,
        "change_howto": "改 backend/.env 后 systemctl restart gallery-backend",
        "provider_console": "https://dash.cloudflare.com → R2 → 桶 → Settings → Public development",
    },
    {
        "env_key": "CORS_ORIGINS",
        "label": "CORS 允许来源",
        "secret": False,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["backend/main.py:15"],
        "effect_if_missing": "不挂 CORS 中间件。前后端同源（Next.js 重写 /api）时这是正确状态",
        "effect_if_rotated": "收窄来源会让既有跨源前端立刻全部请求失败",
        "restart_required": True,
        "change_howto": "改 backend/.env 后 systemctl restart gallery-backend",
        "provider_console": "无（自行配置，逗号分隔的 origin 列表）",
    },
    {
        "env_key": "NEXT_PUBLIC_SITE_URL",
        "label": "站点公网地址（前端构建期）",
        "secret": False,
        "required": False,
        "visibility": "server",
        "storage": "env",
        "used_by": ["frontend/lib/site.ts:1"],
        "effect_if_missing": "取默认 http://localhost:3000，OG/分享链接会指向本地",
        "effect_if_rotated": "只影响构建期烘进去的绝对 URL，需重新 npm run build 才生效",
        "restart_required": True,
        "change_howto": (
            "改 frontend/.env.local 后 cd frontend && npm run build && systemctl restart gallery-frontend。"
            "注意 NEXT_PUBLIC_ 前缀的值会出现在公开产物里，不要往里放任何机密"
        ),
        "provider_console": "无（本地文件 frontend/.env.local）",
    },
    {
        "env_key": "carto_api_key",
        "label": "CARTO 底图 API Key",
        "secret": False,
        "required": False,
        "visibility": "client",
        "storage": "db",
        "used_by": ["frontend/lib/mapLayers.ts:48", "frontend/lib/mapLayers.ts:88"],
        "effect_if_missing": (
            "Light/Dark 两套底图照常出图，但每张瓦片被 Fastly 叠上斜向 'API KEY REQUIRED' 水印"
        ),
        "effect_if_rotated": (
            "旧 key 立即失效；浏览器最长 60 秒后拿到新值（/api/map-config 的 max-age=60），"
            "瓦片 URL 变了所以 CDN 缓存自然穿透"
        ),
        "restart_required": False,
        "change_howto": "在本面板「底图密钥」框填写并保存，即时生效，无需重启后端",
        "provider_console": (
            "申请 https://carto.com/basemaps/apikey/ ；"
            "管理与吊销 https://dashboard.basemaps.carto.com （可设限、可删除）"
        ),
    },
    {
        "env_key": "osm_tile_source",
        "label": "OSM 瓦片源",
        "secret": False,
        "required": False,
        "visibility": "client",
        "storage": "db",
        "used_by": ["frontend/lib/mapLayers.ts:51", "backend/routes/services.py:52"],
        "effect_if_missing": '取默认 "de"，即 FOSSGIS 的德国镜像 tile.openstreetmap.de',
        "effect_if_rotated": (
            "Streets 图层的瓦片主机整个换掉，URL 变了所以 CDN 缓存自然穿透；"
            "选回 \"official\" 时中国大陆访客会因 DNS 污染直接看不到 Streets 图层"
        ),
        "restart_required": False,
        "change_howto": "在后台「地图 → OSM 瓦片源」里选，即时生效，无需重启后端",
        "provider_console": (
            "无需注册。用量政策 operations.osmfoundation.org/policies/tiles/ ；"
            "镜像由 FOSSGIS 运营，主机 tile.openstreetmap.de"
        ),
    },
    {
        "env_key": "default_map_layer",
        "label": "站点默认底图",
        "secret": False,
        "required": False,
        "visibility": "client",
        "storage": "db",
        "used_by": ["frontend/components/MapClient.tsx:219", "frontend/components/LocationPicker.tsx:83"],
        "effect_if_missing": '取默认 "Hybrid"；存了不存在的图层名也回退 Hybrid',
        "effect_if_rotated": (
            "只影响没动过图层选择器的访客；浏览器里存过 mapSkinName 的人仍按自己的选择，"
            "这是设计不是 bug"
        ),
        "restart_required": False,
        "change_howto": "在后台「地图 → 默认底图」里选，即时生效（浏览器最长 60 秒拿到新值）",
        "provider_console": "无（本地配置，值存图层名而非数组下标）",
    },
]
