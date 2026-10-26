import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.schedule import BookingCapacity, WorkingHours, Holiday
from app.models.appointment import Appointment
from app.models.admin_user import AdminUser
from app.schemas.schedule import (
    CapacityUpdate,
    CapacityResponse,
    DateOccupancyResponse,
    HourSlotOccupancy,
)

router = APIRouter()

@router.get("/", response_model=CapacityResponse, summary="Get booking capacity settings")
def get_capacity_settings(db: Session = Depends(get_db)):
    capacity = db.query(BookingCapacity).first()
    if not capacity:
        capacity = BookingCapacity(max_bookings_per_hour=4, slot_duration_minutes=60)
        db.add(capacity)
        db.commit()
        db.refresh(capacity)
    return capacity

@router.put("", response_model=CapacityResponse, summary="Update booking capacity limit")
def update_capacity_settings(
    cap_in: CapacityUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    capacity = db.query(BookingCapacity).first()
    if not capacity:
        capacity = BookingCapacity()
        db.add(capacity)

    capacity.max_bookings_per_hour = cap_in.max_bookings_per_hour
    capacity.slot_duration_minutes = cap_in.slot_duration_minutes or 60
    capacity.allow_overbooking = cap_in.allow_overbooking or False
    if cap_in.notes is not None:
        capacity.notes = cap_in.notes

    db.commit()
    db.refresh(capacity)
    return capacity

@router.get("/occupancy", response_model=DateOccupancyResponse, summary="Get live hourly slot occupancy for a date")
def get_date_occupancy(
    date_str: Optional[str] = Query(None, description="Date in YYYY-MM-DD (defaults to today)"),
    db: Session = Depends(get_db),
):
    """
    Computes real-time hourly occupancy for a specified date based on:
    - Maximum bookings per hour limit
    - Daily working hours & break intervals
    - Clinic holidays
    - Active appointments booked per hour
    """
    if not date_str:
        date_str = datetime.date.today().strftime("%Y-%m-%d")

    try:
        parsed_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    # Day of week: 0=Monday, 6=Sunday
    weekday = parsed_date.weekday()
    day_name = parsed_date.strftime("%A")

    # 1. Fetch capacity limit
    cap = db.query(BookingCapacity).first()
    max_per_hour = cap.max_bookings_per_hour if cap else 4

    # 2. Check if holiday
    holiday = db.query(Holiday).filter(Holiday.holiday_date == date_str).first()
    is_holiday = holiday is not None
    holiday_name = holiday.name if holiday else None

    # 3. Check working hours
    wh = db.query(WorkingHours).filter(WorkingHours.day_of_week == weekday).first()
    is_open = wh.is_open if wh else (weekday != 6)

    open_hour = 9
    close_hour = 21
    break_start_hour = 13
    break_end_hour = 14

    if wh and wh.open_time:
        try:
            open_hour = int(wh.open_time.split(":")[0])
        except Exception:
            pass
    if wh and wh.close_time:
        try:
            close_hour = int(wh.close_time.split(":")[0])
        except Exception:
            pass
    if wh and wh.break_start:
        try:
            break_start_hour = int(wh.break_start.split(":")[0])
        except Exception:
            pass
    if wh and wh.break_end:
        try:
            break_end_hour = int(wh.break_end.split(":")[0])
        except Exception:
            pass

    # 4. Fetch all active appointments on this date
    apps = db.query(Appointment).filter(
        Appointment.appointment_date == date_str,
        Appointment.status.notin_(["cancelled"]),
    ).all()

    total_bookings = len(apps)

    # Map bookings to hours
    hourly_counts = {h: 0 for h in range(open_hour, close_hour)}

    for app in apps:
        # appointment_time can be e.g. "10:00 AM", "14:30", "10:00"
        t_str = app.appointment_time.strip().upper()
        hour_found = None
        try:
            if "AM" in t_str or "PM" in t_str:
                dt = datetime.datetime.strptime(t_str, "%I:%M %p")
                hour_found = dt.hour
            else:
                hour_found = int(t_str.split(":")[0])
        except Exception:
            # Fallback parsing
            import re
            m = re.search(r"(\d{1,2})", t_str)
            if m:
                hour_found = int(m.group(1))
                if "PM" in t_str and hour_found < 12:
                    hour_found += 12

        if hour_found is not None and hour_found in hourly_counts:
            hourly_counts[hour_found] += 1

    # 5. Build slot occupancy list
    slots = []
    for h in range(open_hour, close_hour):
        h_next = h + 1
        label = f"{h:02d}:00 - {h_next:02d}:00"
        booked = hourly_counts.get(h, 0)
        is_break = (break_start_hour <= h < break_end_hour) if wh and wh.break_start else False
        is_closed = not is_open or is_holiday
        is_full = (booked >= max_per_hour) or is_closed or is_break
        pct = round(min(100.0, (booked / max_per_hour) * 100), 1) if max_per_hour > 0 else 100.0

        slots.append(
            HourSlotOccupancy(
                hour=h,
                time_label=label,
                booked_count=booked,
                max_capacity=max_per_hour,
                is_full=is_full,
                is_break=is_break,
                is_closed=is_closed,
                percentage=pct,
            )
        )

    return DateOccupancyResponse(
        date=date_str,
        day_name=day_name,
        is_clinic_open=is_open and not is_holiday,
        is_holiday=is_holiday,
        holiday_name=holiday_name,
        max_bookings_per_hour=max_per_hour,
        total_bookings=total_bookings,
        slots=slots,
    )
