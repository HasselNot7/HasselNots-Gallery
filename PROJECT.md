# HasselNot's Gallery — 个人摄影作品集

基于 Stitch Gallery 项目 UI/UX 设计的个人摄影作品网站，使用 Next.js 16 + FastAPI 前后端分离架构。

> **品牌文字由后台控制**：导航栏站点名、首页 Hero 侧栏标签与品牌字、页脚标题与版权行、
> 浏览器标签标题（SEO）均可在 `/admin → 站点设置 → 品牌与文案` 修改。本文与 README 里出现的
> `Art` / `HasselNot's Gallery` 只是**默认值**，唯一来源是 `backend/defaults.py`
> （约定见文末〈站点设置：如何添加一个设置项〉）。

## 项目结构

```
gallery/
├── backend/                    # FastAPI 后端
│   ├── main.py                 # 入口 + CORS 配置 + 注册 9 个路由
│   ├── database.py             # SQLite + SQLAlchemy
│   ├── models.py               # User / Photo / Album / Comment / VisitLog / Article / Setting
│   ├── defaults.py             # 站点设置默认值的唯一来源（不 import 项目内任何模块）
│   ├── schemas.py              # Pydantic 序列化（字段默认值取自 defaults.DEFAULTS）
│   ├── auth.py                 # JWT 认证 (PBKDF2)
│   ├── storage.py              # Cloudflare R2 存储层（未配置回退本地）
│   ├── init_db.py              # 初始化 DB + 创建管理员
│   ├── backfill_r2.py          # 存量照片迁移 R2 脚本
│   ├── routes/                 # 9 个路由模块
│   │   ├── auth.py             # /api/auth：登录、/me、用户与管理员管理
│   │   ├── photos.py           # /api/photos：列表/详情/图片/上传/EXIF/位置/批量
│   │   ├── articles.py         # /api/articles：博客 CRUD + Markdown 渲染 + 浏览量
│   │   ├── albums.py           # /api/albums：相册 CRUD
│   │   ├── comments.py         # /api/comments + /api/visit（埋点）+ /api/analytics
│   │   ├── search.py           # /api/search：全站搜索
│   │   ├── services.py         # /api/services/check：服务健康检测
│   │   ├── settings.py         # /api/settings：站点设置读写 + /icon 站点图标
│   │   └── stats.py            # /api/stats/equipment：器材使用统计
│   └── uploads/                # 本地存储目录（R2 启用后仅存图标）
├── frontend/                   # Next.js 16 前端
│   ├── app/
│   │   ├── page.tsx            # 首页：Hero + 动态光斑背景 + 精选照片网格
│   │   ├── gallery/page.tsx    # 画廊：年份时间线 + 瀑布流
│   │   ├── albums/page.tsx     # 相册列表
│   │   ├── album/[slug]/page.tsx # 相册详情（独立专辑页）
│   │   ├── blog/page.tsx       # 博客文章列表
│   │   ├── blog/[slug]/page.tsx# 文章详情（Markdown 渲染）
│   │   ├── equipment/page.tsx  # 器材页（拍摄参数统计）
│   │   ├── search/page.tsx     # 全站搜索结果页
│   │   ├── login/page.tsx      # 管理员登录
│   │   ├── admin/page.tsx      # 后台：应用外壳式侧栏 + 8 个功能 tab
│   │   ├── map/page.tsx        # 全球足迹地图（取数与页面骨架）
│   │   ├── photo/[id]/page.tsx # 照片详情 + EXIF + 位置编辑
│   │   ├── layout.tsx          # 根布局：字体、波纹背景、品牌文案 Context
│   │   ├── globals.css         # Tailwind v4 设计令牌
│   │   ├── sitemap.ts          # SEO sitemap
│   │   └── robots.ts           # robots.txt
│   ├── components/
│   │   ├── Navbar.tsx          # 顶栏导航（玻璃效果，移动端走 Drawer）
│   │   ├── Footer.tsx          # 页脚（标题与版权行读后台设置，支持 {year} 占位）
│   │   ├── HeroSection.tsx     # 首页 Hero（侧栏标签与品牌字可后台改）
│   │   ├── ShaderHeroBackground.tsx # 首页动态光斑 WebGL 背景（three）
│   │   ├── WaterRippleBackground.tsx # 水墨波纹 WebGL 背景（three）
│   │   ├── PageBackground.tsx  # 按路由与开关决定是否渲染波纹背景
│   │   ├── PhotoGrid.tsx       # 首页非对称照片网格
│   │   ├── GallerySection.tsx  # 画廊时间线 + 无限滚动
│   │   ├── MapExplorer.tsx     # 足迹页交互容器：地点列表 + 年份筛选 + 双向选中 + 灯箱
│   │   ├── MapClient.tsx       # Leaflet 地图（底图切换 + 像素网格邻近聚合）
│   │   ├── PhotoMapWrapper.tsx # 详情页只读小地图
│   │   ├── LocationPicker.tsx  # 拖拽选点地图
│   │   ├── Lightbox.tsx / PhotoLightbox.tsx # 灯箱
│   │   ├── PhotoLocationPanel.tsx # 照片位置面板
│   │   ├── PhotoTags.tsx       # 设备/坐标芯片
│   │   ├── CommentSection.tsx  # 评论系统（发表 + 管理员删除）
│   │   ├── EquipmentStatsView.tsx # 器材统计（相机/镜头/焦距/光圈/ISO/快门）
│   │   ├── AlbumGrid.tsx       # 相册卡片网格
│   │   ├── ViewCounter.tsx     # 浏览量（每次页面加载 +1，数字滚动）
│   │   ├── VisitTracker.tsx    # 访问埋点（PV/UV 来源）
│   │   ├── LoginForm.tsx       # 登录表单
│   │   └── reactbits/          # 复用动效片段
│   │       ├── Reveal.tsx      # 进入视口时揭示（motion，不依赖 gsap）
│   │       ├── GlareHover.tsx  # 悬停掠光覆盖层（纯 CSS 驱动）
│   │       └── CountUp.tsx     # 数字滚动
│   └── lib/
│       ├── api.ts              # 客户端 API + 类型 + 登录态订阅源
│       ├── api-server.ts       # 服务端取数 + DEFAULT_SETTINGS（前端默认值唯一来源）
│       ├── site-config.tsx     # 品牌文案 Context（SiteConfigProvider / useSiteConfig）
│       ├── mapLayers.ts        # 8 种底图定义 + anitabi 风格缩略图切换器
│       ├── mapCluster.ts       # 按 zoom 的像素网格邻近聚合（纯函数、零依赖）
│       ├── mapYears.ts         # 年份配色与年份集合派生
│       ├── geocode.ts          # 逆地理编码
│       └── site.ts             # NEXT_PUBLIC_SITE_URL 归一化
├── start-backend.sh            # 后端（建表 + uvicorn :8001）
├── start-frontend-dev.sh       # 前端开发模式（npm run dev）
└── start-frontend-prod.sh      # 前端生产模式（npm run start，可带 --build）
```

