from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Service name")
    category: Optional[str] = Field(default="General", description="Service category")
    description: Optional[str] = Field(default="", description="Service description")
    price: float = Field(..., ge=0, description="Price in INR / standard currency")
    min_duration_minutes: int = Field(default=15, ge=5, le=480, description="Minimum duration in minutes")
    max_duration_minutes: int = Field(default=30, ge=5, le=480, description="Maximum duration in minutes")
    image_url: Optional[str] = Field(default="", description="Image URL or uploaded photo path")
    external_link: Optional[str] = Field(default="", description="External link or brochure URL")
    is_active: Optional[bool] = Field(default=True, description="Active status")

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    min_duration_minutes: Optional[int] = None
    max_duration_minutes: Optional[int] = None
    image_url: Optional[str] = None
    external_link: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceResponse(ServiceBase):
    id: int
    created_at: Optional[datetime] = None
    staff_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
