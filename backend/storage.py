"""Cloudflare R2 (S3-compatible) storage layer.

Config via environment variables (or backend/.env):
  R2_ACCOUNT_ID          Cloudflare account ID (from R2 dashboard)
  R2_ACCESS_KEY_ID       R2 API token access key id
  R2_SECRET_ACCESS_KEY   R2 API token secret
  R2_BUCKET              bucket name (default: gallery)
  R2_PUBLIC_URL          base public URL for direct access (r2.dev or custom
                         domain, e.g. https://pub-abc.r2.dev). If empty,
                         presigned URLs are used instead.

When R2 is not configured the app falls back to local storage.
DB paths use the scheme "r2://<key>" for remote objects.
"""
import os
import envfile

R2_PREFIX = "r2://"

ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
ACCESS_KEY = os.environ.get("R2_ACCESS_KEY_ID", "")
SECRET_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
BUCKET = os.environ.get("R2_BUCKET", "gallery")
PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

ENABLED = bool(ACCOUNT_ID and ACCESS_KEY and SECRET_KEY)

_client = None


def get_client():
    global _client
    if not ENABLED:
        return None
    if _client is None:
        import boto3
        _client = boto3.client(
            "s3",
            endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY,
            region_name="auto",
        )
    return _client


def upload_file(local_path: str, key: str) -> str | None:
    """Upload a local file to R2. Returns the r2:// key or None on failure."""
    client = get_client()
    if not client:
        return None
    try:
        client.upload_file(local_path, BUCKET, key)
        return f"{R2_PREFIX}{key}"
    except Exception:
        return None


def delete_object(key: str):
    """Delete a remote object. Path may be a bare key or an r2:// key."""
    if not key:
        return
    client = get_client()
    if not client:
        return
    bare = key[len(R2_PREFIX):] if key.startswith(R2_PREFIX) else key
    try:
        client.delete_object(Bucket=BUCKET, Key=bare)
    except Exception:
        pass


def is_remote(path: str) -> bool:
    return bool(path) and path.startswith(R2_PREFIX)


def public_url(key: str) -> str | None:
    """Direct public URL for a remote key (no auth)."""
    bare = key[len(R2_PREFIX):] if key.startswith(R2_PREFIX) else key
    if PUBLIC_URL:
        return f"{PUBLIC_URL}/{bare}"
    client = get_client()
    if not client:
        return None
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": bare},
            ExpiresIn=3600,
        )
    except Exception:
        return None
