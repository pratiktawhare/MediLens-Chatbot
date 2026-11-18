from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

def get_db_url() -> str:
    raw_url = (settings.database_url_unpooled or settings.database_url or "").strip()
    if not raw_url:
        return settings.sqlite_db_url
    
    # If PostgreSQL, ensure SQLAlchemy uses psycopg v3 driver
    if raw_url.startswith("postgresql://") or raw_url.startswith("postgres://"):
        if not raw_url.startswith("postgresql+psycopg://"):
            if raw_url.startswith("postgresql://"):
                raw_url = raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
            elif raw_url.startswith("postgres://"):
                raw_url = raw_url.replace("postgres://", "postgresql+psycopg://", 1)
        # Clean channel_binding parameter if present
        raw_url = raw_url.replace("&channel_binding=require", "").replace("channel_binding=require&", "").replace("channel_binding=require", "")
    return raw_url

db_url = get_db_url()
is_sqlite = db_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs = {"echo": False, "connect_args": connect_args}
if not is_sqlite:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 300
    })

engine = create_engine(db_url, **engine_kwargs)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
