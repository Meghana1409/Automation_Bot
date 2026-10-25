from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ServiceShort(BaseModel):
    id: int
    name: str
    category: str
    price: float

    model_config = ConfigDict(from_attributes=True)

class StaffBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Staff member full name")
    title: str = Field(..., min_length=1, max_length=100, description="Professional title or designation")
    email: Optional[str] = Field(default="", description="Contact email")
    phone: Optional[str] = Field(default="", description="Contact phone")
    bio: Optional[str] = Field(default="", description="Professional bio and experience")
    avatar_url: Optional[str] = Field(default="", description="Photo avatar URL")
    is_active: Optional[bool] = Field(default=True, description="Active status")

class StaffCreate(StaffBase):
    service_ids: Optional[List[int]] = Field(default_factory=list, description="List of service IDs mapped to this staff")

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    service_ids: Optional[List[int]] = None

class StaffResponse(StaffBase):
    id: int
    created_at: Optional[datetime] = None
    services: List[ServiceShort] = []
    service_ids: List[int] = []

    model_config = ConfigDict(from_attributes=True)
