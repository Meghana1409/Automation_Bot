from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime
from app.core.database import Base

class DiscountRule(Base):
    __tablename__ = "discount_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True, default="")
    
    # rule_type: 'first_order', 'festival', 'service_bundle'
    rule_type = Column(String(50), nullable=False, default="festival")
    
    # discount_type: 'percentage' or 'fixed'
    discount_type = Column(String(20), nullable=False, default="percentage")
    discount_value = Column(Float, nullable=False, default=10.0)
    
    min_cart_value = Column(Float, nullable=False, default=0.0)
    start_date = Column(String(50), nullable=True)  # YYYY-MM-DD
    end_date = Column(String(50), nullable=True)    # YYYY-MM-DD
    
    # Comma-separated service IDs or empty for all services
    applicable_service_ids = Column(String(255), nullable=True, default="")
    
    # For service_bundle: comma-separated list of service IDs required in cart together
    bundle_required_service_ids = Column(String(255), nullable=True, default="")
    
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<DiscountRule(code='{self.code}', type='{self.rule_type}', value={self.discount_value})>"
