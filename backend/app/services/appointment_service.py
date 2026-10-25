import re
import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException

from app.models.appointment import Appointment
from app.models.schedule import BookingCapacity, Holiday, WorkingHours
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, RescheduleRequest, CancelRequest

STANDARD_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"
]

def parse_hour_from_time_str(time_str: str) -> Optional[int]:
    """Helper to extract the 24-hr hour component from strings like '10:00 AM' or '14:30'."""
    t_str = time_str.strip().upper()
    try:
        if "AM" in t_str or "PM" in t_str:
            dt = datetime.datetime.strptime(t_str, "%I:%M %p")
            return dt.hour
        parts = t_str.split(":")
        return int(parts[0])
    except Exception:
        m = re.search(r"(\d{1,2})", t_str)
        if m:
            val = int(m.group(1))
            if "PM" in t_str and val < 12:
                val += 12
            return val
    return None

def parse_slot_time_minutes(time_str: str) -> Optional[int]:
    """Helper to extract total minutes from midnight for strings like '10:30 AM' or '14:30'."""
    t_str = time_str.strip().upper()
    try:
        if "AM" in t_str or "PM" in t_str:
            dt = datetime.datetime.strptime(t_str, "%I:%M %p")
            return dt.hour * 60 + dt.minute
        parts = t_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        m = re.search(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", t_str)
        if m:
            h = int(m.group(1))
            minute = int(m.group(2))
            ampm = m.group(3)
            if ampm == "PM" and h < 12:
                h += 12
            elif ampm == "AM" and h == 12:
                h = 0
            return h * 60 + minute
    return None

def generate_slots_for_hours(
    open_time: str = "09:00",
    close_time: str = "20:00",
    break_start: Optional[str] = "13:00",
    break_end: Optional[str] = "14:00"
) -> List[str]:
    """
    Generates standard 30-minute intervals from open_time up to close_time,
    strictly respecting the day's closing time and filtering out break hours.
    """
    open_mins = parse_slot_time_minutes(open_time) if open_time else 540
    close_mins = parse_slot_time_minutes(close_time) if close_time else 1200
    b_start = parse_slot_time_minutes(break_start) if break_start else None
    b_end = parse_slot_time_minutes(break_end) if break_end else None

    if open_mins is None or close_mins is None:
        open_mins = 540
        close_mins = 1200

    slots = []
    curr = open_mins
    # Only slots where curr <= close_mins are generated; strictly NO slots after closing time
    while curr <= close_mins:
        # Exclude slots falling within break interval [b_start, b_end)
        if b_start is not None and b_end is not None and b_start <= curr < b_end:
            curr += 30
            continue

        h = curr // 60
        m = curr % 60
        ampm = "AM" if h < 12 else "PM"
        display_h = h if h <= 12 else h - 12
        if display_h == 0:
            display_h = 12
        slot_str = f"{display_h:02d}:{m:02d} {ampm}"
        slots.append(slot_str)
        curr += 30

    return slots

def get_slots_breakdown(db: Session, doctor_name: str, date_str: str) -> List[Dict[str, Any]]:
    """Returns availability and status for day-specific slots respecting operating, break, and closing hours."""
    try:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        weekday = dt.weekday()
    except Exception:
        weekday = 0

    # 1. Fetch working hours for this specific day of week
    wh = db.query(WorkingHours).filter(WorkingHours.day_of_week == weekday).first()
    if wh and not wh.is_open:
        # Salon is closed on this day, no slots available
        return []

    open_time = wh.open_time if (wh and wh.open_time) else "09:00"
    close_time = wh.close_time if (wh and wh.close_time) else "20:00"
    break_start = wh.break_start if (wh and wh.break_start) else None
    break_end = wh.break_end if (wh and wh.break_end) else None

    # Generate candidate slots strictly within working hours range, filtering out after close_time and break hours
    day_slots = generate_slots_for_hours(open_time, close_time, break_start, break_end)

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    now = datetime.datetime.now()
    curr_mins = now.hour * 60 + now.minute

    # Fetch all existing non-cancelled bookings for this date and doctor
    existing_apps = db.query(Appointment).filter(
        Appointment.doctor_name.ilike(f"%{doctor_name}%"),
        Appointment.appointment_date == date_str,
        Appointment.status.notin_(["cancelled"]),
    ).all()
    booked_times = {a.appointment_time.strip().upper() for a in existing_apps}

    # Fetch capacity limit
    cap = db.query(BookingCapacity).first()
    max_per_hour = cap.max_bookings_per_hour if cap else 6
    allow_overbooking = cap.allow_overbooking if cap else False

    # Fetch hourly counts for this date
    all_apps_date = db.query(Appointment).filter(
        Appointment.appointment_date == date_str,
        Appointment.status.notin_(["cancelled"]),
    ).all()
    hourly_counts = {}
    for a in all_apps_date:
        h = parse_hour_from_time_str(a.appointment_time)
        if h is not None:
            hourly_counts[h] = hourly_counts.get(h, 0) + 1

    results = []
    for slot in day_slots:
        slot_upper = slot.strip().upper()
        slot_mins = parse_slot_time_minutes(slot)

        # 1. Past date check
        if date_str < today_str:
            results.append({
                "time": slot,
                "available": False,
                "status": "passed",
                "label": "Passed",
            })
            continue

        # 2. Past time slot on today
        if date_str == today_str and slot_mins is not None and slot_mins <= curr_mins:
            results.append({
                "time": slot,
                "available": False,
                "status": "passed",
                "label": "Passed",
            })
            continue

        # 3. Already booked or pending for this stylist
        if slot_upper in booked_times:
            results.append({
                "time": slot,
                "available": False,
                "status": "booked",
                "label": "Already Booked / Unavailable",
            })
            continue

        # 4. Hourly capacity check
        target_hour = parse_hour_from_time_str(slot)
        if not allow_overbooking and target_hour is not None and hourly_counts.get(target_hour, 0) >= max_per_hour:
            results.append({
                "time": slot,
                "available": False,
                "status": "capacity_full",
                "label": "Salon Capacity Full",
            })
            continue

        results.append({
            "time": slot,
            "available": True,
            "status": "available",
            "label": "Available",
        })

    return results

def check_capacity_for_slot(db: Session, date_str: str, time_str: str) -> bool:
    """
    Returns True if slot is within hourly booking capacity limit.
    Returns False if slot is FULL.
    """
    cap = db.query(BookingCapacity).first()
    max_per_hour = cap.max_bookings_per_hour if cap else 4
    allow_overbooking = cap.allow_overbooking if cap else False

    if allow_overbooking:
        return True

    target_hour = parse_hour_from_time_str(time_str)
    if target_hour is None:
        return True

    # Count existing active bookings for that date
    apps = db.query(Appointment).filter(
        Appointment.appointment_date == date_str,
        Appointment.status.notin_(["cancelled"]),
    ).all()

    hour_count = 0
    for a in apps:
        h = parse_hour_from_time_str(a.appointment_time)
        if h == target_hour:
            hour_count += 1

    return hour_count < max_per_hour

def get_appointments(
    db: Session,
    doctor_name: Optional[str] = None,
    staff_id: Optional[int] = None,
    date: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Appointment]:
    query = db.query(Appointment)
    if doctor_name:
        query = query.filter(Appointment.doctor_name.ilike(f"%{doctor_name}%"))
    if staff_id:
        query = query.filter(Appointment.staff_id == staff_id)
    if date:
        query = query.filter(Appointment.appointment_date == date)
    if status and status != "all":
        query = query.filter(Appointment.status == status)
    if search:
        query = query.filter(
            or_(
                Appointment.patient_name.ilike(f"%{search}%"),
                Appointment.patient_phone.ilike(f"%{search}%"),
                Appointment.patient_email.ilike(f"%{search}%"),
                Appointment.doctor_name.ilike(f"%{search}%"),
                Appointment.notes.ilike(f"%{search}%"),
            )
        )
    return query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.asc()).offset(skip).limit(limit).all()

