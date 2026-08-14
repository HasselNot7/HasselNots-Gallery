# 部署指南

本文档描述如何把 Lens & Light 项目部署到一台新的服务器（以 Ubuntu 22.04/24.04 为例）。

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
vi backend/.env   # 填入 R2 五项配置
```

`.env` 内容：

```bash
R2_ACCOUNT_ID=你的Cloudflare账户ID（32位十六进制）
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=gallery
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
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

```bash
# 终端 1 — 后端 (127.0.0.1:8001)
./start-backend.sh

# 终端 2 — 前端 (127.0.0.1:3000)
./start-frontend.sh
```

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

## 7. 迁移后检查清单

- [ ] `curl http://127.0.0.1:8001/api/photos` 返回 40 张照片
- [ ] `curl -I http://127.0.0.1:3000/gallery` 返回 200
- [ ] 浏览器打开照片详情页，图片从 `pub-xxxx.r2.dev` 加载（302 重定向正常）
- [ ] 管理员登录（账号密码随数据库迁移，若忘记可重跑 `init_db.py` 或改库）
- [ ] 上传一张测试照片 → 本地压缩 → 原图+缩略图进入 R2 → 本地文件被删除

## 8. 常见问题

| 问题 | 解决 |
|---|---|
| 图片 404 / 未重定向 | 检查 `.env` 的 R2 配置；确认 DB 路径是 `r2://` 开头 |
| 上传报错 EXIF 注入失败 | 确认已装 `piexif`（requirements.txt 含） |
| 中文乱码 / 字体问题 | Google Fonts 在部分网络被墙，可改用国内 CDN 或自托管字体文件 |
| 地图瓦片加载慢 | 底图切换器可选高德（国内快）；OSM/CARTO 海外瓦片需网络可达 |
| 端口占用 | 修改 systemd 配置中的端口并 `systemctl daemon-reload` |
