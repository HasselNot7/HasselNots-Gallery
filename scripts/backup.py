#!/usr/bin/env python3
"""gallery 数据库与配置备份：SQLite 一致性快照 + tar 打包 + R2 异地存储 + 自动清理"""
import argparse
import datetime as dt
import os
import shutil
import sqlite3
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

KEEP_LOCAL_DAYS = 14
KEEP_R2_DAYS = 30


def load_env(path: Path):
    env = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def sqlite_snapshot(db: Path, dest: Path):
    src = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    dst = sqlite3.connect(dest)
    with dst:
        src.backup(dst)
    src.close()
    dst.close()


def build_tar(backup_dir: Path, env: Path, env_local: Path, db_snap: Path):
    ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    archive = backup_dir / f"gallery_backup_{ts}.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(db_snap, arcname="gallery.db")
        if env.exists():
            tar.add(env, arcname="backend.env")
        if env_local.exists():
            tar.add(env_local, arcname="frontend.env.local")
    return archive


def upload_r2(env: dict, archive: Path):
    account = env.get("R2_ACCOUNT_ID", "")
    ak = env.get("R2_ACCESS_KEY_ID", "")
    sk = env.get("R2_SECRET_ACCESS_KEY", "")
    bucket = env.get("R2_BUCKET", "gallery")
    if not (account and ak and sk):
        print("R2 未配置（缺少密钥），跳过异地备份")
        return False
    import boto3

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=ak,
        aws_secret_access_key=sk,
        region_name="auto",
    )
    key = f"backups/{archive.name}"
    client.upload_file(str(archive), bucket, key)
    print(f"R2 上传成功: {bucket}/{key}")

    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=KEEP_R2_DAYS)
    for obj in client.list_objects_v2(Bucket=bucket, Prefix="backups/").get("Contents", []):
        if obj["LastModified"] < cutoff:
            client.delete_object(Bucket=bucket, Key=obj["Key"])
            print(f"R2 清理旧备份: {obj['Key']}")
    return True


def cleanup_local(backup_dir: Path):
    cutoff = dt.datetime.now() - dt.timedelta(days=KEEP_LOCAL_DAYS)
    for f in backup_dir.glob("gallery_backup_*.tar.gz"):
        try:
            mtime = dt.datetime.fromtimestamp(f.stat().st_mtime)
            if mtime < cutoff:
                f.unlink()
                print(f"本地清理旧备份: {f.name}")
        except OSError:
            pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup-dir", default=str(Path.home() / "backups" / "gallery"))
    args = parser.parse_args()

    backup_dir = Path(args.backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)

    db = ROOT / "backend" / "gallery.db"
    env = ROOT / "backend" / ".env"
    env_local = ROOT / "frontend" / ".env.local"
    if not db.exists():
        print(f"错误: 找不到数据库 {db}")
        sys.exit(1)

    snap = backup_dir / "gallery_snapshot.tmp"
    sqlite_snapshot(db, snap)
    archive = build_tar(backup_dir, env, env_local, snap)
    snap.unlink(missing_ok=True)
    print(f"本地备份完成: {archive} ({archive.stat().st_size / 1024:.1f} KB)")

    upload_r2(load_env(env), archive)
    cleanup_local(backup_dir)


if __name__ == "__main__":
    main()
