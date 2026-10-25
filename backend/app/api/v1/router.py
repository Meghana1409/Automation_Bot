from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    services,
    discounts,
    staff,
    schedule,
    capacity,
    appointments,
    webhook,
    health,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Admin Auth"])
api_router.include_router(services.router, prefix="/services", tags=["Service & Price Management"])
api_router.include_router(discounts.router, prefix="/discounts", tags=["Discount Engine"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff Management"])
api_router.include_router(schedule.router, prefix="/schedule", tags=["Working Hours & Schedule"])
api_router.include_router(capacity.router, prefix="/capacity", tags=["Booking Capacity Limit"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments & Calendar"])
api_router.include_router(webhook.router, prefix="/webhook", tags=["WhatsApp Webhook"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
