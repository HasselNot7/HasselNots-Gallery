"""凭据状态盘点：只报状态，永不报值。

给管理后台「API 与密钥」面板用，全部 admin-only。与公开的 GET /api/settings
严格分开：那个端点没有任何认证（见 routes/settings.py 的 get_settings），
机密只要进了 Setting KV 表就会对它原样吐出去。所以这里只输出
configured / length / source 三项间接信息，连一个值的字符都不给。
"""
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

import envfile
import storage
from auth import ALGORITHM, SECRET_KEY, require_admin
from credentials import CREDENTIALS
from database import get_db
from routes.services import _check_carto, _check_r2
from routes.settings import get_setting

router = APIRouter(prefix="/api/secrets", tags=["secrets"])


class VerifyRequest(BaseModel):
    """candidate 允许在保存之前就验证输入框里的值；留空则验证已存的那份。"""

    candidate: str = ""


def _env_state(env_key: str, file_values: dict) -> dict:
    value = os.environ.get(env_key, "")
    if env_key in envfile.INJECTED_KEYS:
        source = "env_file"
    elif env_key in os.environ:
        source = "os_environ"
    else:
        source = "unset"
    return {
        "configured": bool(value),
        "length": len(value),
        "source": source,
        # .env 里明明写了这行却没生效 —— 被同名进程环境变量压住了（envfile 的
        # 「已存在的变量优先」），systemd 里设过变量时改 .env 就是这个症状
        "shadowed": source == "os_environ" and env_key in file_values,
    }


def _db_state(db: Session, key: str) -> dict:
    value = get_setting(db, key)
    return {"configured": bool(value), "length": len(value), "source": "db", "shadowed": False}


@router.get("")
def list_credentials(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    file_values = envfile.read_env_file()
    items = []
    for item in CREDENTIALS:
        state = _db_state(db, item["env_key"]) if item["storage"] == "db" else _env_state(item["env_key"], file_values)
        items.append({**item, **state})
    return {"credentials": items}


def _verify_jwt() -> dict:
    """签一枚一次性 token 再解回来：能往返说明密钥可用且与已签发 token 兼容。"""
    try:
        token = jwt.encode({"sub": "__verify__"}, SECRET_KEY, algorithm=ALGORITHM)
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"ok": True, "detail": "HS256 签发/解析往返成功"}
    except JWTError as e:
        return {"ok": False, "detail": f"解析失败：{type(e).__name__}"}


def _verify_r2() -> dict:
    ok, _ms, detail = _check_r2()
    return {"ok": ok, "detail": detail}


def _verify_carto(candidate: str, db: Session, referer: str) -> dict:
    """referer 用调用方（后台页面）自己的来源：CARTO 的 key 绑域名，
    不带 Referer 时有效 key 也会被 403，验不出真实结果。"""
    key = candidate or get_setting(db, "carto_api_key")
    ok, _ms, detail = _check_carto("light_all", key, referer)
    return {"ok": ok, "detail": detail}


@router.post("/verify/{env_key}")
def verify_credential(
    env_key: str,
    request: Request,
    payload: VerifyRequest | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    item = next((c for c in CREDENTIALS if c["env_key"] == env_key), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"Unknown credential: {env_key}")
    if env_key == "JWT_SECRET_KEY":
        result = _verify_jwt()
    elif env_key.startswith("R2_") and storage.ENABLED:
        result = _verify_r2()
    elif env_key.startswith("R2_"):
        result = {"ok": False, "detail": "R2 未配置，无法验证"}
    elif env_key == "carto_api_key":
        result = _verify_carto(payload.candidate if payload else "", db, request.headers.get("referer", ""))
    else:
        result = {"ok": None, "detail": "纯标识/配置项，无远程端点可探测"}
    return {"env_key": env_key, "label": item["label"], **result}
