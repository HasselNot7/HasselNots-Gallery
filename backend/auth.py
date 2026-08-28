import os
import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import envfile
from database import get_db
from models import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Configure it via environment variable or backend/.env"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_password_hash(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600000)
    return base64.b64encode(salt + dk).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        decoded = base64.b64decode(hashed_password)
    except (ValueError, TypeError):
        return False
    if len(decoded) <= 16:
        return False
    salt = decoded[:16]
    stored_dk = decoded[16:]
    dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt, 600000)
    return hmac.compare_digest(dk, stored_dk)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def user_from_token(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    username: str | None = payload.get("sub")
    if not username:
        return None
    return db.query(User).filter(User.username == username).first()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    return user_from_token(token, db)


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user is None or not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