## 功能模块

### 1. 首页照片画廊
- Hero 区域：动态光斑 WebGL 背景（11 种配色预设，后台可调）、右侧竖排标签（默认 `Collection`）
  与品牌字（默认 `HasselNot`）、动画标题 —— 两处文字均可在后台改
- 照片网格：非对称布局（16:9 / 4:5 / 21:9 三种比例卡片）
- 悬停效果：图片放大（`scale-105`）+ 主色半透明毛玻璃覆盖层淡入 + 元数据预览
- 照片按拍摄时间降序排列

### 2. 照片详情页
- 大图展示 + 侧边栏布局
- EXIF & Technical 数据面板：相机型号、镜头、光圈、快门、ISO、焦距
- 标签芯片：设备名称、GPS 坐标
- 如有 GPS 坐标则显示 Leaflet 地图

### 3. 影像足迹（Map 页面）
- Leaflet 地图填满内容区，标记所有有 GPS 坐标的照片
- 标记按当前 zoom 做**像素网格邻近聚合**（`lib/mapCluster.ts`，纯函数）：同地点合并为徽标计数，
  点击单地点簇等价于选中该地点，点击跨地点簇只放大视野并清除选中态
- 顶部一行：标题 + 地点数/照片数 + **年份筛选芯片**（不选=全部，筛选同时作用于地图、列表与计数）
- 右侧地点列表：地名、照片数、最多 3 张缩略图（第 3 张叠 `+N` 角标）；与地图标记**双向选中**，
  列表点选会 flyTo 并强调对应标记，地图点选会滚动列表到该行
- 点击标记弹出照片信息窗口；列表缩略图与「N 张」入口打开灯箱（键盘导航）
- 地名搜索框（结果以临时标记 + 弹出框展示经纬度）
- 底部统计栏：带坐标照片数

### 4. 管理员登录
- 网格背景 + 渐变叠加 + 玻璃拟态登录卡片
- 底部边框输入框（设计系统标准样式）
- JWT Token 认证，会话保存在 localStorage

### 5. 后台上传管理
- 拖拽上传区（支持多文件、图片预览）
- 自动提取 EXIF 数据（拍摄时间、相机、镜头、GPS 等），压缩上传时保留 GPS
- 照片管理表格：预览、标题、拍摄/上传日期、发布状态、上传时间标签
- 支持按拍摄时间/上传时间排序、标题搜索、状态筛选
- 批量操作：批量发布/隐藏、批量删除（两步确认）、全选
- 排序/筛选/搜索联动

