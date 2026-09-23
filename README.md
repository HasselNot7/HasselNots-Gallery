# HasselNot's Gallery — Photography Portfolio

个人摄影作品集与博客 / Personal photography portfolio & blog

基于 Next.js 16 + FastAPI 的个人摄影作品网站与博客。黑白配色，内容页带水墨波纹背景（可关，且首页/后台/照片详情/足迹/登录页不渲染），支持照片画廊、相册、足迹地图、博客、评论、访问分析、服务检测与 Cloudflare R2 存储。

Built with Next.js 16 + FastAPI. A monochrome theme; content pages sit on an optional ink-wash ripple background (deliberately not rendered on the home, admin, photo detail, map and login pages). Features a photo gallery, albums, footprints map, blog, comments, visit analytics, service health checks and Cloudflare R2 storage.

> 站点名、Hero 侧栏标签与品牌字、页脚标题/版权行、浏览器标签标题等**品牌文字可在后台改**
> （`/admin → 站点设置 → 品牌与文案`）。本文出现的 `HasselNot's Gallery` / `Art` 是默认值，
> 唯一来源为 `backend/defaults.py`。
> Brand wording (site name, hero side label, footer title/copyright, document title) is
> editable in the admin; the names below are just the defaults, defined once in `backend/defaults.py`.

---

## 截图 / Screenshots

| | |
|---|---|
| ![首页 Home](docs/screenshots/home.png) | ![画廊 Gallery](docs/screenshots/gallery.png) |
| ![足迹地图 Footprints Map](docs/screenshots/map.png) | ![相册 Albums](docs/screenshots/albums.png) |
| ![博客 Blog](docs/screenshots/blog.png) | ![管理后台 Admin](docs/screenshots/admin.png) |

---

## 功能 / Features

**中文**

- **首页**：动态光斑 WebGL 背景（管理员可调 11 种配色预设）+ 品牌 Hero + 非对称精选照片网格
- **内容页背景**：水墨波纹 WebGL 背景，覆盖图库/相册/博客/器材/搜索；首页、后台、照片详情、足迹、登录页不渲染，可在后台关闭
- **画廊**：瀑布流 + 全量年份时间线跳转 + 灯箱大图浏览（键盘导航）+ 无限滚动懒加载
- **相册**：按主题/旅行地分组，独立专辑页
- **足迹地图**：Leaflet 地图，标记按年份配色并按当前缩放做邻近聚合；年份筛选、地点列表与标记双向选中、灯箱、地名搜索、8 种底图切换（anitabi 风格缩略图选择器）
- **照片详情**：EXIF 面板、浏览量、评论、位置编辑（管理员可在地图上拖拽设置/复原拍摄地点）
- **博客**：Markdown 写作（后台管理），列表 + 详情页，标签、浏览量、评论
- **全站搜索与器材页**：`/search` 跨照片与文章检索；`/equipment` 统计相机/镜头/焦距/光圈/ISO/快门分布
- **管理后台**：应用外壳式可折叠侧栏 + 8 个 tab —— 站点设置（含品牌文案与三个显示开关）、批量上传（浏览器端压缩 + EXIF/GPS 保留）、照片/相册/文章管理、访问分析（PV/UV、7 天趋势、热门榜）、服务健康检测（20 项）、管理员管理
- **SEO**：sitemap.xml、robots.txt、OG 标签
- **存储**：Cloudflare R2（S3 兼容），未配置时回退本地；重复图片检测（SHA256）
- **备份**：每日自动备份数据库与配置到 R2 私有桶（见 `scripts/README.md`）

**English**