def get_calendar_appointments(
    db: Session,
    start_date: str,
    end_date: str,
    status: Optional[str] = None,
    staff_id: Optional[int] = None,
) -> List[Appointment]:
    query = db.query(Appointment).filter(
        Appointment.appointment_date >= start_date,
        Appointment.appointment_date <= end_date,
    )
    if status and status != "all":
        query = query.filter(Appointment.status == status)
    if staff_id:
        query = query.filter(Appointment.staff_id == staff_id)
    return query.order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc()).all()

def get_appointment_by_id(db: Session, appointment_id: int) -> Optional[Appointment]:
    return db.query(Appointment).filter(Appointment.id == appointment_id).first()

def check_slot_availability(
    db: Session,
    doctor_name: str,
    date: str,
    time: str
) -> bool:
    """
    Returns True if slot is available (within day's working hours, not in past, no conflicting booking with doctor AND within capacity).
    """
    try:
        dt = datetime.datetime.strptime(date, "%Y-%m-%d")
        weekday = dt.weekday()
    except Exception:
        weekday = 0

    # 1. Check day-specific working hours (open, close, break)
    wh = db.query(WorkingHours).filter(WorkingHours.day_of_week == weekday).first()
    if wh and not wh.is_open:
        return False

    slot_mins = parse_slot_time_minutes(time)
    if slot_mins is not None and wh:
        open_mins = parse_slot_time_minutes(wh.open_time) if wh.open_time else 540
        close_mins = parse_slot_time_minutes(wh.close_time) if wh.close_time else 1200
        if open_mins is not None and slot_mins < open_mins:
            return False
        if close_mins is not None and slot_mins > close_mins:
            return False
        if wh.break_start and wh.break_end:
            b_start = parse_slot_time_minutes(wh.break_start)
            b_end = parse_slot_time_minutes(wh.break_end)
            if b_start is not None and b_end is not None and b_start <= slot_mins < b_end:
                return False

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    if date < today_str:
        return False

    if date == today_str:
        if slot_mins is not None:
            now = datetime.datetime.now()
            curr_mins = now.hour * 60 + now.minute
            if slot_mins <= curr_mins:
                return False

    existing = db.query(Appointment).filter(
        Appointment.doctor_name.ilike(f"%{doctor_name}%"),
        Appointment.appointment_date == date,
        Appointment.appointment_time == time,
        Appointment.status.notin_(["cancelled"]),
    ).first()

    if existing is not None:
        return False

    return check_capacity_for_slot(db, date, time)

