import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Clinic WhatsApp Bot & Management API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database URL: default to local SQLite if not provided or empty
    DATABASE_URL: str 
    
    # Meta / WhatsApp Webhook configuration
    META_ACCESS_TOKEN: str = ""
    MY_WEBHOOK_VERIFY_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str 
    
    # AI Providers
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # JWT Authentication
    JWT_SECRET_KEY: str = "clinic_super_secret_jwt_key_2026_antigravity"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Uploads directory
    UPLOAD_DIR: str = "uploads"
    
    # CORS Origins (comma-separated or list)
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Read .env from backend directory, or fallback to root directory
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