### 6. 博客系统
- 文章列表页 `/blog` + 详情页 `/blog/[slug]`
- Markdown 写作（后端 python-markdown 渲染），支持代码块/表格
- 文章字段：标题、slug、摘要、标签、封面图（关联照片 ID）
- 后台 Blog 管理 tab：新建/编辑/发布切换/删除

### 7. 浏览量与访问统计
- 照片和文章均有 `views` 字段，详情页每次**页面加载** +1（`ViewCounter` 在客户端 hydration 后
  发一次 `POST /{id}/view`，用 `useRef` 去重，StrictMode 双跑也只加一次），并用 `CountUp` 滚动到新值
- 另有 `POST /api/visit` 埋点（`VisitTracker`，记录 path + IP 哈希）供后台访问分析使用
- 列表页、详情页、后台均展示浏览量

### 8. 照片位置编辑（管理员）
- 照片详情页可在地图上拖拽/点击设置拍摄地点，服务端自动反编码地名
- 可一键复原到 EXIF 原始坐标（`original_latitude/longitude` 快照）

### 9. 地图底图切换
- **8 种底图**（`lib/mapLayers.ts` 的 `TILE_LAYERS`，顺序即切换器顺序）：
  Bing（街道）、Bing Satellite、Streets（OSM）、Light（CARTO）、Satellite（Esri）、
  Hybrid（高德卫星 + 路网标注）、Gaode（高德）、Dark（CARTO）
- 切换器为 anitabi 风格缩略图选择器，选择结果存 `localStorage`
- Footprints 页与照片详情地图通用

### 10. SEO
- `/sitemap.xml`（照片+文章自动生成）、`/robots.txt`（屏蔽后台）
- 照片/文章详情页 OG 标签（社交分享预览图）
- 文档标题取后台 `site_title`：`generateMetadata` 的 `default` 与 `template`（`%s — 站点标题`）

### 11. 相册（Albums）
- `/albums` 相册列表 + `/album/[slug]` 专辑详情页（按主题/旅行地分组）
- 相册字段：`slug`、`title`、`description`、`cover_photo_id`（封面关联照片）、`is_published`
- 后台「相册」tab：新建/编辑/删除相册、勾选成员照片、发布切换
- 未发布相册只对管理员可见（`GET /api/albums?published_only=false` 需管理员 token）

### 12. 评论系统
- 照片详情页与文章详情页底部各挂一个评论区（`CommentSection`），游客填昵称 + 内容即可发表
- 无审核队列：评论即时公开，管理员在页面上直接删除（`DELETE /api/comments/{id}` 需管理员）
- 服务端按 IP 限流：每 3600 秒最多 20 条，超出返回 429 + `Retry-After`；内容长度上限 2000 字
- 一条评论只归属照片或文章之一（`photo_id` / `article_id` 二选一）

### 13. 访问分析（后台）
- 数据源是 `POST /api/visit` 埋点写入的 `visit_logs`（path + IP 的 SHA256 前 16 位，不存明文 IP）
- 面板内容：今日 PV/UV、本周 PV、总 PV/UV、最近 7 天柱图、热门页面（前 10）、热门照片（前 10）、
  热门文章（前 5）；`GET /api/analytics` 需管理员
- 加载期间显示与真实内容逐块等高的 Skeleton 骨架屏（避免数据到达时跳版）

### 14. 服务健康检测（后台）
- 20 项检查：SQLite、R2（S3 API + 公开端点）2 项、地图与瓦片 11 项（Bing / OSM / CARTO /
  Esri / 高德的街道、卫星、注记图层）、地理编码 4 项（Nominatim、BigDataCloud、Open-Meteo、
  Photon）、字体 CDN 2 项（Google Fonts、Material Symbols）
- `GET /api/services/check` 全量检测（需管理员），`GET /api/services/check/{name}` 单项重检
- 未检测状态 `ok=null` 显示为灰色圆点，汇总条显示「N / 20 项服务可用」与检测时间

### 15. 全站搜索与器材页
- `/search?q=`：`GET /api/search` 公开，只返回已发布内容。照片匹配标题/描述/地点/相机/镜头/
  标签/原始文件名（上限 60 条），文章匹配标题/摘要/标签（上限 20 条）
- `/equipment`：`GET /api/stats/equipment` 公开，统计已发布照片的总数、按相机/镜头分组计数、
  焦距分档、光圈分档、ISO 与快门速度分布；前端 `EquipmentStatsView` 用 HeroUI `ProgressBar` 呈现

### 16. 后台外壳与管理员管理
- 应用外壳式布局：全高侧栏（可折叠，折叠态持久化在 localStorage）+ 右侧内容区；
  移动端折叠为 Drawer
