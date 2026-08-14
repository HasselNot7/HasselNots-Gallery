from database import engine, Base, SessionLocal
from models import User
from auth import get_password_hash


def init():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "hasselnot").first()
    if not existing:
        admin = User(
            username="hasselnot",
            hashed_password=get_password_hash("ADMIN_PASSWORD_PLACEHOLDER"),
            is_admin=True,
        )
        db.add(admin)
        db.commit()
        print("Admin user created: hasselnot / ADMIN_PASSWORD_PLACEHOLDER")
    else:
        print("Admin user already exists")

    db.close()


if __name__ == "__main__":
    init()
