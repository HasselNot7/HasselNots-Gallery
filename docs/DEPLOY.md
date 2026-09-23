# 部署指南

本文档描述如何把 HasselNot's Gallery 项目部署到一台新的服务器（以 Ubuntu 22.04/24.04 为例）。

## 部署物清单

| 内容 | 说明 | 是否走 git |
|---|---|---|
| 代码（frontend/ + backend/ + 启动脚本） | 项目本体 | 是（git clone） |
| `backend/gallery.db` | SQLite 数据库（照片记录、文章、管理员账号、R2 路径） | **否，需手动拷贝** |
| `backend/.env` | R2 密钥等环境配置 | 否，需手动创建 |
| `backend/uploads/` | 本地照片目录 | 否，可留空（照片已在 R2） |

## 1. 服务器环境准备

```bash
# Python 3.11+（推荐 3.13）与 pip
sudo apt update && sudo apt install -y python3 python3-venv python3-pip git

# Node.js 20+（Next.js 16 要求），建议用 nvm 安装 LTS 版本：
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22

# HEIF 支持（Pillow-heif 依赖）
sudo apt install -y libheif-dev
```

## 2. 获取代码与数据库

```bash
git clone <你的仓库地址> gallery && cd gallery

# 数据库：从旧服务器拷贝（照片记录 + 管理员账号）
scp user@old-server:/path/to/gallery/backend/gallery.db backend/

# 密钥配置
cp backend/.env.example backend/.env
vi backend/.env   # 填入 JWT_SECRET_KEY（必填，生成命令见下方）与 R2 配置
```

`.env` 内容：

```bash
# 必填：JWT 签名密钥，缺失后端启动时直接报错退出。
# 生成方式：
python3 -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=上一步生成的64位随机值

# 轮换（更换）此密钥会使所有已登录用户失效，需要重新登录。

R2_ACCOUNT_ID=你的Cloudflare账户ID（32位十六进制）
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=gallery

# 图片公开访问端点。**推荐自定义域名**（见下方「图片端点：自定义域名 vs r2.dev」）：
R2_PUBLIC_URL=https://cdn.example.com
# 只有还没配域名时才用 r2.dev 子域（开发/验证足够，生产会慢一截）：
# R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

## 3. 安装依赖

```bash
# 后端
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 前端
cd ../frontend
npm install
```

> 若 pip 下载慢，加镜像：`-i https://pypi.tuna.tsinghua.edu.cn/simple`

## 4. 启动（开发/验证）

仓库根目录有三个脚本，**没有** `start-frontend.sh`：

```bash
# 终端 1 — 后端 (127.0.0.1:8001)：source .venv → init_db.py 建表 → uvicorn
./start-backend.sh

# 终端 2 — 前端 (127.0.0.1:3000)，二选一：
./start-frontend-dev.sh            # 开发模式：npm run dev（Turbopack 热更新）
./start-frontend-prod.sh           # 生产模式：NODE_ENV=production + npm run start
./start-frontend-prod.sh --build   # 先 npm run build 再启动（部署新代码后用这条）
```

> 两个前端脚本的差别只在 `npm run dev`（Turbopack 按需编译）与 `npm run start`
> （只跑 `npm run build` 产出的生产构建）之间：没有构建产物时 `next start` 会报
> “Could not find a production build in the '.next' directory”，`--build` 就是替你补上构建这一步。

验证：`curl http://127.0.0.1:8001/api/photos` 应返回照片列表（含 `r2://` 路径）。

## 5. 生产部署（systemd + nginx）

### 后端 systemd 服务

```ini
# /etc/systemd/system/gallery-backend.service
[Unit]
Description=Gallery Backend (FastAPI)
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/gallery/backend
ExecStart=/opt/gallery/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

### 前端 systemd 服务

```ini
# /etc/systemd/system/gallery-frontend.service
[Unit]
Description=Gallery Frontend (Next.js)
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/gallery/frontend
Environment=PATH=/opt/gallery/frontend/node_modules/.bin:/usr/bin:/bin
ExecStart=/usr/bin/npm run start
Restart=always

[Install]
WantedBy=multi-user.target
```

启用：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gallery-backend gallery-frontend
```

### nginx 反向代理

```nginx
# /etc/nginx/sites-enabled/gallery
server {
    listen 80;
    server_name gallery.example.com;

    client_max_body_size 100m;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 6. 域名与 HTTPS（可选但推荐）

- 国内访问：域名需 ICP 备案后走云厂商 CDN 加速
- HTTPS：用 certbot 签发免费证书：
  ```bash
  sudo apt install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d gallery.example.com
  ```

## 7. 图片端点：自定义域名 vs r2.dev

`R2_PUBLIC_URL` 决定图片第二跳落在哪个端点，实测差异明显：

| | `r2.dev` 子域 | 自定义域名（接入 Cloudflare） |
|---|---|---|
| 协议 | 只协商到 HTTP/1.1（同一主机并发连接上限 6） | HTTP/2 |
| 边缘缓存 | 无：响应里既没有 `Cache-Control` 也没有 `cf-cache-status` | 有：可配 `Cache-Control`（作者实测 `max-age=14400`），命中时 `cf-cache-status: HIT` |
| 适用场景 | 还没配域名时的开发/验证 | **生产推荐** |

复现命令：

```bash
curl -s -o /dev/null -D- --http2 -w 'http_version=%{http_version}\n' \
  "https://pub-xxxx.r2.dev/photos/thumb_<hash>.jpg"
# 实测输出 http_version=1.1，且响应头无 Cache-Control / cf-cache-status
```

### 一条图片请求的真实开销

后端 `/api/photos/<id>/{image,thumbnail}` 对远程对象只做 302，字节来自上面的公开端点，
所以每张图是两跳（作者实测）：

- 拿重定向：约 **0.6s**（走完整服务端链路；站点域名套 Cloudflare 时这一跳是
  `cf-cache-status: DYNAMIC`，不被边缘缓存）
- 从 CDN 取字节：约 **0.9s**
- 12 张缩略图并发，首屏约 **1.83s**

要继续提速，方向是**省掉 302 那一跳**：让前端直接引用图片域名
（`R2_PUBLIC_URL/photos/thumb_<hash>.jpg`），后端只在需要鉴权或回退本地文件时才中转。

## 8. 迁移后检查清单

- [ ] `curl http://127.0.0.1:8001/api/photos` 返回 40 张照片
- [ ] `curl -I http://127.0.0.1:3000/gallery` 返回 200
- [ ] 浏览器打开照片详情页，图片经 302 从 `R2_PUBLIC_URL` 配置的端点加载（生产应为自定义域名）
- [ ] 管理员登录（密码随数据库迁移，**不在仓库里**；忘记时只能改库，或删掉该用户行后带
      `ADMIN_PASSWORD` 重跑 `init_db.py` —— 用户已存在时它不会重置密码）
- [ ] 上传一张测试照片 → 本地压缩 → 原图+缩略图进入 R2 → 本地文件被删除

## 9. 常见问题

| 问题 | 解决 |
|---|---|
| 图片 404 / 未重定向 | 检查 `.env` 的 R2 配置；确认 DB 路径是 `r2://` 开头 |
| 上传报错 EXIF 注入失败 | 确认已装 `piexif`（requirements.txt 含） |
| 中文乱码 / 字体问题 | Google Fonts 在部分网络被墙，可改用国内 CDN 或自托管字体文件 |
| 地图瓦片加载慢 | 底图切换器可选高德（国内快）；OSM/CARTO 海外瓦片需网络可达 |
| 端口占用 | 修改 systemd 配置中的端口并 `systemctl daemon-reload` |
