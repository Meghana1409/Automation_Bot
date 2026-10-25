from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

# Association table for Staff <-> Service (Many-to-Many)
staff_services = Table(
    "staff_services",
    Base.metadata,
    Column("staff_id", Integer, ForeignKey("staff.id", ondelete="CASCADE"), primary_key=True),
    Column("service_id", Integer, ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    title = Column(String(100), nullable=False, default="Medical Professional")
    email = Column(String(100), nullable=True, default="")
    phone = Column(String(30), nullable=True, default="")
    bio = Column(Text, nullable=True, default="")
    avatar_url = Column(String(500), nullable=True, default="")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Many-to-many relationship with Service
    services = relationship("Service", secondary=staff_services, back_populates="staff_members")

    def __repr__(self):
        return f"<Staff(id={self.id}, name='{self.name}', title='{self.title}')>"
