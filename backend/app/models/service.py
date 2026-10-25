from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, index=True)
    category = Column(String(100), nullable=False, default="General")
    description = Column(Text, nullable=True, default="")
    price = Column(Float, nullable=False, default=0.0)
    min_duration_minutes = Column(Integer, nullable=False, default=15)
    max_duration_minutes = Column(Integer, nullable=False, default=30)
    image_url = Column(String(500), nullable=True, default="")
    external_link = Column(String(500), nullable=True, default="")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Many-to-many relationship with Staff
    staff_members = relationship("Staff", secondary="staff_services", back_populates="services")

    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}', price={self.price})>"
