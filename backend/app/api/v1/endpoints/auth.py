import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token, get_current_admin
from app.models.admin_user import AdminUser
from app.schemas.auth import LoginRequest, Token, AdminProfile, ChangePasswordRequest

router = APIRouter()
logger = logging.getLogger("auth_api")

@router.post("/login", response_model=Token, summary="Admin Login & JWT Token Generation")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates an administrator using username or email and password.
    Returns a signed JWT bearer token and admin profile.
    """
    ident = login_data.username.strip()
    admin = db.query(AdminUser).filter(
        (AdminUser.username == ident) | (AdminUser.email == ident)
    ).first()

    if not admin or not verify_password(login_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This administrator account is disabled.",
        )

    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": admin.username, "role": admin.role, "id": admin.id},
        expires_delta=expires_delta,
    )

    return Token(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        admin=AdminProfile.model_validate(admin),
    )

@router.get("/me", response_model=AdminProfile, summary="Get current logged-in admin profile")
def get_current_user_profile(current_admin: AdminUser = Depends(get_current_admin)):
    """Returns the profile of the authenticated admin user."""
    return AdminProfile.model_validate(current_admin)

@router.post("/change-password", summary="Change admin password")
def change_password(
    data: ChangePasswordRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Allows authenticated admin to change their password."""
    if not verify_password(data.old_password, current_admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed.",
        )
    current_admin.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"status": "success", "message": "Password updated successfully."}
