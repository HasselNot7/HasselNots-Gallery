# 备份脚本使用说明

`scripts/backup.sh`（实际逻辑在 `scripts/backup.py`）用于备份 Lens & Light 的核心数据：数据库、环境配置，并同步到 Cloudflare R2 私有桶实现异地冗余。

## 备份内容

打包进一个 `gallery_backup_YYYYMMDD_HHMMSS.tar.gz`：

| 文件 | 说明 |
|---|---|
| `gallery.db` | SQLite 数据库（照片记录、文章、评论、管理员账号等）——**通过 SQLite 在线备份 API 生成一致性快照**，即使站点正在写入也不会损坏 |
| `backend.env` | 后端密钥（R2 配置、ADMIN_PASSWORD） |
| `frontend.env.local` | 前端环境变量（NEXT_PUBLIC_SITE_URL） |

> 照片本体不在备份内——它们已存于 Cloudflare R2（桶 `gallery`），不属于易失数据。

## 存储位置

- **本地**：`~/backups/gallery/`（保留最近 14 天，自动清理）
- **异地**：R2 私有桶 `gallery-backup`（保留最近 30 天，自动清理）

> R2 备份桶 `gallery-backup` 是**私有桶**，未开启公开访问，只能通过 API 凭据访问——不会像照片桶那样经 r2.dev 子域被公开读取。

## 使用

```bash
# 手动执行一次
scripts/backup.sh

# 指定备份目录（默认 ~/backups/gallery）
scripts/backup.sh --backup-dir /data/backups
```

脚本会自动选择 Python 解释器：优先使用 `backend/.venv/bin/python`（含 boto3），否则回退系统 `python3`（此时 R2 上传会跳过）。

## 定时任务

本机与服务器均已配置 crontab，每日 03:00 自动执行：

```bash
0 3 * * * /path/to/gallery/scripts/backup.sh >> ~/backups/gallery/backup.log 2>&1
```

查看配置：`crontab -l | grep gallery`

## 恢复

1. 解包备份：`tar xzf gallery_backup_20260815_030000.tar.gz`
2. 得到 `gallery.db`、`backend.env`、`frontend.env.local`
3. 停服后覆盖对应文件：
   - `gallery.db` → `backend/gallery.db`
   - `backend.env` → `backend/.env`
   - `frontend.env.local` → `frontend/.env.local`
4. 重启服务（systemd：`systemctl restart gallery-backend gallery-frontend`）

> 恢复前先备份当前的数据库，确认无误后再替换。

## R2 配置要求

备份上传依赖 `backend/.env` 中的 R2 凭据（与照片存储共用）：

```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BACKUP_BUCKET=gallery-backup   # 可选，默认 gallery-backup
```

未配置凭据时脚本仍会完成本地备份并跳过 R2 上传（有提示）。