- 8 个功能 tab：站点设置、上传照片、照片管理、相册、笔记、访问分析、服务检测、管理员
- 管理员 tab 可创建管理员账号、给已有用户授予管理员、删除用户（**没有降权接口**，撤销管理员
  只能删除账号；`/api/auth/users*` 均需管理员）

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端框架 | Next.js 16（App Router + Turbopack）+ React 19 |
| UI 组件库 | **HeroUI v3**（`@heroui/react`）—— 复合组件、无 Provider，底层是 React Aria（`react-aria-components`）+ Tailwind v4（`@heroui/styles`）。用于 Button/Modal/Drawer/Switch/Select/ListBox/TextField/Input/Card/Chip/Checkbox/Slider/Toast/ScrollShadow/Tooltip/Skeleton 等 |
| 无障碍/交互原语 | `react-aria` / `react-aria-components` / `@react-aria/*`（HeroUI 的依赖，直接用于 `useOverlayState`、i18n、ssr） |
| 样式 | Tailwind CSS v4（`@theme` 设计令牌，globals.css） |
| 动效 | **motion**（`motion/react`）—— reactbits 的 `Reveal` / `CountUp` 使用；`GlareHover` 为纯 CSS |
| WebGL 背景 | **three** —— 首页动态光斑（ShaderHeroBackground）与水墨波纹（WaterRippleBackground） |
| 地图 | Leaflet 1.9 —— `MapClient` 用 `import("leaflet")` 命令式构建（自写底图切换器与像素网格聚合）。`@types/leaflet` 仅用于类型 |
| 图标 | Material Symbols Outlined —— `@font-face` 写在 globals.css 的 `@layer base`（字体文件仍走 Google CDN），类规则入 base 层以便尺寸工具类生效 |
| 字体 | Sigma Serif（本地 `next/font/local`）/ JetBrains Mono / Noto Serif SC / Hanken Grotesk / Inter（详见下节） |
| EXIF | **piexifjs**（浏览器端压缩后回写 EXIF/GPS）+ piexif（后端注入与读取）+ Pillow（缩略图、EXIF 解析） |
| 后端框架 | FastAPI (Python 3.13) + python-markdown（文章渲染） |
| 数据库 | SQLite + SQLAlchemy ORM |
| 认证 | JWT (python-jose) + PBKDF2 密码哈希 |
| 对象存储 | Cloudflare R2（S3 兼容，boto3；未配置时回退本地存储） |

## 设计系统（基于 Stitch Gallery 项目）

### 配色 — Monochrome · Ember

> 「Monochrome · Ember」是后台 11 个首页光斑预设里的第一个（`BG_PRESETS[0]`），只描述 WebGL
> 背景的取色风格；下表是 UI 令牌的实际值。

| 分组 | Token | Hex |
|---|---|---|
| 主色（黑） | primary | `#141414` |
| 主色容器 | primary-container | `#2b2b2b` |
| 背景 | background | `#ffffff` |
| 文字 | on-surface | `#1a1a1a` |
| 次色（与主色同为黑） | secondary | `#141414` |
| 橙红点缀 | tertiary | `#d3542e` |
| 表面容器（面板底） | surface-container-low | `#f7f7f7` |
| 边框 | border-subtle | `#e5e5e5` |
| 强调别名（历史命名，值已是黑） | mint-accent / deep-charcoal | `#141414` |

> `mint-accent` 名字来自更早一版的薄荷绿主题，现值为黑；`btn-primary` / `btn-outline` 两个
> 工具类仍引用它，但**全站 tsx 无引用**，属遗留样式（待清理）。

### 字体

`app/globals.css` 的 `@theme` 实际定义（不是设计稿初版的那套）：

```
--font-display: var(--font-sigma), "Noto Serif SC", sans-serif;   /* Sigma Serif 本地字面 */
--font-body:    "JetBrains Mono", "Noto Serif SC", sans-serif;
--font-mono:    "JetBrains Mono", "Noto Serif SC", monospace;
--font-sans:    "JetBrains Mono", "Noto Serif SC", sans-serif;    /* 让 HeroUI/preflight 继承 */
```

| 用途 | 类名 | 字体栈 | 字号 | 字重 | 行高 |
|---|---|---|---|---|---|
| Display | `.text-display-lg` | `--font-display`（Sigma Serif → Noto Serif SC） | 64px | 600 | 1.1 |
| Headline | `.text-headline-lg` | 同上 | 32px | 500 | 1.2 |
| Headline Mobile | `.text-headline-mobile` | 同上 | 24px | 500 | 1.2 |
| Body | `.text-body-md` | `--font-body`（JetBrains Mono → Noto Serif SC） | 16px | 400 | 1.6 |
| Metadata | `.text-metadata-sm` | `--font-mono` | 12px | 400 | 1.4 |
| Label Caps | `.text-label-caps` | `--font-mono` | 10px | 700 | 1.0 |

- **Display/Headline 不是 Hanken Grotesk**，而是本地 `next/font/local` 加载的 Sigma Serif
  （`app/fonts/SigmaSerif-Text.ttf`，变量名 `--font-sigma`）。
