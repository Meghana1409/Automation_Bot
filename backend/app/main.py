import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from mangum import Mangum
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router
from app.api.v1.endpoints import webhook
import os
from fastapi.staticfiles import StaticFiles

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("clinic_bot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables are created
    logger.info("Initializing database tables...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    yield
    # Shutdown logic if any
    logger.info("Application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Care & Cure Clinic Management API & WhatsApp AI Receptionist Bot",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)
handler = Mangum(app)

# CORS setup for React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directories exist and mount static files
# os.makedirs(os.path.join(settings.UPLOAD_DIR, "services"), exist_ok=True)
try:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "services"), exist_ok=True)
except OSError:
    # Vercel read-only file system handle karne ke liye
    pass
# os.makedirs(os.path.join(settings.UPLOAD_DIR, "staff"), exist_ok=True)
try:
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "services"), exist_ok=True)
except OSError:
    # Vercel read-only file system handle karne ke liye
    pass

from fastapi.staticfiles import StaticFiles

# Safe check for static files mounting on Vercel (Read-only filesystem)
upload_dir = getattr(settings, "UPLOAD_DIR", "uploads")
if os.path.exists(upload_dir):
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
else:
    # Vercel par uploads folder nahi hota, isliye dummy/bypass ya try-except
    try:
        os.makedirs(upload_dir, exist_ok=True)
        app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
    except Exception:
        pass  # Vercel ke read-only environment mein ignore ho jayega
# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Top-level webhook route for direct Meta Webhook URLs (e.g. /webhook)
app.include_router(webhook.router, prefix="/webhook", tags=["Meta Webhook (Direct)"])

@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online"
    }

from app.database import SessionLocal
from app.models.user import User  # Tera user/admin model jo bhi ho
from app.core.security import hash_password # Password hash karne ke liye

@app.on_event("startup")
def seed_admin_user():
    db = SessionLocal()
    try:
        # Check kar ki hardcoded admin pehle se database mein hai ya nahi
        admin_email = "admin@example.com" # Apne hardcoded wala email yahan daal
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        
        if not existing_admin:
            # Agar nahi hai, toh automatically create kar do
            new_admin = User(
                email=admin_email,
                hashed_password=hash_password("Admin@123"), # Apna password yahan daal
                is_admin=True
            )
            db.add(new_admin)
            db.commit()
    except Exception as e:
        print("Admin seed error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
