# Lens & Light — Photography Portfolio

基于 Next.js 16 + FastAPI 的个人摄影作品网站与博客。黑白配色 + 橙红点缀，支持照片画廊、足迹地图、博客、评论、访问统计与 Cloudflare R2 存储。

## 功能

- **首页**：动态光斑 WebGL 背景 + 品牌 Hero
- **画廊**：瀑布流 + 年份时间线跳转 + 灯箱大图浏览（键盘导航）+ 无限滚动
- **相册**：按主题/旅行地分组，独立专辑页
- **足迹地图**：全屏 Leaflet 地图，标记按年份配色，地名搜索，6 种底图切换
- **照片详情**：EXIF 面板、浏览量、评论、位置编辑（管理员可在地图上拖拽设置/复原拍摄地点）
- **博客**：Markdown 写作（后台管理），列表 + 详情页，标签、浏览量、评论
- **管理后台**：站点设置、批量上传（浏览器端压缩 + EXIF/GPS 保留）、照片/相册/文章管理、访问分析（PV/UV、热门内容）
- **SEO**：sitemap.xml、robots.txt、OG 标签
- **存储**：Cloudflare R2（S3 兼容），未配置时回退本地；重复图片检测（SHA256）

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16（App Router + Turbopack）、Tailwind CSS v4、Leaflet、Three.js |
| 后端 | FastAPI（Python 3.13）、SQLAlchemy、SQLite |
| 图片 | Pillow（EXIF/缩略图）、piexif（EXIF 注入）、python-markdown |
| 存储 | Cloudflare R2（boto3） |
| 字体 | Sigma Serif / JetBrains Mono / Noto Serif SC（思源宋体） |

## 快速开始

```bash
# 后端 (Python 3.13)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # 填入 R2 配置（可选）
ADMIN_PASSWORD=你的密码 .venv/bin/python init_db.py   # 创建管理员
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001

# 前端 (Node 20+)
cd frontend
npm install
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" > .env.local
npm run dev
```

访问 `http://localhost:3000`，后台入口 `/admin`。

## 对象存储（Cloudflare R2）

照片存储于 R2（原图 + 缩略图），服务器不保存照片文件。配置见 `backend/.env.example`：

```bash
R2_ACCOUNT_ID=Cloudflare账户ID（32位十六进制）
R2_ACCESS_KEY_ID=R2 API Token Access Key
R2_SECRET_ACCESS_KEY=R2 API Token Secret
R2_BUCKET=gallery
R2_PUBLIC_URL=https://pub-xxxx.r2.dev   # r2.dev 子域或自定义域名
```

存量照片迁移：`cd backend && .venv/bin/python backfill_r2.py --delete-local`

> 未配置 R2 时自动回退本地 `backend/uploads/` 存储。

## 目录结构

```
backend/                # FastAPI 后端
├── main.py             # 入口
├── routes/             # auth / photos / articles / albums / comments
├── storage.py          # R2 存储层
├── init_db.py          # 建表 + 创建管理员（密码从环境变量读取）
└── *.py                # 工具脚本（回填、重编码地名）
frontend/               # Next.js 前端
├── app/                # 页面（首页/画廊/相册/博客/地图/后台）
├── components/         # 组件（灯箱、地图、评论、时间线等）
└── lib/                # API 客户端、地图图层、站点配置
docs/DEPLOY.md          # 部署指南（systemd + nginx + HTTPS）
PROJECT.md              # 项目文档
```

## 部署

完整部署步骤（systemd + nginx + HTTPS）见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。要点：

- 代码 + `backend/gallery.db` + `backend/.env`（密钥）三件套迁移
- 环境变量：`NEXT_PUBLIC_SITE_URL`（站点域名）、`JWT_SECRET_KEY`（生产务必设置）
- 照片本体在 R2，迁移服务器无需搬运图片

## 许可

仅个人使用。照片版权归作者所有。