- **Body/Metadata 都是等宽优先**：JetBrains Mono 排西文，中文回落到 Noto Serif SC。
- Hanken Grotesk 与 Inter 仍由 `app/layout.tsx` 的 Google Fonts `<link>` 加载，但**不在字阶里**，
  只有两处硬编码用到：`HeroSection.tsx` 的右侧竖排标签（Hanken Grotesk）、
  `MapClient.tsx` 的 Leaflet 弹出框 HTML（Inter）。因此不能直接删 `<link>`；
  若要清理，先把这两处换成字阶令牌。

### 组件风格

- **导航栏**：`.glass-panel`（半透明白 + `backdrop-filter: blur(18px)` + 1px 白边框）+ 底部边框
- **照片卡片**：无内边距图片 → 悬停时图片 `scale-105`、`bg-primary/60` + `backdrop-blur-md`
  的覆盖层淡入并浮出元数据；画廊卡片另有 `hover:-translate-y-2` + 阴影加深
- **EXIF 面板**：`bg-surface-container-low` + `border-border-subtle` + 圆角，内部 2 列网格
- **按钮**：统一走 HeroUI `<Button>`（`primary` / `secondary` / `tertiary` / `ghost` 变体），
  主按钮为黑底白字；`globals.css` 里的 `.btn-primary` / `.btn-outline` 已无引用
- **输入框**：登录页保留「仅底部边框、无圆角、透明底」的下划线样式（HeroUI `Input` +
  `border-0 border-b` 覆盖）；后台与评论表单用 HeroUI 默认的带边框输入框
- **标签**：HeroUI `Chip` —— 设备名用 `variant="primary"`（黑底白字），位置/坐标用
  `variant="soft"`（浅灰底）
- **侧栏（后台）**：应用外壳式全高侧栏，折叠态 68px、展开态 240px，折叠时行内文字转 `sr-only`
  并用 HeroUI `Tooltip`（placement=right）补视觉提示

## 启动方式

项目使用 Nginx 作为统一入口（端口 80），反向代理前后端。仓库根目录有三个脚本，
**没有** `start-frontend.sh`：

```bash
# 终端 1 — 后端 (绑定 127.0.0.1:8001)
# 先 source backend/.venv，再跑 init_db.py 建表（首次需要 ADMIN_PASSWORD，见〈管理员账号〉），
# 最后 exec uvicorn
./start-backend.sh

# 终端 2 — 前端，二选一 (均绑定 127.0.0.1:3000)
./start-frontend-dev.sh          # 开发模式：npm run dev（Turbopack 热更新）
./start-frontend-prod.sh          # 生产模式：NODE_ENV=production + npm run start
./start-frontend-prod.sh --build  # 先 npm run build 再启动（部署新代码后用这条）

# Nginx 配置见 /etc/nginx/sites-enabled/default
```

公网地址：由环境变量 `NEXT_PUBLIC_SITE_URL` 配置

### Nginx 反向代理架构

```
浏览器 → :80 (Nginx)
           ├── /      → 127.0.0.1:3000 (Next.js)
           └── /api/* → 127.0.0.1:8001 (FastAPI)
```

前后端均只绑定 localhost，不暴露公网端口。客户端 API 调用使用相对路径（同域），无需 CORS 配置。

## 对象存储（Cloudflare R2）

照片（原图 + 缩略图）存储在 Cloudflare R2，服务器本地不再保存照片文件。未配置 R2 时自动回退本地存储（`backend/uploads/`）。

### 配置（backend/.env，模板见 backend/.env.example）

```bash
R2_ACCOUNT_ID=你的Cloudflare账户ID（32位十六进制，dash.cloudflare.com首页账户名下方）
R2_ACCESS_KEY_ID=R2 API Token 的 Access Key ID（R2 → Manage API Tokens）
R2_SECRET_ACCESS_KEY=R2 API Token 的 Secret（64位）
R2_BUCKET=gallery
R2_PUBLIC_URL=https://cdn.example.com   # 可选：不填则用签名 URL。**推荐自定义域名**
                                       # （走 Cloudflare CDN，有边缘缓存与 HTTP/2）；
                                       # 未配置域名前可临时用 https://pub-xxxx.r2.dev 开发
```

> 注意：`R2_ACCOUNT_ID` 不是邮箱也不是 API Token，是 32 位十六进制账户 ID。
> `.env` 含密钥，已在 .gitignore 中排除。

### 存储路径约定

- DB 中 `file_path` / `thumbnail_path` 为 `r2://photos/<文件名>` 表示远程对象
- 未配置 R2 时存本地相对文件名（`UPLOAD_DIR` 解析），本地文件走 `FileResponse`

### 图片取用的两段式跳转