def book_appointment(db: Session, appointment_in: AppointmentCreate) -> Appointment:
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    if appointment_in.appointment_date < today_str:
        raise HTTPException(
            status_code=400,
            detail="Cannot book appointments for past dates. Please select today or a future date."
        )

    slot_mins = parse_slot_time_minutes(appointment_in.appointment_time)

    # 1. Day-specific working hours validation
    try:
        dt = datetime.datetime.strptime(appointment_in.appointment_date, "%Y-%m-%d")
        weekday = dt.weekday()
    except Exception:
        weekday = 0

    wh = db.query(WorkingHours).filter(WorkingHours.day_of_week == weekday).first()
    if wh and not wh.is_open:
        raise HTTPException(
            status_code=400,
            detail=f"The salon is closed on {wh.day_name}s according to the weekly operating schedule."
        )

    if slot_mins is not None and wh:
        open_mins = parse_slot_time_minutes(wh.open_time) if wh.open_time else 540
        close_mins = parse_slot_time_minutes(wh.close_time) if wh.close_time else 1200
        if open_mins is not None and slot_mins < open_mins:
            raise HTTPException(
                status_code=400,
                detail=f"Time slot '{appointment_in.appointment_time}' is before salon opening time ({wh.open_time}) on {wh.day_name}s."
            )
        if close_mins is not None and slot_mins > close_mins:
            raise HTTPException(
                status_code=400,
                detail=f"Time slot '{appointment_in.appointment_time}' is after salon closing time ({wh.close_time}) on {wh.day_name}s."
            )
        if wh.break_start and wh.break_end:
            b_start = parse_slot_time_minutes(wh.break_start)
            b_end = parse_slot_time_minutes(wh.break_end)
            if b_start is not None and b_end is not None and b_start <= slot_mins < b_end:
                raise HTTPException(
                    status_code=400,
                    detail=f"Time slot '{appointment_in.appointment_time}' falls during salon break hours ({wh.break_start} - {wh.break_end}) on {wh.day_name}s."
                )

    if appointment_in.appointment_date == today_str:
        if slot_mins is not None:
            now = datetime.datetime.now()
            curr_mins = now.hour * 60 + now.minute
            if slot_mins <= curr_mins:
                raise HTTPException(
                    status_code=400,
                    detail=f"Time slot '{appointment_in.appointment_time}' has already passed for today. Please select an upcoming slot."
                )

    conflicting = db.query(Appointment).filter(
        Appointment.doctor_name.ilike(f"%{appointment_in.doctor_name}%"),
        Appointment.appointment_date == appointment_in.appointment_date,
        Appointment.appointment_time == appointment_in.appointment_time,
        Appointment.status.notin_(["cancelled"]),
    ).first()
    if conflicting:
        raise HTTPException(
            status_code=409,
            detail=f"Slot with {appointment_in.doctor_name} at {appointment_in.appointment_time} on {appointment_in.appointment_date} is already booked or awaiting approval."
        )

    if not check_capacity_for_slot(db, appointment_in.appointment_date, appointment_in.appointment_time):
        raise HTTPException(
            status_code=409,
            detail=f"Hourly salon booking capacity limit reached for {appointment_in.appointment_time} on {appointment_in.appointment_date}."
        )

    primary_service_id = appointment_in.service_id
    if not primary_service_id and appointment_in.service_ids and len(appointment_in.service_ids) > 0:
        primary_service_id = appointment_in.service_ids[0]

    staff_id = appointment_in.staff_id
    if not staff_id and appointment_in.doctor_name:
        from app.models.staff import Staff
        st = db.query(Staff).filter(Staff.name.ilike(f"%{appointment_in.doctor_name}%")).first()
        if st:
            staff_id = st.id

    db_appointment = Appointment(
        patient_name=appointment_in.patient_name,
        patient_phone=appointment_in.patient_phone or "",
        patient_email=appointment_in.patient_email or "",
        doctor_name=appointment_in.doctor_name,
        staff_id=staff_id,
        service_id=primary_service_id,
        appointment_date=appointment_in.appointment_date,
        appointment_time=appointment_in.appointment_time,
        status=appointment_in.status or "pending",
        notes=appointment_in.notes or "",
        created_at=datetime.datetime.utcnow(),
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def approve_appointment(db: Session, appointment_id: int) -> Optional[Appointment]:
    appointment = get_appointment_by_id(db, appointment_id)
    if not appointment:
        return None
    appointment.status = "approved"
    db.commit()
    db.refresh(appointment)
    return appointment

def cancel_appointment(db: Session, appointment_id: int, reason: str) -> Optional[Appointment]:
    appointment = get_appointment_by_id(db, appointment_id)
    if not appointment:
        return None
    appointment.status = "cancelled"
    appointment.cancellation_reason = reason
    db.commit()
    db.refresh(appointment)
    return appointment

def complete_appointment(
    db: Session,
    appointment_id: int,
    completed_by: Optional[str] = None,
    notes: Optional[str] = None,
) -> Optional[Appointment]:
    """Marks an appointment as completed / done, saving the staff member who completed it."""
    appointment = get_appointment_by_id(db, appointment_id)
    if not appointment:
        return None
    appointment.status = "completed"
    if completed_by:
        appointment.completed_by = str(completed_by).strip()
    if notes:
        appointment.notes = f"{appointment.notes or ''} | {notes}".strip(" |")
    db.commit()
    db.refresh(appointment)
    return appointment

def update_appointment_status(
    db: Session,
    appointment_id: int,
    new_status: str,
    notes: Optional[str] = None,
    completed_by: Optional[str] = None,
) -> Optional[Appointment]:
    """Updates appointment status smoothly and records completed_by if provided."""
    appointment = get_appointment_by_id(db, appointment_id)
    if not appointment:
        return None
    appointment.status = new_status.lower()
    if completed_by:
        appointment.completed_by = str(completed_by).strip()
    if notes:
        appointment.notes = f"{appointment.notes or ''} | {notes}".strip(" |")
    db.commit()
    db.refresh(appointment)
    return appointment

def reschedule_appointment(
    db: Session,
    appointment_id: int,
    req: RescheduleRequest,
) -> Optional[Appointment]:
    appointment = get_appointment_by_id(db, appointment_id)
    if not appointment:
        return None

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    if req.new_date < today_str:
        raise ValueError("Cannot reschedule appointments to past dates. Please select today or a future date.")

    slot_mins = parse_slot_time_minutes(req.new_time)

    # 1. Day-specific working hours validation
    try:
        dt = datetime.datetime.strptime(req.new_date, "%Y-%m-%d")
        weekday = dt.weekday()
    except Exception:
        weekday = 0

    wh = db.query(WorkingHours).filter(WorkingHours.day_of_week == weekday).first()
    if wh and not wh.is_open:
        raise ValueError(f"The salon is closed on {wh.day_name}s according to the weekly operating schedule.")

    if slot_mins is not None and wh:
        open_mins = parse_slot_time_minutes(wh.open_time) if wh.open_time else 540
        close_mins = parse_slot_time_minutes(wh.close_time) if wh.close_time else 1200
        if open_mins is not None and slot_mins < open_mins:
            raise ValueError(f"Time slot '{req.new_time}' is before salon opening time ({wh.open_time}) on {wh.day_name}s.")
        if close_mins is not None and slot_mins > close_mins:
            raise ValueError(f"Time slot '{req.new_time}' is after salon closing time ({wh.close_time}) on {wh.day_name}s.")
        if wh.break_start and wh.break_end:
            b_start = parse_slot_time_minutes(wh.break_start)
            b_end = parse_slot_time_minutes(wh.break_end)
            if b_start is not None and b_end is not None and b_start <= slot_mins < b_end:
                raise ValueError(f"Time slot '{req.new_time}' falls during salon break hours ({wh.break_start} - {wh.break_end}) on {wh.day_name}s.")

    if req.new_date == today_str:
        if slot_mins is not None:
            now = datetime.datetime.now()
            curr_mins = now.hour * 60 + now.minute
            if slot_mins <= curr_mins:
                raise ValueError(f"Time slot '{req.new_time}' has already passed for today. Please select an upcoming slot.")

    conflict = db.query(Appointment).filter(
        Appointment.id != appointment_id,
        Appointment.doctor_name == appointment.doctor_name,
        Appointment.appointment_date == req.new_date,
        Appointment.appointment_time == req.new_time,
        Appointment.status.notin_(["cancelled"]),
    ).first()
    if conflict:
        raise ValueError(f"Slot with {appointment.doctor_name} at {req.new_time} on {req.new_date} is already booked or awaiting approval.")

    # Check capacity limit for the new slot
    has_capacity = check_capacity_for_slot(db, req.new_date, req.new_time)
    if not has_capacity:
        raise ValueError(f"Target slot on {req.new_date} at {req.new_time} has reached maximum hourly capacity.")

    old_date = appointment.appointment_date
    old_time = appointment.appointment_time
    appointment.appointment_date = req.new_date
    appointment.appointment_time = req.new_time
    appointment.status = "rescheduled"
    appointment.reschedule_notes = f"Rescheduled from {old_date} {old_time}. {req.reason or ''}".strip()

    db.commit()
    db.refresh(appointment)
    return appointment

def delete_appointment(db: Session, appointment_id: int) -> bool:
    appointment = get_appointment_by_id(db, appointment_id)
    if not appointment:
        return False
    db.delete(appointment)
    db.commit()
    return True

def get_clinic_stats(db: Session) -> dict:
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    today_appointments = db.query(func.count(Appointment.id)).filter(
        Appointment.appointment_date == today_str
    ).scalar() or 0

    pending_count = db.query(func.count(Appointment.id)).filter(
        Appointment.status == "pending"
    ).scalar() or 0

    approved_count = db.query(func.count(Appointment.id)).filter(
        Appointment.status.in_(["approved", "confirmed"])
    ).scalar() or 0

    cancelled_count = db.query(func.count(Appointment.id)).filter(
        Appointment.status == "cancelled"
    ).scalar() or 0

    completed_count = db.query(func.count(Appointment.id)).filter(
        Appointment.status == "completed"
    ).scalar() or 0

    # Hourly capacity status for today
    cap = db.query(BookingCapacity).first()
    max_per_hour = cap.max_bookings_per_hour if cap else 4

    return {
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
        "pending_appointments": pending_count,
        "approved_appointments": approved_count,
        "completed_appointments": completed_count,
        "cancelled_appointments": cancelled_count,
        "max_bookings_per_hour": max_per_hour,
    }