- **Home**: Animated WebGL gradient background (11 color presets configurable in admin) + brand hero + asymmetric featured-photo grid
- **Content-page background**: WebGL ink-wash ripple on gallery / albums / blog / equipment / search — intentionally not rendered on the home, admin, photo detail, map and login pages, and switchable in admin
- **Gallery**: Masonry layout, full-year timeline jump, lightbox with keyboard navigation, infinite scroll with lazy loading
- **Albums**: Grouped by theme / trip, with standalone album pages
- **Footprints Map**: Leaflet map with year-colored markers that cluster by pixel-grid proximity at the current zoom; year filter, two-way selection between the place list and the markers, lightbox, place search, 8 basemap styles (anitabi-style thumbnail picker)
- **Photo Detail**: EXIF panel, view count, comments, location editing (admin can drag markers on the map)
- **Blog**: Markdown authoring in admin, list + detail pages, tags, views, comments
- **Search & Equipment**: `/search` queries photos and articles; `/equipment` breaks shots down by camera, lens, focal length, aperture, ISO and shutter speed
- **Admin**: App-shell sidebar (collapsible) with 8 tabs — site settings (brand wording + 3 display switches), batch upload (in-browser compression, EXIF/GPS preserved), photo/album/article management, visit analytics (PV/UV, 7-day trend, top content), service health checks (20 items), user management
- **SEO**: sitemap.xml, robots.txt, OG tags
- **Storage**: Cloudflare R2 (S3-compatible) with local fallback; duplicate detection (SHA256)
- **Backup**: Daily automated database & config backup to a private R2 bucket (see `scripts/README.md`)

---

## 技术栈 / Tech Stack

| 层 Layer | 技术 Tech |
|---|---|
| 前端 Frontend | Next.js 16（App Router + Turbopack）、React 19、HeroUI v3（React Aria + Tailwind v4）、motion、Leaflet、Three.js |
| 后端 Backend | FastAPI（Python 3.13）、SQLAlchemy、SQLite |
| 图片 Images | Pillow（EXIF/缩略图）、piexif（后端注入）、piexifjs（浏览器端压缩后回写 EXIF/GPS）、python-markdown |
| 存储 Storage | Cloudflare R2（boto3） |
| 字体 Fonts | Sigma Serif（本地）/ JetBrains Mono / Noto Serif SC（思源宋体）；Hanken Grotesk 与 Inter 仅两处局部使用 |

---

## 快速开始 / Quick Start

```bash
# 后端 Backend (Python 3.13)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # 填入 R2 配置（可选） / Fill in R2 config (optional)
ADMIN_PASSWORD=你的密码 .venv/bin/python init_db.py   # 创建管理员 / Create admin
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001

# 前端 Frontend (Node 20+)
cd frontend
npm install
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" > .env.local
npm run dev
```

访问 `http://localhost:3000`，后台入口 `/admin`。

Visit `http://localhost:3000`, admin at `/admin`.

### 启动脚本 / Startup Scripts

仓库根目录提供现成脚本 / Ready-made scripts in the repo root:

| 脚本 Script | 用途 Purpose |
|---|---|
| `start-backend.sh` | 后端开发模式（建表 + uvicorn :8001）/ Backend dev (init DB + uvicorn :8001) |
| `start-frontend-dev.sh` | 前端开发模式（`npm run dev`）/ Frontend dev (`npm run dev`) |
| `start-frontend-prod.sh` | 前端生产模式（`npm run start`，需先 build；`--build` 参数可先构建再启动）/ Frontend production (`npm run start`, pass `--build` to build first) |

---

## 对象存储 / Object Storage (Cloudflare R2)

照片存储于 R2（原图 + 缩略图），服务器不保存照片文件。配置见 `backend/.env.example`：

Photos are stored in R2 (original + thumbnail); no photo files on the server. See `backend/.env.example`:

```bash
R2_ACCOUNT_ID=Cloudflare账户ID（32位十六进制）/ Cloudflare account ID (32 hex chars)
R2_ACCESS_KEY_ID=R2 API Token Access Key
R2_SECRET_ACCESS_KEY=R2 API Token Secret
R2_BUCKET=gallery
R2_PUBLIC_URL=https://cdn.example.com   # 推荐自定义域名（走 CDN 边缘缓存）/ prefer a custom domain
                                        # 未配置域名前可用 https://pub-xxxx.r2.dev 开发 / r2.dev works for dev
```

