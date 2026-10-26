import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.service import Service
from app.models.admin_user import AdminUser
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse

router = APIRouter()

@router.get("", response_model=List[ServiceResponse], summary="List all clinical services")
def list_services(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by service name or description"),
    active_only: bool = Query(False, description="Filter only active services"),
    db: Session = Depends(get_db),
):
    query = db.query(Service)
    if active_only:
        query = query.filter(Service.is_active == True)
    if category:
        query = query.filter(Service.category.ilike(f"%{category}%"))
    if search:
        query = query.filter(
            (Service.name.ilike(f"%{search}%")) | (Service.description.ilike(f"%{search}%"))
        )
    
    services = query.order_by(Service.category.asc(), Service.name.asc()).all()
    results = []
    for s in services:
        res = ServiceResponse.model_validate(s)
        res.staff_count = len(s.staff_members)
        results.append(res)
    return results

@router.get("/{service_id}", response_model=ServiceResponse, summary="Get single service details")
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    res = ServiceResponse.model_validate(service)
    res.staff_count = len(service.staff_members)
    return res

@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED, summary="Create a new service")
def create_service(
    service_in: ServiceCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    service = Service(
        name=service_in.name,
        category=service_in.category or "General",
        description=service_in.description or "",
        price=service_in.price,
        min_duration_minutes=service_in.min_duration_minutes,
        max_duration_minutes=service_in.max_duration_minutes,
        image_url=service_in.image_url or "",
        external_link=service_in.external_link or "",
        is_active=service_in.is_active if service_in.is_active is not None else True,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    res = ServiceResponse.model_validate(service)
    res.staff_count = 0
    return res

@router.put("/{service_id}", response_model=ServiceResponse, summary="Update an existing service")
def update_service(
    service_id: int,
    service_in: ServiceUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    update_dict = service_in.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(service, field, val)

    db.commit()
    db.refresh(service)
    res = ServiceResponse.model_validate(service)
    res.staff_count = len(service.staff_members)
    return res

@router.delete("/{service_id}", status_code=status.HTTP_200_OK, summary="Delete a service")
def delete_service(
    service_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    db.delete(service)
    db.commit()
    return {"status": "success", "message": f"Service '{service.name}' removed successfully."}

@router.post("/upload-photo", summary="Upload service photo")
def upload_service_photo(
    file: UploadFile = File(...),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """
    Uploads an image file and stores it in the uploads/services/ directory.
    Returns the static URL path to the file.
    """
    valid_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image file format '{ext}'. Allowed: {', '.join(valid_extensions)}",
        )

    upload_folder = os.path.join(settings.UPLOAD_DIR, "services")
    os.makedirs(upload_folder, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_folder, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return URL format reachable via mounted static directory
    photo_url = f"/uploads/services/{unique_filename}"
    return {
        "status": "success",
        "filename": unique_filename,
        "image_url": photo_url,
    }