浏览器请求 `/api/photos/<id>/thumbnail`（或 `/image`）时会走两跳：

1. **第一跳 —— 后端 302**。远程对象返回 `302`，`Location` 指向 `R2_PUBLIC_URL/<key>`。
   配置了 `R2_PUBLIC_URL` 时，这一跳**自带** `Cache-Control: public, max-age=31536000, immutable`
   （实测 `curl -s -D- http://127.0.0.1:8001/api/photos/88/thumbnail` 可见）；未配置时改用
   签名 URL 且不带缓存头。这一跳要走完整服务端链路（Nginx → uvicorn），站点域名套 Cloudflare
   时它是动态请求、不被边缘缓存（`cf-cache-status: DYNAMIC`）。
2. **第二跳 —— 对象存储/CDN**。字节真正来自 R2 公开端点。**自定义域名**走 Cloudflare CDN：
   有 `cf-cache-status`（命中为 `HIT`）、HTTP/2，缓存头由 CDN 侧设置（作者实测 `max-age=14400`）。
   `r2.dev` 端点实测只协商到 HTTP/1.1，响应里既无 `Cache-Control` 也无 `cf-cache-status`，
   即不做边缘缓存 —— 所以图片域名应尽量用自定义域名，见 `docs/DEPLOY.md`。

### 存量迁移

```bash
cd backend
# 试跑（只上传，不删本地）
.venv/bin/python backfill_r2.py
# 确认成功后删除本地副本
.venv/bin/python backfill_r2.py --delete-local
```

### 收费说明

- 存储：约 0.11 元/GB/月（R2 前 10GB 免费），20GB 原图约 2-4 元/月
- 流量：R2 出口流量免费（这是选 R2 而非腾讯 COS 的主要原因）
- 注意：Cloudflare 在大陆没有节点，国内访问速度一般（R2 本身无中国 CDN）

## 管理员账号

| 字段 | 值 |
|---|---|
| 用户名 | `hasselnot`（`init_db.py` 里写死的唯一管理员用户名） |
| 密码 | **不在仓库里**，由部署时设置，见下 |
| 登录入口 | `http://<服务器地址>/login` |

`backend/init_db.py` 只在「库里还没有该用户」时创建管理员，取密码的顺序是：

1. 环境变量 `ADMIN_PASSWORD`（`ADMIN_PASSWORD=xxx ./start-backend.sh` 或 systemd 里配）
2. 没有该变量则 `getpass` 交互式提示输入（不回显）
3. 两者都为空 → `raise SystemExit("No password provided")`，不会创建弱密码账号

仓库内不含任何默认密码/示例密码。忘记密码只能改库或删掉该用户行后重跑 `init_db.py`。

## API 端点

认证列的取值（逐个对着 `backend/routes/*.py` 的依赖声明核实）：

- **公开** —— 无 token 即可访问
- **可选** —— `Depends(get_current_user)`，匿名可读；带管理员 token 时额外返回未发布内容
  （`/image`、`/thumbnail` 还支持 `?token=<jwt>` 查询串，便于 `<img>` 引用未发布图）