存量照片迁移 / Migrate existing photos: `cd backend && .venv/bin/python backfill_r2.py --delete-local`

> 未配置 R2 时自动回退本地 `backend/uploads/` 存储。
> Falls back to local `backend/uploads/` when R2 is not configured.

---

## 目录结构 / Directory Structure

```
backend/                # FastAPI 后端 / Backend
├── main.py             # 入口 / Entry
├── defaults.py         # 站点设置默认值的唯一来源 / single source of setting defaults
├── routes/             # 9 个模块 / 9 modules: auth, photos, articles, albums, comments,
│                       #   search, services, settings, stats
├── storage.py          # R2 存储层 / Storage layer
├── init_db.py          # 建表 + 创建管理员（密码取 ADMIN_PASSWORD 或交互输入）
│                       # Init DB + create admin (password from env or interactive prompt)
└── *.py                # 工具脚本 / Utility scripts
frontend/               # Next.js 前端 / Frontend
├── app/                # 页面 / Pages (home, gallery, albums, album/[slug], blog,
│                       #   equipment, search, map, photo/[id], login, admin)
├── components/         # 组件 / Components (gallery, map + 聚合, lightbox, comments,
│                       #   backgrounds, reactbits/ 动效片段...)
└── lib/                # API 客户端、地图图层与聚合、站点设置与品牌文案 Context
scripts/README.md       # 备份脚本说明 / Backup script docs
docs/DEPLOY.md          # 部署指南 / Deployment guide (systemd + nginx + HTTPS)
PROJECT.md              # 项目文档 / Project docs
```

---

## 部署 / Deployment

完整部署步骤（systemd + nginx + HTTPS）见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。要点 / Highlights：

- 代码 + `backend/gallery.db` + `backend/.env`（密钥）三件套迁移 / migrate code + db + secrets
- 环境变量：`NEXT_PUBLIC_SITE_URL`（站点域名）、`JWT_SECRET_KEY`（**必填**，缺失后端将拒绝启动；轮换密钥会使所有登录失效 / **required** — backend refuses to start without it; rotating it logs everyone out）
- 照片本体在 R2，迁移服务器无需搬运图片 / photos live in R2, no need to move images

### 服务器日常操作 / Server Operations

生产服务器（systemd 管理两个服务）/ Production server (both services managed by systemd):

```bash
# 后端重启 / Restart backend
systemctl restart gallery-backend
systemctl status gallery-backend          # 状态与最近日志 / status & recent logs
journalctl -u gallery-backend -n 50       # 查看后端日志 / view backend logs

# 前端重启 / Restart frontend
systemctl restart gallery-frontend
journalctl -u gallery-frontend -n 50      # 查看前端日志 / view frontend logs
```

部署新代码 / Deploying new code:

```bash
cd /root/app/gallery
git pull origin main

# 后端：直接重启即加载新代码 / backend: restart is enough (Python loads code directly)
systemctl restart gallery-backend

# 前端：必须先重新构建，再重启（只 build 不 restart 会导致页面加载失败）
# frontend: MUST rebuild first, then restart
# (building without restarting breaks the page — old process + new build mismatch)
cd frontend
npm run build
systemctl restart gallery-frontend
```

> 注意：前端部署**必须 build + restart 两步**，缺一不可。
> Note: frontend deploys require BOTH `npm run build` AND `systemctl restart gallery-frontend`.

---

## 许可 / License

代码采用 MIT 协议（见 [`LICENSE`](LICENSE)）。**照片与文章内容版权归作者所有，未经许可不得使用。**

Code is licensed under the [MIT License](LICENSE). **All photos and articles are copyrighted by the author; do not use without permission.**
