from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db, DATABASE_URL, engine
from app.core.config import settings
from app.schemas.appointment import HealthResponse

router = APIRouter()

@router.get("", response_model=HealthResponse, summary="API & Database health check")
def health_check(db: Session = Depends(get_db)):
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    db_type = engine.dialect.name
    
    # Mask credentials in URL for safety
    masked_url = DATABASE_URL
    if "@" in masked_url:
        prefix = masked_url.split("@")[0]
        suffix = masked_url.split("@")[1]
        protocol = prefix.split("://")[0]
        masked_url = f"{protocol}://***:***@{suffix}"

    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        version=settings.VERSION,
        database_type=db_type,
        database_connected=db_connected,
        database_url_masked=masked_url,
    )
