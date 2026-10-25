from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.schedule import WorkingHours, Holiday
from app.models.admin_user import AdminUser
from app.schemas.schedule import (
    WorkingHoursItem,
    WorkingHoursBatchUpdate,
    HolidayCreate,
    HolidayResponse,
)

router = APIRouter()

@router.get("/working-hours", response_model=List[WorkingHoursItem], summary="Get 7-day working hours schedule")
def get_working_hours(db: Session = Depends(get_db)):
    hours = db.query(WorkingHours).order_by(WorkingHours.day_of_week.asc()).all()
    return hours

@router.put("/working-hours", response_model=List[WorkingHoursItem], summary="Batch update weekly working hours")
def update_working_hours(
    batch: WorkingHoursBatchUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    for item in batch.hours:
        record = db.query(WorkingHours).filter(WorkingHours.day_of_week == item.day_of_week).first()
        if record:
            record.day_name = item.day_name
            record.is_open = item.is_open
            record.open_time = item.open_time
            record.close_time = item.close_time
            record.break_start = item.break_start or ""
            record.break_end = item.break_end or ""
        else:
            new_record = WorkingHours(
                day_of_week=item.day_of_week,
                day_name=item.day_name,
                is_open=item.is_open,
                open_time=item.open_time,
                close_time=item.close_time,
                break_start=item.break_start or "",
                break_end=item.break_end or "",
            )
            db.add(new_record)
    
    db.commit()
    return db.query(WorkingHours).order_by(WorkingHours.day_of_week.asc()).all()

@router.get("/holidays", response_model=List[HolidayResponse], summary="List clinic holidays")
def list_holidays(db: Session = Depends(get_db)):
    return db.query(Holiday).order_by(Holiday.holiday_date.asc()).all()

@router.post("/holidays", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED, summary="Add a clinic holiday")
def add_holiday(
    holiday_in: HolidayCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Holiday).filter(Holiday.holiday_date == holiday_in.holiday_date).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Holiday for date '{holiday_in.holiday_date}' already exists ({existing.name}).",
        )

    holiday = Holiday(
        holiday_date=holiday_in.holiday_date,
        name=holiday_in.name,
        is_recurring=holiday_in.is_recurring or False,
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday

@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_200_OK, summary="Delete a clinic holiday")
def delete_holiday(
    holiday_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holiday not found.")

    db.delete(holiday)
    db.commit()
    return {"status": "success", "message": f"Holiday '{holiday.name}' removed."}