- **管理员** —— `Depends(require_admin)`，缺失或非管理员返回 403

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/health` | 健康检查（`main.py`） | 公开 |
| POST | `/api/auth/login` | 登录获取 JWT Token | 公开 |
| GET | `/api/auth/me` | 当前用户；无 token 返回 401 | 是 |
| POST | `/api/auth/register` | 注册普通用户（`is_admin=false`，按 IP 限流） | 公开 |
| GET | `/api/auth/users` | 用户列表 | 管理员 |
| POST | `/api/auth/users` | 管理员创建账号（**`is_admin=true`**，密码 ≥6 位） | 管理员 |
| POST | `/api/auth/users/{id}/grant` | 授予某用户管理员 | 管理员 |
| DELETE | `/api/auth/users/{id}` | 删除用户（撤销管理员的唯一手段，没有降权接口） | 管理员 |
| GET | `/api/photos` | 照片列表（分页 `skip`/`limit≤100`、`album_id`、`published_only`） | 可选 |
| GET | `/api/photos/geotagged` | 有 GPS 坐标的照片 | 公开 |
| GET | `/api/photos/years` | 拍摄年份聚合（画廊时间线） | 公开 |
| GET | `/api/photos/{id}` | 单张照片详情（未发布只对管理员可见，否则 404） | 可选 |
| GET | `/api/photos/{id}/image` | 原图（远程对象 → 302） | 可选 |
| GET | `/api/photos/{id}/thumbnail` | 缩略图（远程对象 → 302） | 可选 |
| POST | `/api/photos/{id}/view` | 照片浏览量 +1 | 公开 |
| POST | `/api/photos/upload` | 上传照片（自动提取 EXIF） | 管理员 |
| POST | `/api/photos/batch-delete` | 批量删除（body: `{"ids":[1,2]}`） | 管理员 |
| POST | `/api/photos/batch-status` | 批量发布/隐藏（body: `{"ids":[…],"is_published":true}`） | 管理员 |
| POST | `/api/photos/{id}/location` | 设置拍摄位置（自动逆编码地名） | 管理员 |
| POST | `/api/photos/{id}/location/reset` | 复原 EXIF 原始位置 | 管理员 |
| PATCH | `/api/photos/{id}` | 更新标题/描述/发布状态/标签等 | 管理员 |
| DELETE | `/api/photos/{id}` | 删除照片及文件 | 管理员 |
| GET | `/api/albums` | 相册列表 | 可选 |
| GET | `/api/albums/{slug}` | 相册详情（含成员照片） | 可选 |
| POST | `/api/albums` | 新建相册 | 管理员 |
| PATCH | `/api/albums/{slug}` | 更新相册 | 管理员 |
| DELETE | `/api/albums/{slug}` | 删除相册 | 管理员 |
| GET | `/api/articles` | 文章列表（`published_only` 过滤） | 可选 |
| GET | `/api/articles/{slug}` | 文章详情（Markdown 渲染为 HTML） | 可选 |
| POST | `/api/articles/{slug}/view` | 文章浏览量 +1 | 公开 |
| POST | `/api/articles` | 新建文章 | 管理员 |
| PATCH | `/api/articles/{slug}` | 更新文章 | 管理员 |
| DELETE | `/api/articles/{slug}` | 删除文章 | 管理员 |
| GET | `/api/comments?photo_id=` / `?article_id=` | 评论列表 | 公开 |
| POST | `/api/comments` | 发表评论（按 IP 限流 20 条/小时，内容 ≤2000 字） | 公开 |
| DELETE | `/api/comments/{id}` | 删除评论 | 管理员 |
| POST | `/api/visit` | 访问埋点（path + IP 哈希，限流 300 次/分钟） | 公开 |
| GET | `/api/analytics` | 访问分析（PV/UV、7 天、热门榜） | 管理员 |
| GET | `/api/search?q=` | 全站搜索（照片 ≤60 条 + 文章 ≤20 条，仅已发布） | 公开 |
| GET | `/api/stats/equipment` | 器材使用统计 | 公开 |
| GET | `/api/services/check` | 全量服务健康检测（20 项） | 管理员 |
| GET | `/api/services/check/{name}` | 单项重检 | 管理员 |
| GET | `/api/settings` | 站点设置（含全部默认值兜底） | 公开 |
| PUT | `/api/settings` | 保存站点设置（只写入非 null 字段） | 管理员 |
| GET | `/api/settings/icon` | 自定义站点图标文件（`attachment` 下载，防 SVG 执行） | 公开 |
| POST | `/api/settings/icon` | 上传自定义图标 | 管理员 |
| DELETE | `/api/settings/icon` | 删除自定义图标 | 管理员 |

### 上传请求示例

```bash
curl -X POST http://127.0.0.1:8001/api/photos/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg" \
  -F "title=My Photo" \
  -F "description=Description"
```

### 认证流程

1. `POST /api/auth/login` 传入 `{"username":"hasselnot","password":"<管理员密码>"}`
2. 获取 `access_token`
3. 后续请求在 Header 中携带 `Authorization: Bearer <token>`

## 站点设置：如何添加一个设置项

站点设置是一张 KV 表（`settings`：`key` / `value` 两列），**库里只存被改过的键**，读取时
用默认值兜底（`routes/settings.py` 的 `_get_all` 先 `dict(DEFAULTS)` 再覆盖有行的键）。
因此「默认值」必须只有一个来源，否则改一处漏一处，迟早出现前后端默认值不一致。

### 两个唯一来源

| 端 | 文件 | 谁引用它 |
|---|---|---|
| 后端 | `backend/defaults.py` 的 `DEFAULTS` | `routes/settings.py`（`from defaults import DEFAULTS`，兜底 + 读出）、`schemas.py`（`SettingsOut` 每个字段写 `Field(default=DEFAULTS[k])`） |
| 前端 | `frontend/lib/api-server.ts` 导出的 `DEFAULT_SETTINGS` | `lib/site-config.tsx`（Context 初值与空串回退）、`app/admin/page.tsx`（表单初值、重置、placeholder）、`app/layout.tsx`（metadata 回退） |

依赖方向是单向的：`defaults.py` **不得 import 项目内任何模块**（否则 `schemas → defaults → schemas`
循环）；前端各消费点只 import `DEFAULT_SETTINGS`，**不得再写第二份字面量**。

两份表必须逐字一致（含 `©`、`’`/`'`、`—`、换行 `\n`、色值大小写与空格）。

### 加一个设置项的完整改动（4 处）

