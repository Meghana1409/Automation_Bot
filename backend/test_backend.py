import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings
from app.core.database import init_db, SessionLocal, engine
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate
from app.services import appointment_service
from app.main import app

def run_tests():
    print("=== Testing FastAPI Backend Setup ===")
    print(f"Project Name: {settings.PROJECT_NAME}")
    print(f"API v1 string: {settings.API_V1_STR}")
    print(f"Database dialect: {engine.dialect.name}")
    print(f"Configured DATABASE_URL: {settings.DATABASE_URL[:25]}...")

    # 1. Test database table initialization
    print("\n[1] Initializing tables...")
    init_db()
    print("Database tables initialized successfully!")

    # 2. Test database session and appointment service
    print("\n[2] Testing appointment operations...")
    db = SessionLocal()
    try:
        test_patient = "Test Patient Monorepo"
        test_doctor = "Dr. Amit Sharma"
        test_date = "2026-12-01"
        test_time = "10:30 AM"

        # Check availability before booking
        available = appointment_service.check_slot_availability(db, test_doctor, test_date, test_time)
        print(f"Initial slot availability for {test_date} {test_time}: {available}")

        # Book test appointment
        new_app = AppointmentCreate(
            patient_name=test_patient,
            doctor_name=test_doctor,
            appointment_date=test_date,
            appointment_time=test_time,
            patient_phone="9876543210",
            status="confirmed"
        )
        created = appointment_service.book_appointment(db, new_app)
        print(f"Created appointment ID: {created.id} for {created.patient_name}")
        assert created.id is not None

        # Check availability after booking
        available_after = appointment_service.check_slot_availability(db, test_doctor, test_date, test_time)
        print(f"Slot availability after booking: {available_after}")
        assert available_after is False

        # Query stats
        stats = appointment_service.get_clinic_stats(db)
        print(f"Clinic stats: {stats}")
        assert stats["total_appointments"] >= 1

        # Clean up test appointment
        deleted = appointment_service.delete_appointment(db, created.id)
        print(f"Cleaned up test appointment (deleted={deleted})")
        assert deleted is True

    finally:
        db.close()

    # 3. Test FastAPI route mapping
    print("\n[3] Checking FastAPI routes:")
    openapi_paths = list(app.openapi()["paths"].keys())
    for path in sorted(openapi_paths):
        print(f"  - {path}")

    assert "/api/v1/appointments/" in openapi_paths
    assert "/api/v1/appointments/check-slot" in openapi_paths
    assert "/api/v1/webhook" in openapi_paths
    assert "/api/v1/health" in openapi_paths

    print("\n ALL BACKEND CHECKS PASSED SUCCESSFULLY! ")

if __name__ == "__main__":
    run_tests()
