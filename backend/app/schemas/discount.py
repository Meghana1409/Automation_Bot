from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class DiscountRuleBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Promo or discount code (e.g. FIRST20, DIWALI300)")
    title: str = Field(..., min_length=1, max_length=150, description="Rule title")
    description: Optional[str] = Field(default="", description="Detailed description")
    rule_type: str = Field(..., description="Rule category: 'first_order', 'festival', 'service_bundle'")
    discount_type: str = Field(default="percentage", description="'percentage' or 'fixed'")
    discount_value: float = Field(..., ge=0, description="Percentage (e.g. 20) or fixed amount (e.g. 300)")
    min_cart_value: Optional[float] = Field(default=0.0, ge=0, description="Minimum cart subtotal to qualify")
    start_date: Optional[str] = Field(default="", description="Start date for festival offer (YYYY-MM-DD)")
    end_date: Optional[str] = Field(default="", description="End date for festival offer (YYYY-MM-DD)")
    applicable_service_ids: Optional[str] = Field(default="", description="Comma-separated IDs of applicable services")
    bundle_required_service_ids: Optional[str] = Field(default="", description="Comma-separated IDs required together for bundle")
    usage_limit: Optional[int] = Field(default=None, description="Max total usage count")
    is_active: Optional[bool] = Field(default=True, description="Active status")

class DiscountRuleCreate(DiscountRuleBase):
    pass

class DiscountRuleUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    rule_type: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_cart_value: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    applicable_service_ids: Optional[str] = None
    bundle_required_service_ids: Optional[str] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None

class DiscountRuleResponse(DiscountRuleBase):
    id: int
    used_count: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CartItem(BaseModel):
    service_id: int
    price: Optional[float] = None
    quantity: int = 1

class CartDiscountCalculateRequest(BaseModel):
    items: List[CartItem]
    coupon_code: Optional[str] = None
    is_first_order: bool = False
    patient_phone: Optional[str] = None
    booking_date: Optional[str] = None  # YYYY-MM-DD for festival evaluation

class AppliedDiscountDetail(BaseModel):
    rule_id: int
    code: str
    title: str
    rule_type: str
    discount_amount: float
    description: str

class CartDiscountResponse(BaseModel):
    subtotal: float
    total_discount: float
    final_amount: float
    applied_rules: List[AppliedDiscountDetail] = []
    messages: List[str] = []
