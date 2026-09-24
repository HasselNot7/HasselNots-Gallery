"""Load backend/.env into os.environ (existing variables take precedence)."""
import os

ENV_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

#: load_env_file() 实际写入的键。用于区分「值来自 .env」和「值来自进程环境」——
#: systemd 里的变量会压过 .env（见下方 not in os.environ），排障时这是关键线索。
INJECTED_KEYS: set[str] = set()


def read_env_file() -> dict[str, str]:
    """解析 backend/.env，返回键值字典。文件不存在时返回空字典。"""
    parsed: dict[str, str] = {}
    if not os.path.exists(ENV_FILE_PATH):
        return parsed
    with open(ENV_FILE_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                parsed[key] = value
    return parsed


def load_env_file() -> None:
    for key, value in read_env_file().items():
        if key not in os.environ:
            os.environ[key] = value
            INJECTED_KEYS.add(key)


load_env_file()
