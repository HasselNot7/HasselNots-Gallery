import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import LoginRequest, Token, AdminCreate, UserOut
from auth import verify_password, create_access_token, get_current_user, require_admin, get_password_hash

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 登录限速：15 分钟窗口内最多 5 次失败，超过后锁定到窗口结束
_MAX_FAILURES = 5
_WINDOW_SECONDS = 900
_failures: dict[str, list[float]] = {}


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _remaining_lockout(ip: str) -> int:
    now = time.time()
    attempts = [t for t in _failures.get(ip, []) if now - t < _WINDOW_SECONDS]
    _failures[ip] = attempts
    if len(attempts) >= _MAX_FAILURES:
        return int(_WINDOW_SECONDS - (now - attempts[0])) + 1
    return 0


@router.post("/login", response_model=Token)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = _client_ip(request)
    lockout = _remaining_lockout(ip)
    if lockout > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {max(lockout, 1)} seconds.",
            headers={"Retry-After": str(max(lockout, 1))},
        )

    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        _failures.setdefault(ip, []).append(time.time())
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not authorized yet. Please wait for admin approval.",
        )

    _failures.pop(ip, None)
    token = create_access_token(data={"sub": user.username})
    return Token(access_token=token, token_type="bearer")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return {"id": current_user.id, "username": current_user.username, "is_admin": current_user.is_admin}


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(User).order_by(User.id).all()


@router.post("/register", response_model=UserOut)
def register(
    payload: AdminCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    ip = _client_ip(request)
    lockout = _remaining_lockout(ip)
    if lockout > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many attempts. Try again in {max(lockout, 1)} seconds.",
            headers={"Retry-After": str(max(lockout, 1))},
        )
    username = payload.username.strip()
    if not username or len(payload.password) < 6:
        _failures.setdefault(ip, []).append(time.time())
        raise HTTPException(status_code=400, detail="Username required, password at least 6 chars")
    if db.query(User).filter(User.username == username).first():
        _failures.setdefault(ip, []).append(time.time())
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=username, hashed_password=get_password_hash(payload.password), is_admin=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/grant", response_model=UserOut)
def grant_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/users", response_model=UserOut)
def create_user(
    payload: AdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    username = payload.username.strip()
    if not username or len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Username required, password at least 6 chars")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=username, hashed_password=get_password_hash(payload.password), is_admin=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}
