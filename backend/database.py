import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# 基于本文件位置解析，避免从其他目录运行脚本时在错误位置创建空库
DATABASE_URL = f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gallery.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
