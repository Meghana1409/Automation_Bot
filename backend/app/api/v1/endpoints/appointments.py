from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.admin_user import AdminUser
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    SlotCheckResponse,
    AvailableSlotsResponse,
    RescheduleRequest,
    CancelRequest,
    StatusUpdateRequest,
    CompleteRequest,
)
from app.services import appointment_service

router = APIRouter()

@router.get("", response_model=List[AppointmentResponse], summary="List all appointments")
def read_appointments(
    doctor_name: Optional[str] = Query(None, description="Filter by doctor name"),
    staff_id: Optional[int] = Query(None, description="Filter by staff ID"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, confirmed, cancelled)"),
    search: Optional[str] = Query(None, description="Search patient name, phone, notes"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    return appointment_service.get_appointments(
        db=db,
        doctor_name=doctor_name,
        staff_id=staff_id,
        date=date,
        status=status,
        search=search,
        skip=skip,
        limit=limit,
    )

@router.get("/calendar", response_model=List[AppointmentResponse], summary="Get appointments for interactive calendar range")
def read_calendar_appointments(
    start_date: str = Query(..., description="Start date of range (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date of range (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    staff_id: Optional[int] = Query(None, description="Filter by staff ID"),
    db: Session = Depends(get_db),
):
    return appointment_service.get_calendar_appointments(
        db=db,
        start_date=start_date,
        end_date=end_date,
        status=status,
        staff_id=staff_id,
    )

@router.get("/check-slot", response_model=SlotCheckResponse, summary="Check slot availability and capacity")
def check_slot(
    doctor_name: str = Query(..., description="Doctor name, e.g. Dr. Amit Sharma"),
    date: str = Query(..., description="Appointment date, e.g. 2026-10-26"),
    time: str = Query(..., description="Appointment time, e.g. 10:00 AM"),
    db: Session = Depends(get_db),
):
    is_available = appointment_service.check_slot_availability(
        db=db, doctor_name=doctor_name, date=date, time=time
    )
    status_str = "Available" if is_available else "Booked / At Capacity"
    msg = (
        f"Slot with {doctor_name} on {date} at {time} is available."
        if is_available
        else f"Slot with {doctor_name} on {date} at {time} is unavailable or at maximum capacity."
    )
    return SlotCheckResponse(
        doctor_name=doctor_name,
        date=date,
        time=time,
        available=is_available,
        status=status_str,
        message=msg,
    )

@router.get("/available-slots", response_model=AvailableSlotsResponse, summary="Get full slot availability breakdown for a stylist on a given date")
def get_available_slots(
    doctor_name: str = Query(..., description="Stylist or doctor name"),
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    slots = appointment_service.get_slots_breakdown(db=db, doctor_name=doctor_name, date_str=date)
    return AvailableSlotsResponse(
        doctor_name=doctor_name,
        date=date,
        slots=slots,
    )

@router.get("/stats", summary="Get salon appointments statistics and capacity metrics")
def get_stats(db: Session = Depends(get_db)):
    return appointment_service.get_clinic_stats(db=db)

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED, summary="Create an appointment")
def create_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
):
    return appointment_service.book_appointment(db=db, appointment_in=appointment_in)

@router.get("/{appointment_id}", response_model=AppointmentResponse, summary="Get appointment by ID")
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = appointment_service.get_appointment_by_id(db=db, appointment_id=appointment_id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appointment

@router.put("/{appointment_id}/approve", response_model=AppointmentResponse, summary="Approve an appointment request")
def approve_appointment(
    appointment_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    updated = appointment_service.approve_appointment(db=db, appointment_id=appointment_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return updated

@router.put("/{appointment_id}/cancel", response_model=AppointmentResponse, summary="Cancel an appointment with reason")
def cancel_appointment(
    appointment_id: int,
    cancel_in: CancelRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    updated = appointment_service.cancel_appointment(
        db=db, appointment_id=appointment_id, reason=cancel_in.reason
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return updated

@router.put("/{appointment_id}/reschedule", response_model=AppointmentResponse, summary="Reschedule an appointment with capacity validation")
def reschedule_appointment(
    appointment_id: int,
    reschedule_in: RescheduleRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        updated = appointment_service.reschedule_appointment(
            db=db, appointment_id=appointment_id, req=reschedule_in
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return updated

@router.put("/{appointment_id}/complete", response_model=AppointmentResponse, summary="Mark appointment as completed / done")
@router.patch("/{appointment_id}/complete", response_model=AppointmentResponse, summary="Patch appointment as completed / done")
def complete_appointment(
    appointment_id: int,
    complete_in: Optional[CompleteRequest] = None,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    completed_by = complete_in.completed_by if complete_in else None
    notes = complete_in.notes if complete_in else None
    updated = appointment_service.complete_appointment(
        db=db, appointment_id=appointment_id, completed_by=completed_by, notes=notes
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return updated

@router.patch("/{appointment_id}/status", response_model=AppointmentResponse, summary="Patch appointment status and completed_by")
@router.put("/{appointment_id}/status", response_model=AppointmentResponse, summary="Update appointment status and completed_by")
def update_status(
    appointment_id: int,
    status_in: StatusUpdateRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    valid_statuses = {"pending", "approved", "confirmed", "completed", "cancelled", "rescheduled"}
    if status_in.status.lower() not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status_in.status}'. Allowed: {', '.join(valid_statuses)}"
        )
    updated = appointment_service.update_appointment_status(
        db=db,
        appointment_id=appointment_id,
        new_status=status_in.status,
        notes=status_in.notes,
        completed_by=status_in.completed_by,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return updated

@router.delete("/{appointment_id}", status_code=status.HTTP_200_OK, summary="Delete an appointment")
def delete_appointment(
    appointment_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    deleted = appointment_service.delete_appointment(db=db, appointment_id=appointment_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return {"status": "success", "message": f"Appointment #{appointment_id} deleted successfully"}
