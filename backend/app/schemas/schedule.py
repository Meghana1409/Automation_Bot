from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator

class WorkingHoursItem(BaseModel):
    id: Optional[int] = None
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    day_name: str
    is_open: bool = True
    open_time: str = Field(default="09:00", description="HH:MM (24-hr)")
    close_time: str = Field(default="21:00", description="HH:MM (24-hr)")
    break_start: Optional[str] = Field(default="13:00", description="HH:MM (24-hr)")
    break_end: Optional[str] = Field(default="14:00", description="HH:MM (24-hr)")

    model_config = ConfigDict(from_attributes=True)

class WorkingHoursBatchUpdate(BaseModel):
    hours: List[WorkingHoursItem]

class HolidayCreate(BaseModel):
    holiday_date: str = Field(..., description="YYYY-MM-DD")
    name: str = Field(..., min_length=1, max_length=150, description="Holiday name or reason")
    is_recurring: Optional[bool] = False

class HolidayResponse(HolidayCreate):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CapacityUpdate(BaseModel):
    max_bookings_per_hour: int = Field(..., ge=1, le=50, description="Maximum bookings allowed per hour")
    slot_duration_minutes: Optional[int] = Field(default=60, ge=15, le=120)
    allow_overbooking: Optional[bool] = False
    notes: Optional[str] = ""

class CapacityResponse(BaseModel):
    id: int
    max_bookings_per_hour: int
    slot_duration_minutes: int
    allow_overbooking: bool
    notes: Optional[str] = ""
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class HourSlotOccupancy(BaseModel):
    hour: int          # e.g. 9 for 09:00
    time_label: str    # e.g. "09:00 - 10:00"
    booked_count: int
    max_capacity: int
    is_full: bool
    is_break: bool
    is_closed: bool
    percentage: float

class DateOccupancyResponse(BaseModel):
    date: str
    day_name: str
    is_clinic_open: bool
    is_salon_open: Optional[bool] = None
    is_holiday: bool
    holiday_name: Optional[str] = None
    max_bookings_per_hour: int
    total_bookings: int
    slots: List[HourSlotOccupancy]

    @model_validator(mode="after")
    def sync_salon_open(self):
        if self.is_salon_open is None:
            self.is_salon_open = self.is_clinic_open
        return self

