import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.staff import Staff
from app.models.service import Service
from app.models.admin_user import AdminUser
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse, ServiceShort

router = APIRouter()

def build_staff_response(staff: Staff) -> StaffResponse:
    res = StaffResponse.model_validate(staff)
    res.services = [ServiceShort.model_validate(s) for s in staff.services]
    res.service_ids = [s.id for s in staff.services]
    return res

@router.get("/", response_model=List[StaffResponse], summary="List all staff members and mapped services")
def list_staff(
    active_only: bool = Query(False, description="Filter only active staff"),
    service_id: Optional[int] = Query(None, description="Filter staff providing a specific service"),
    db: Session = Depends(get_db),
):
    query = db.query(Staff)
    if active_only:
        query = query.filter(Staff.is_active == True)
    
    staff_list = query.order_by(Staff.name.asc()).all()
    
    if service_id:
        staff_list = [s for s in staff_list if any(srv.id == service_id for srv in s.services)]
        
    return [build_staff_response(s) for s in staff_list]

@router.get("/{staff_id}", response_model=StaffResponse, summary="Get single staff profile with services")
def get_staff_member(staff_id: int, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")
    return build_staff_response(staff)

@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED, summary="Create a staff member and map services")
def create_staff_member(
    staff_in: StaffCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    staff = Staff(
        name=staff_in.name,
        title=staff_in.title,
        email=staff_in.email or "",
        phone=staff_in.phone or "",
        bio=staff_in.bio or "",
        avatar_url=staff_in.avatar_url or "",
        is_active=staff_in.is_active if staff_in.is_active is not None else True,
    )
    
    # Map services
    if staff_in.service_ids:
        services = db.query(Service).filter(Service.id.in_(staff_in.service_ids)).all()
        staff.services = services

    db.add(staff)
    db.commit()
    db.refresh(staff)
    return build_staff_response(staff)

@router.put("/{staff_id}", response_model=StaffResponse, summary="Update staff profile and mapped services")
def update_staff_member(
    staff_id: int,
    staff_in: StaffUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

    update_dict = staff_in.model_dump(exclude_unset=True)
    service_ids = update_dict.pop("service_ids", None)

    for field, val in update_dict.items():
        setattr(staff, field, val)

    # Update mapped services if passed
    if service_ids is not None:
        services = db.query(Service).filter(Service.id.in_(service_ids)).all()
        staff.services = services

    db.commit()
    db.refresh(staff)
    return build_staff_response(staff)

@router.delete("/{staff_id}", status_code=status.HTTP_200_OK, summary="Delete a staff member")
def delete_staff_member(
    staff_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found.")

    db.delete(staff)
    db.commit()
    return {"status": "success", "message": f"Staff member '{staff.name}' deleted successfully."}

@router.post("/upload-avatar", summary="Upload staff avatar")
def upload_staff_avatar(
    file: UploadFile = File(...),
    current_admin: AdminUser = Depends(get_current_admin),
):
    valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image file format '{ext}'. Allowed: {', '.join(valid_extensions)}",
        )

    upload_folder = os.path.join(settings.UPLOAD_DIR, "staff")
    os.makedirs(upload_folder, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_folder, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "status": "success",
        "avatar_url": f"/uploads/staff/{unique_filename}",
    }
