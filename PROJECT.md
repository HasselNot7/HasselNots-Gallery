# Lens & Light — Photography Portfolio

基于 Stitch Gallery 项目 UI/UX 设计的个人摄影作品网站，使用 Next.js 16 + FastAPI 前后端分离架构。

## 项目结构

```
gallery/
├── backend/                    # FastAPI 后端
│   ├── main.py                 # 入口 + CORS 配置
│   ├── database.py             # SQLite + SQLAlchemy
│   ├── models.py               # User / Photo 模型
│   ├── schemas.py              # Pydantic 序列化
│   ├── auth.py                 # JWT 认证 (PBKDF2)
│   ├── init_db.py              # 初始化 DB + 创建管理员
│   ├── routes/
│   │   ├── auth.py             # POST /api/auth/login
│   │   └── photos.py           # CRUD /api/photos + EXIF 解析
│   └── uploads/                # 照片存储目录
├── frontend/                   # Next.js 16 前端
│   ├── app/
│   │   ├── page.tsx            # 首页：画廊 Hero + 照片网格
│   │   ├── login/page.tsx      # 管理员登录
│   │   ├── admin/page.tsx      # 上传 + 照片管理
│   │   ├── map/page.tsx        # 全球足迹地图
│   │   └── photo/[id]/page.tsx # 照片详情 + EXIF 面板
│   ├── components/
│   │   ├── Navbar.tsx          # 顶栏导航（玻璃效果）
│   │   ├── Footer.tsx          # 页脚
│   │   └── MapView.tsx         # Leaflet 地图组件
│   ├── lib/api.ts              # API 客户端 + 类型定义
│   └── app/globals.css         # Tailwind v4 设计令牌
├── start-backend.sh            # 启动后端脚本
└── start-frontend.sh           # 启动前端脚本
```

## 功能模块

### 1. 首页照片画廊
- Hero 区域：径向渐变背景、Portfolio 标签、动画标题
- 照片网格：非对称布局（16:9 / 4:5 / 21:9 三种比例卡片）
- 悬停效果：灰度 → 彩色过渡、毛玻璃覆盖层、元数据预览
- 照片按拍摄时间降序排列

### 2. 照片详情页
- 大图展示 + 侧边栏布局
- EXIF & Technical 数据面板：相机型号、镜头、光圈、快门、ISO、焦距
- 标签芯片：设备名称、GPS 坐标
- 如有 GPS 坐标则显示 Leaflet 地图

### 3. 影像足迹（Map 页面）
- 全屏 Leaflet 地图，标记所有有 GPS 坐标的照片
- 右侧地点列表：每处位置的经纬度、照片数量、缩略图预览
- 点击标记弹出照片信息窗口
- 底部统计栏：总位置数、照片数

### 4. 管理员登录
- 网格背景 + 渐变叠加 + 玻璃拟态登录卡片
- 底部边框输入框（设计系统标准样式）
- JWT Token 认证，会话保存在 localStorage

### 5. 后台上传管理
- 拖拽上传区（支持多文件、图片预览）
- 自动提取 EXIF 数据（拍摄时间、相机、镜头、GPS 等）
- 照片管理表格：预览、标题、日期、发布状态、操作按钮
- 支持发布/隐藏切换、删除确认

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端框架 | Next.js 16（App Router + Turbopack） |
| 样式 | Tailwind CSS v4（@theme 配置） |
| 图标 | Material Symbols Outlined（Google Fonts CDN） |
| 地图 | Leaflet + react-leaflet |
| 字体 | Hanken Grotesk / Inter / JetBrains Mono / Noto Serif SC / Sigma Serif |
| 后端框架 | FastAPI (Python 3.13) |
| 数据库 | SQLite + SQLAlchemy ORM |
| 认证 | JWT (python-jose) + PBKDF2 密码哈希 |
| 图片处理 | Pillow（缩略图生成 + EXIF 读取） |
| 对象存储 | Cloudflare R2（S3 兼容，boto3；未配置时回退本地存储） |

## 设计系统（基于 Stitch Gallery 项目）

### 配色 — Sage Portfolio

| 分组 | Token | Hex |
|---|---|---|
| 主色 | primary | `#163828` |
| 主色容器 | primary-container | `#2d4f3e` |
| 背景 | background | `#f8faf8` |
| 文字 | on-surface | `#191c1b` |
| 薄荷强调 | mint-accent | `#d1e7d3` |
| 边框 | border-subtle | `#e2e8e2` |

