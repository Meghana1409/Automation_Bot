import datetime
from typing import List, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.discount import DiscountRule
from app.models.service import Service
from app.models.appointment import Appointment
from app.models.admin_user import AdminUser
from app.schemas.discount import (
    DiscountRuleCreate,
    DiscountRuleUpdate,
    DiscountRuleResponse,
    CartDiscountCalculateRequest,
    CartDiscountResponse,
    AppliedDiscountDetail,
)

router = APIRouter()

@router.get("/", response_model=List[DiscountRuleResponse], summary="List all discount rules & bundles")
def list_discounts(
    rule_type: Optional[str] = Query(None, description="Filter by 'first_order', 'festival', or 'service_bundle'"),
    active_only: bool = Query(False, description="Filter only active rules"),
    db: Session = Depends(get_db),
):
    query = db.query(DiscountRule)
    if active_only:
        query = query.filter(DiscountRule.is_active == True)
    if rule_type:
        query = query.filter(DiscountRule.rule_type == rule_type)
    return query.order_by(DiscountRule.id.desc()).all()

@router.get("/{rule_id}", response_model=DiscountRuleResponse, summary="Get single discount rule details")
def get_discount_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(DiscountRule).filter(DiscountRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount rule not found.")
    return rule

@router.post("/", response_model=DiscountRuleResponse, status_code=status.HTTP_201_CREATED, summary="Create a new discount rule or bundle")
def create_discount_rule(
    rule_in: DiscountRuleCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(DiscountRule).filter(DiscountRule.code == rule_in.code.upper().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A discount rule with code '{rule_in.code}' already exists.",
        )

    rule = DiscountRule(
        code=rule_in.code.upper().strip(),
        title=rule_in.title,
        description=rule_in.description or "",
        rule_type=rule_in.rule_type,
        discount_type=rule_in.discount_type,
        discount_value=rule_in.discount_value,
        min_cart_value=rule_in.min_cart_value or 0.0,
        start_date=rule_in.start_date or "",
        end_date=rule_in.end_date or "",
        applicable_service_ids=rule_in.applicable_service_ids or "",
        bundle_required_service_ids=rule_in.bundle_required_service_ids or "",
        usage_limit=rule_in.usage_limit,
        is_active=rule_in.is_active if rule_in.is_active is not None else True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.put("/{rule_id}", response_model=DiscountRuleResponse, summary="Update an existing discount rule")
def update_discount_rule(
    rule_id: int,
    rule_in: DiscountRuleUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rule = db.query(DiscountRule).filter(DiscountRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount rule not found.")

    update_dict = rule_in.model_dump(exclude_unset=True)
    if "code" in update_dict and update_dict["code"]:
        update_dict["code"] = update_dict["code"].upper().strip()

    for field, val in update_dict.items():
        setattr(rule, field, val)

    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=status.HTTP_200_OK, summary="Delete a discount rule")
def delete_discount_rule(
    rule_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rule = db.query(DiscountRule).filter(DiscountRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount rule not found.")

    db.delete(rule)
    db.commit()
    return {"status": "success", "message": f"Discount rule '{rule.code}' removed successfully."}

@router.post("/calculate", response_model=CartDiscountResponse, summary="Evaluate discounts on a cart/order")
def calculate_discounts(
    req: CartDiscountCalculateRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluates a cart against:
    1. First-order offers (auto-detected by phone history or explicit flag)
    2. Festival discounts (valid date window + minimum cart value)
    3. Combined service bundles (when all bundle required services are present)
    4. Optional coupon code
    """
    if not req.items:
        return CartDiscountResponse(
            subtotal=0.0,
            total_discount=0.0,
            final_amount=0.0,
            applied_rules=[],
            messages=["Cart is empty."],
        )

    # 1. Fetch services & compute subtotal
    item_service_ids: Set[int] = set()
    service_prices = {}
    subtotal = 0.0

    for item in req.items:
        srv = db.query(Service).filter(Service.id == item.service_id).first()
        if srv:
            price = item.price if item.price is not None else srv.price
            service_prices[item.service_id] = price
            subtotal += price * max(1, item.quantity)
            item_service_ids.add(item.service_id)

    # 2. Check if user is first-order
    is_first_order = req.is_first_order
    if not is_first_order and req.patient_phone:
        clean_phone = req.patient_phone.strip()
        existing_apps = db.query(Appointment).filter(
            Appointment.patient_phone == clean_phone,
            Appointment.status != "cancelled",
        ).count()
        if existing_apps == 0:
            is_first_order = True

    # 3. Check booking date
    eval_date_str = req.booking_date or datetime.date.today().strftime("%Y-%m-%d")

    # 4. Fetch all active discount rules
    active_rules = db.query(DiscountRule).filter(DiscountRule.is_active == True).all()

    applied_details: List[AppliedDiscountDetail] = []
    messages: List[str] = []
    total_discount = 0.0

    # Separate rules by code match vs automatic rules
    coupon_code = req.coupon_code.upper().strip() if req.coupon_code else None

    for rule in active_rules:
        # Check usage limit if any
        if rule.usage_limit is not None and rule.used_count >= rule.usage_limit:
            continue

        # Check minimum cart subtotal
        if subtotal < rule.min_cart_value:
            continue

        applies = False
        reason = ""

        # A: First order offer
        if rule.rule_type == "first_order":
            if is_first_order or (coupon_code and coupon_code == rule.code):
                applies = True
                reason = "First-time patient welcome offer applied."

        # B: Festival discount
        elif rule.rule_type == "festival":
            is_in_window = True
            if rule.start_date and eval_date_str < rule.start_date:
                is_in_window = False
            if rule.end_date and eval_date_str > rule.end_date:
                is_in_window = False

            if is_in_window and (not coupon_code or coupon_code == rule.code):
                applies = True
                reason = f"Festive promotion '{rule.title}' applied."

        # C: Service Bundle
        elif rule.rule_type == "service_bundle":
            if rule.bundle_required_service_ids:
                try:
                    req_ids = {int(x.strip()) for x in rule.bundle_required_service_ids.split(",") if x.strip()}
                    if req_ids and req_ids.issubset(item_service_ids):
                        applies = True
                        reason = f"Bundle discount '{rule.title}' qualified for bundled services."
                except Exception:
                    pass

        # D: Direct Coupon Code match fallback
        elif coupon_code and coupon_code == rule.code:
            applies = True
            reason = f"Promo coupon '{rule.code}' applied."

        if applies:
            # Calculate discount value
            if rule.discount_type == "percentage":
                # If specific applicable services are defined, apply % to those services only
                if rule.applicable_service_ids:
                    try:
                        app_ids = {int(x.strip()) for x in rule.applicable_service_ids.split(",") if x.strip()}
                        target_subtotal = sum(
                            service_prices[sid] for sid in app_ids if sid in service_prices
                        )
                    except Exception:
                        target_subtotal = subtotal
                else:
                    target_subtotal = subtotal
                
                amount = round((target_subtotal * (rule.discount_value / 100.0)), 2)
            else:
                # Fixed amount
                amount = min(rule.discount_value, subtotal)

            if amount > 0:
                applied_details.append(
                    AppliedDiscountDetail(
                        rule_id=rule.id,
                        code=rule.code,
                        title=rule.title,
                        rule_type=rule.rule_type,
                        discount_amount=amount,
                        description=reason,
                    )
                )
                total_discount += amount
                messages.append(reason)

    # Cap total discount at subtotal
    total_discount = min(total_discount, subtotal)
    final_amount = max(0.0, round(subtotal - total_discount, 2))

    return CartDiscountResponse(
        subtotal=round(subtotal, 2),
        total_discount=round(total_discount, 2),
        final_amount=final_amount,
        applied_rules=applied_details,
        messages=messages,
    )
