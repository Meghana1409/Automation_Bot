import os
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("clinic_db")

def get_database_url() -> str:
    url = settings.DATABASE_URL
    if not url:
        return "sqlite:///./clinic.db"
    # Normalize postgres:// and postgresql:// to postgresql+psycopg2:// for psycopg2 compatibility
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

DATABASE_URL = get_database_url()

def create_configured_engine(url: str):
    is_sqlite = url.startswith("sqlite")
    kwargs = {}
    if is_sqlite:
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_pre_ping"] = True
        kwargs["pool_recycle"] = 300
    return create_engine(url, **kwargs)

try:
    engine = create_configured_engine(DATABASE_URL)
    # Test connection if not SQLite
    if not DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected to PostgreSQL database: {engine.dialect.name}")
except Exception as e:
    logger.warning(
        f"Could not connect to configured DATABASE_URL ({DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}): {e}. "
        "Falling back to local SQLite database (clinic.db)."
    )
    DATABASE_URL = "sqlite:///./clinic.db"
    engine = create_configured_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI Dependency for database session management."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables in the connected database and migrates missing columns."""
    import app.models  # noqa: F401
    from app.core.seed_data import seed_default_data

    try:
        Base.metadata.create_all(bind=engine)
        
        # Check if existing table has missing columns and add them safely
        with engine.connect() as conn:
            inspector = inspect(engine)
            if "appointments" in inspector.get_table_names():
                existing_columns = [col["name"] for col in inspector.get_columns("appointments")]
                
                columns_to_add = [
                    ("patient_phone", "VARCHAR(30) DEFAULT ''"),
                    ("patient_email", "VARCHAR(100) DEFAULT ''"),
                    ("status", "VARCHAR(30) DEFAULT 'confirmed'"),
                    ("staff_id", "INTEGER"),
                    ("service_id", "INTEGER"),
                    ("cancellation_reason", "TEXT DEFAULT ''"),
                    ("reschedule_notes", "TEXT DEFAULT ''"),
                    ("completed_by", "VARCHAR(100) DEFAULT ''"),
                    ("notes", "TEXT DEFAULT ''"),
                    ("created_at", "TIMESTAMP"),
                ]
                for col_name, col_type in columns_to_add:
                    if col_name not in existing_columns:
                        try:
                            conn.execute(text(f"ALTER TABLE appointments ADD COLUMN {col_name} {col_type}"))
                            logger.info(f"Migrated appointments: added column {col_name}")
                        except Exception as ce:
                            logger.warning(f"Could not add column {col_name}: {ce}")
                conn.commit()

        logger.info(f"Database tables initialized and synchronized using {engine.dialect.name}.")
        
        # Seed default data
        db = SessionLocal()
        try:
            seed_default_data(db)
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error initializing/migrating tables: {e}")
        raise e
