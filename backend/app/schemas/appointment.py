from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator

class AppointmentBase(BaseModel):
    patient_name: str = Field(default="", description="Client name (legacy alias)")
    client_name: Optional[str] = Field(default="", description="Client name")
    patient_phone: Optional[str] = Field(default="", description="Client contact phone")
    client_phone: Optional[str] = Field(default="", description="Client contact phone")
    patient_email: Optional[str] = Field(default="", description="Client email")
    client_email: Optional[str] = Field(default="", description="Client email")
    doctor_name: str = Field(default="", description="Stylist / Beautician name (legacy alias)")
    stylist_name: Optional[str] = Field(default="", description="Stylist / Beautician name")
    staff_id: Optional[int] = Field(default=None, description="Staff ID if assigned")
    service_id: Optional[int] = Field(default=None, description="Service ID if selected")
    service_name: Optional[str] = Field(default=None, description="Service name if selected")
    service_ids: Optional[List[int]] = Field(default=None, description="List of selected service IDs")
    appointment_date: str = Field(..., description="Date of appointment (YYYY-MM-DD)")
    appointment_time: str = Field(..., description="Time slot of appointment (e.g. 10:00 AM, 14:00)")
    status: Optional[str] = Field(default="pending", description="Status: pending, approved, confirmed, cancelled, completed, rescheduled")
    notes: Optional[str] = Field(default="", description="Styling or booking notes")
    completed_by: Optional[str] = Field(default="", description="Staff ID or Name reference who completed the service")

    @model_validator(mode="before")
    @classmethod
    def sync_salon_fields(cls, values):
        if isinstance(values, dict):
            c_name = values.get("client_name") or values.get("patient_name") or ""
            values["client_name"] = c_name
            values["patient_name"] = c_name

            c_phone = values.get("client_phone") or values.get("patient_phone") or ""
            values["client_phone"] = c_phone
            values["patient_phone"] = c_phone

            c_email = values.get("client_email") or values.get("patient_email") or ""
            values["client_email"] = c_email
            values["patient_email"] = c_email

            s_name = values.get("stylist_name") or values.get("doctor_name") or ""
            values["stylist_name"] = s_name
            values["doctor_name"] = s_name
        return values

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    doctor_name: Optional[str] = None
    staff_id: Optional[int] = None
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    completed_by: Optional[str] = None

class RescheduleRequest(BaseModel):
    new_date: str = Field(..., description="New appointment date (YYYY-MM-DD)")
    new_time: str = Field(..., description="New appointment time slot")
    reason: Optional[str] = Field(default="", description="Rescheduling reason/notes")

class CancelRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Reason for cancellation")

class CompleteRequest(BaseModel):
    completed_by: Optional[str] = Field(default="", description="Staff ID or Name reference who completed the service")
    notes: Optional[str] = Field(default="", description="Optional completion remarks/notes")

class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: pending, approved, confirmed, completed, cancelled, rescheduled")
    notes: Optional[str] = Field(default="", description="Optional transition notes")
    completed_by: Optional[str] = Field(default="", description="Staff ID or Name reference who completed the service")

class AppointmentResponse(AppointmentBase):
    id: int
    service_name: Optional[str] = None
    cancellation_reason: Optional[str] = ""
    reschedule_notes: Optional[str] = ""
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_service_name(cls, data):
        if hasattr(data, "service") and data.service:
            setattr(data, "service_name", data.service.name)
        elif isinstance(data, dict):
            if "service" in data and isinstance(data["service"], dict):
                data["service_name"] = data["service"].get("name")
        return data

class CalendarAppointment(BaseModel):
    id: int
    title: str
    patient_name: str
    patient_phone: str
    doctor_name: str
    date: str
    time: str
    status: str
    notes: Optional[str] = ""

class SlotCheckRequest(BaseModel):
    doctor_name: str
    date: str
    time: str

class SlotCheckResponse(BaseModel):
    doctor_name: str
    date: str
    time: str
    available: bool
    status: str
    message: str

class SlotInfo(BaseModel):
    time: str
    available: bool
    status: str
    label: str

class AvailableSlotsResponse(BaseModel):
    doctor_name: str
    date: str
    slots: List[SlotInfo]

class HealthResponse(BaseModel):
    status: str
    version: str
    database_type: str
    database_connected: bool
    database_url_masked: str

class BotSimulateRequest(BaseModel):
    message: str
    sender_phone: Optional[str] = "919999999999"

class BotSimulateResponse(BaseModel):
    reply: str
    sender_phone: str
    status: str = "success"