### 字体

| 用途 | 字体 | 字号 | 字重 |
|---|---|---|---|
| Display | Hanken Grotesk | 64px | 600 |
| Headline | Hanken Grotesk | 32px | 500 |
| Headline Mobile | Hanken Grotesk | 24px | 500 |
| Body | Inter | 16px | 400 |
| Metadata | JetBrains Mono | 12px | 400 |
| Label Caps | JetBrains Mono | 10px | 700 |

### 组件风格

- **导航栏**：玻璃拟态（`backdrop-blur-xl`）、底部边框
- **照片卡片**：无内边距图片 → 悬停灰度转彩色 + 缩放
- **EXIF 面板**：`bg-surface-container-low` + 2列网格
- **按钮**：Primary 实心森绿色 / Outlined 薄荷底色
- **输入框**：仅底部边框，聚焦时变主色
- **标签**：薄荷背景芯片 / 灰色位置标签

## 启动方式

项目使用 Nginx 作为统一入口（端口 80），反向代理前后端：

```bash
# 终端 1 — 启动后端 (绑定 127.0.0.1:8001)
./start-backend.sh

# 终端 2 — 启动前端 (绑定 127.0.0.1:3000)
./start-frontend.sh

# Nginx 配置见 /etc/nginx/sites-enabled/default
```

公网地址：`http://SITE_DOMAIN_PLACEHOLDER`

### Nginx 反向代理架构

```
浏览器 → :80 (Nginx)
           ├── /      → 127.0.0.1:3000 (Next.js)
           └── /api/* → 127.0.0.1:8001 (FastAPI)
```

前后端均只绑定 localhost，不暴露公网端口。客户端 API 调用使用相对路径（同域），无需 CORS 配置。

## 管理员账号

| 字段 | 值 |
|---|---|
| 用户名 | `hasselnot` |
| 密码 | `ADMIN_PASSWORD_PLACEHOLDER` |
| 登录入口 | `http://SITE_DOMAIN_PLACEHOLDER/login` |

## API 端点

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/auth/login` | 登录获取 JWT Token | 否 |
| GET | `/api/photos` | 照片列表（按拍摄时间排序） | 否 |
| GET | `/api/photos/geotagged` | 有 GPS 坐标的照片 | 否 |
| GET | `/api/photos/{id}` | 单张照片详情 | 否 |
| GET | `/api/photos/{id}/image` | 照片原图 | 否 |
| GET | `/api/photos/{id}/thumbnail` | 照片缩略图 | 否 |
| POST | `/api/photos/{id}/view` | 照片浏览量 +1 | 否 |
| POST | `/api/photos/{id}/location` | 设置照片拍摄位置（自动反编码地名） | 是 |
| POST | `/api/photos/{id}/location/reset` | 复原 EXIF 原始位置 | 是 |
| POST | `/api/photos/upload` | 上传照片（自动提取 EXIF） | 是 |
| POST | `/api/photos/batch-delete` | 批量删除照片（body: `{"ids":[1,2]}`） | 是 |
| POST | `/api/photos/batch-status` | 批量发布/隐藏（body: `{"ids":[1,2],"is_published":true}`） | 是 |
| PATCH | `/api/photos/{id}` | 更新照片标题/描述/发布状态 | 是 |
| DELETE | `/api/photos/{id}` | 删除照片及文件 | 是 |
| GET | `/api/articles` | 文章列表（`published_only` 过滤） | 否 |
| GET | `/api/articles/{slug}` | 文章详情（Markdown 渲染为 HTML） | 否 |
| POST | `/api/articles` | 新建文章 | 是 |
| PATCH | `/api/articles/{slug}` | 更新文章 | 是 |
| DELETE | `/api/articles/{slug}` | 删除文章 | 是 |
| POST | `/api/articles/{slug}/view` | 文章浏览量 +1 | 否 |

### 上传请求示例

```bash
curl -X POST http://127.0.0.1:8001/api/photos/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg" \
  -F "title=My Photo" \
  -F "description=Description"
```

### 认证流程

1. `POST /api/auth/login` 传入 `{"username":"hasselnot","password":"ADMIN_PASSWORD_PLACEHOLDER"}`
2. 获取 `access_token`
3. 后续请求在 Header 中携带 `Authorization: Bearer <token>`
