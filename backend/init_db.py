import getpass
import os
from database import engine, Base, SessionLocal
from models import User
from auth import get_password_hash


def init():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "hasselnot").first()
    if not existing:
        admin_password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass(
            "Set admin password for 'hasselnot': "
        )
        if not admin_password:
            raise SystemExit("No password provided")
        admin = User(
            username="hasselnot",
            hashed_password=get_password_hash(admin_password),
            is_admin=True,
        )
        db.add(admin)
        db.commit()
        print("Admin user created: hasselnot (password from env/interactive input)")
    else:
        print("Admin user already exists")

    db.close()


if __name__ == "__main__":
    init()
