from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class LoginRequest(BaseModel):
    username: str = Field(..., description="Admin username or email")
    password: str = Field(..., min_length=1, description="Admin password")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # in seconds
    admin: "AdminProfile"

class AdminProfile(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, description="New password at least 6 characters")