1. `backend/defaults.py`：`DEFAULTS` 加一行默认值。
2. `backend/schemas.py`：`SettingsOut` 加 `foo: str = Field(default=DEFAULTS["foo"])`；
   `SettingsUpdate` 加 `foo: Optional[str] = None`（`None` 表示「本次不改」，`PUT` 用
   `model_dump(exclude_none=True)` 只写非 null 字段，所以**不能**给 Update 模型设默认值）。
3. `frontend/lib/api-server.ts`：`SiteSettings` 接口加字段 + `DEFAULT_SETTINGS` 加同一默认值。
4. `frontend/app/admin/page.tsx`：在对应小节加一个输入框/开关（重置与 placeholder 都取
   `DEFAULT_SETTINGS.foo`，不要写死字符串）。

值是字符串存储的。布尔型开关沿用现有约定：`"true"` / `"false"` 字符串，读取端用
`api-server.ts` 的 `isOn(v) => v !== "false"`（**只有显式 `"false"` 才算关**，字段缺失、
空串、旧数据一律退化为「开」），别在消费点各写一遍判断。

> ⚠️ 如果你在第三处又写了一份同样的字面量，或者想写「断言前后端默认值相等」的测试 ——
> 那说明设计错了。正确做法是消灭第三处，而不是给重复加校验。

## 后台可编辑的品牌与显示项

以下清单按 `backend/defaults.py` 的实际内容整理（共 30 个键，全部为字符串值）。
入口：`/admin → 站点设置`。

### 显示开关（3 个，值为 `"true"` / `"false"`）

| 键 | 默认 | 作用范围 |
|---|---|---|
| `show_hero_decorations` | `true` | **全站 HUD 装饰总开关**：首页 Hero 的准星/刻度尺/测量线/右侧装饰竖栏、`/gallery` 与 `/map` 的同款装饰层。键名保留 `hero` 前缀是为兼容既有 KV 数据；网格底纹、页面骨架、承载功能的节点不受影响。读取入口 `hudDecorationsEnabled()` |
| `show_hero_shader` | `true` | 首页动态光斑 WebGL 背景。关闭后不再加载 three，省掉 GPU 上下文与掉帧循环（低端设备/移动端更省电） |
| `show_water_ripple` | `true` | 水墨波纹 WebGL 背景。`PageBackground` 还按路由裁剪：`/`、`/admin`、`/photo/*`、`/map`、`/login` **不渲染**，即图库/相册/博客/器材/搜索等内容页才有 |

### 品牌与文案（7 个）

| 键 | 默认值 | 出现在哪 |
|---|---|---|
| `site_name` | `Art` | 导航栏品牌字（清空则回退默认值，不留白） |
| `site_title` | `HasselNot's Gallery` | 浏览器标签与搜索结果标题：`generateMetadata` 的 `default` 与 `template`（`%s — 站点标题`） |
| `hero_side_label` | `Collection` | 首页 Hero 右侧竖排标签第一行 |
| `hero_side_brand` | `HasselNot` | 首页 Hero 右侧竖排标签第二行 |
| `footer_title` | `HASSELNOT'S GALLERY` | 页脚标题 |
| `footer_copyright` | `© {year} HASSELNOT'S GALLERY. All rights reserved.` | 页脚版权行。`{year}` 由 `Footer` 的 `formatCopyright` 替换为当前年份，可出现多次；**不写 `{year}` 就原样显示，不会自动追加** |
| `site_tagline` | `Precision photography portfolio. Every frame tells a story.` | 页脚副标题（字面 `\n` 会渲染成换行）+ SEO `description` |

文案为空或全空白时，`lib/site-config.tsx` 的 `textOr` 会回退到 `DEFAULT_SETTINGS` 的默认值，
所以清空输入框不会让页面出现空洞。

### Hero 内容（4 个）

`hero_title`（含 `\n`，前端按换行渲染）、`hero_description`、`hero_icon`
（Material Symbols 图标名，如 `photo_camera`）、`hero_icon_url`（自定义图标 URL，非空时
优先于 `hero_icon`；由 `POST /api/settings/icon` 上传、`DELETE /api/settings/icon` 删除，
文件落在 `backend/uploads/icon/`）。

### 背景与动效参数（16 个，全部是颜色或数值字符串）

| 组 | 键 |
|---|---|
| 首页光斑配色 | `bg_color1` … `bg_color6`、`bg_base` |
| 水波纹 | `water_ink1`、`water_ink2`、`water_ink_top`（透明度）、`water_strength` |
| 光斑形态与速度 | `hero_gradient_size`、`hero_gradient_count`、`hero_speed`、`hero_color1_weight`、`hero_color2_weight` |

后台的「11 种配色预设」按钮不是设置项，它一次写入 `bg_color1..6` 等一组值
（`BG_PRESETS`，见 `app/admin/page.tsx`），写入后仍可逐项手改。
