import os
import sys

BACKEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings
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

from fastapi.staticfiles import StaticFiles
import os

# Frontend dist folder mount karo agar exist karta hai

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("clinic_bot")
print(settings.DATABASE_URL)
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
# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Top-level webhook route for direct Meta Webhook URLs (e.g. /webhook)
app.include_router(webhook.router, prefix="/webhook", tags=["Meta Webhook (Direct)"])
frontend_dist_path = os.path.join(os.path.dirname(__file__), "../frontend_dist")
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")

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


@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
