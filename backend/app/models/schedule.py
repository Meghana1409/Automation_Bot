from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base

class WorkingHours(Base):
    __tablename__ = "working_hours"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    day_of_week = Column(Integer, unique=True, nullable=False)  # 0=Monday, 6=Sunday
    day_name = Column(String(20), nullable=False)               # Monday, Tuesday, etc.
    is_open = Column(Boolean, default=True, nullable=False)
    open_time = Column(String(10), nullable=False, default="09:00")
    close_time = Column(String(10), nullable=False, default="21:00")
    break_start = Column(String(10), nullable=True, default="13:00")
    break_end = Column(String(10), nullable=True, default="14:00")

    def __repr__(self):
        return f"<WorkingHours({self.day_name}: {self.open_time}-{self.close_time}, open={self.is_open})>"

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    holiday_date = Column(String(20), unique=True, index=True, nullable=False)  # YYYY-MM-DD
    name = Column(String(150), nullable=False)
    is_recurring = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Holiday({self.holiday_date}: '{self.name}')>"

class BookingCapacity(Base):
    __tablename__ = "booking_capacity"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    max_bookings_per_hour = Column(Integer, default=4, nullable=False)
    slot_duration_minutes = Column(Integer, default=60, nullable=False)
    allow_overbooking = Column(Boolean, default=False, nullable=False)
    notes = Column(String(255), nullable=True, default="Standard hourly clinical capacity limit")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<BookingCapacity(max_per_hour={self.max_bookings_per_hour})>"
