from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_name = Column(String(100), nullable=False, index=True)
    patient_phone = Column(String(30), nullable=True, default="")
    patient_email = Column(String(100), nullable=True, default="")
    
    doctor_name = Column(String(100), nullable=False, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="SET NULL"), nullable=True)
    
    appointment_date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    appointment_time = Column(String(30), nullable=False)              # e.g. "10:00 AM" or "10:00"
    
    # Statuses: 'pending', 'approved', 'confirmed', 'cancelled', 'completed', 'rescheduled'
    status = Column(String(30), nullable=False, default="pending", index=True)
    
    cancellation_reason = Column(Text, nullable=True, default="")
    reschedule_notes = Column(Text, nullable=True, default="")
    completed_by = Column(String(100), nullable=True, default="")
    notes = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Salon Terminology Synonyms
    client_name = synonym("patient_name")
    client_phone = synonym("patient_phone")
    client_email = synonym("patient_email")
    stylist_name = synonym("doctor_name")

    # Optional relationships
    staff = relationship("Staff", foreign_keys=[staff_id], lazy="joined")
    service = relationship("Service", foreign_keys=[service_id], lazy="joined")

    def __repr__(self):
        return f"<Appointment(id={self.id}, client='{self.patient_name}', date='{self.appointment_date}', status='{self.status}')>"
