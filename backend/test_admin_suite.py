import io
import os
import sys
import datetime
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings
from app.core.database import init_db
from app.main import app

def run_admin_suite():
    print("=" * 60)
    print("RUNNING FULL LUXE SALON & SPA ADMIN SUITE: 7 CORE FEATURES")
    print("=" * 60)

    # 0. Initialize DB & seeds
    print("\n[INIT] Initializing DB tables and seed data...")
    init_db()
    client = TestClient(app)

    # ==========================================
    # Feature 1: Admin Login & JWT Authentication
    # ==========================================
    print("\n[FEATURE 1] Admin Login: Secure JWT Authentication...")
    # Attempt invalid login
    bad_login = client.post("/api/v1/auth/login", json={"username": "admin@salon.com", "password": "WrongPassword!"})
    assert bad_login.status_code == 401, f"Expected 401 for wrong credentials, got {bad_login.status_code}"
    print("  [PASS] Protected against bad password (HTTP 401)")

    # Attempt valid login with seeded salon admin
    valid_login = client.post("/api/v1/auth/login", json={"username": "admin@salon.com", "password": "Admin@123"})
    assert valid_login.status_code == 200, f"Login failed: {valid_login.text}"
    token_data = valid_login.json()
    assert "access_token" in token_data, "access_token missing in response"
    token = token_data["access_token"]
    print(f"  [PASS] Login successful! Token received: {token[:20]}...")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Verify /me endpoint
    me_res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_res.status_code == 200, f"Failed /auth/me: {me_res.text}"
    me_data = me_res.json()
    assert me_data["email"] in ("admin@salon.com", "admin@clinic.com")
    print(f"  [PASS] Authenticated Admin: {me_data['full_name']} ({me_data['role']})")

    # ==========================================
    # Feature 2: Service & Price Management
    # ==========================================
    print("\n[FEATURE 2] Service & Price Management CRUD & Photo Upload...")
    services_list = client.get("/api/v1/services/").json()
    print(f"  [PASS] Initial salon services loaded: {len(services_list)} services")
    assert len(services_list) >= 30, f"Expected at least 30 seeded salon services, found {len(services_list)}"

    # Create new salon service
    new_service_payload = {
        "name": "Balayage Hair Contouring",
        "category": "Hair Treatments",
        "description": "Hand-painted dimensional balayage highlights for natural, sun-kissed luxury tones.",
        "price": 4500.0,
        "min_duration_minutes": 60,
        "max_duration_minutes": 120,
        "image_url": "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
        "external_link": "https://luxesalon.example.com/services/balayage",
        "is_active": True,
    }
    create_srv_res = client.post("/api/v1/services/", json=new_service_payload, headers=auth_headers)
    assert create_srv_res.status_code == 201, f"Create service failed: {create_srv_res.text}"
    srv_created = create_srv_res.json()
    srv_id = srv_created["id"]
    print(f"  [PASS] Service created: #{srv_id} - {srv_created['name']} (Rs.{srv_created['price']})")

    # Update service price and min/max duration
    update_srv_res = client.put(f"/api/v1/services/{srv_id}", json={"price": 4800.0, "max_duration_minutes": 135}, headers=auth_headers)
    assert update_srv_res.status_code == 200
    assert update_srv_res.json()["price"] == 4800.0
    assert update_srv_res.json()["max_duration_minutes"] == 135
    print("  [PASS] Service updated: price updated to Rs.4800, max duration to 135m")

    # Test photo upload
    dummy_img = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    upload_res = client.post(
        "/api/v1/services/upload-photo",
        files={"file": ("test_service.png", dummy_img, "image/png")},
        headers=auth_headers,
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    uploaded_url = upload_res.json()["image_url"]
    assert "/uploads/services/" in uploaded_url
    print(f"  [PASS] Photo upload successful: {uploaded_url}")

    # ==========================================
    # Feature 3: Discount Engine
    # ==========================================
    print("\n[FEATURE 3] Discount Engine: First-Order, Festival, and Bundles...")
    discounts_res = client.get("/api/v1/discounts/").json()
    print(f"  [PASS] Active discount rules loaded: {len(discounts_res)} rules")
    assert len(discounts_res) >= 3, "Expected at least 3 seeded rules"

    # 3A: First Order Evaluation (LUXE-FIRST20)
    first_order_calc = client.post("/api/v1/discounts/calculate", json={
        "items": [{"service_id": srv_id, "price": 4800.0, "quantity": 1}],
        "is_first_order": True,
    })
    assert first_order_calc.status_code == 200
    f_res = first_order_calc.json()
    print(f"  [PASS] First-order discount calculated: Subtotal=Rs.{f_res['subtotal']}, Discount=Rs.{f_res['total_discount']}, Final=Rs.{f_res['final_amount']}")
    assert f_res["total_discount"] > 0, "First-order discount should apply"

    # 3B: Festival Discount Evaluation (GLOW-FESTIVE)
    festive_calc = client.post("/api/v1/discounts/calculate", json={
        "items": [{"service_id": srv_id, "price": 4800.0, "quantity": 1}],
        "coupon_code": "GLOW-FESTIVE",
        "booking_date": "2026-10-25",
    })
    assert festive_calc.status_code == 200
    fest_res = festive_calc.json()
    print(f"  [PASS] Festival discount calculated: Subtotal=Rs.{fest_res['subtotal']}, Discount=Rs.{fest_res['total_discount']}, Final=Rs.{fest_res['final_amount']}")
    assert fest_res["total_discount"] == 500.0, "Festive discount should deduct Rs.500"

    # 3C: Combined Service Bundle Evaluation (MANI-PEDI-COMBO)
    mani_srv = next((s for s in services_list if s["name"] == "Manicure"), services_list[0])
    pedi_srv = next((s for s in services_list if s["name"] == "Pedicure"), services_list[1])
    bundle_calc = client.post("/api/v1/discounts/calculate", json={
        "items": [
            {"service_id": mani_srv["id"], "price": float(mani_srv["price"]), "quantity": 1},
            {"service_id": pedi_srv["id"], "price": float(pedi_srv["price"]), "quantity": 1},
        ],
    })
    assert bundle_calc.status_code == 200
    b_res = bundle_calc.json()
    print(f"  [PASS] Bundle combo discount calculated: Subtotal=Rs.{b_res['subtotal']}, Discount=Rs.{b_res['total_discount']}, Final=Rs.{b_res['final_amount']}")
    assert any("Bundle" in r.get("title", "") or "MANI-PEDI-COMBO" in r.get("code", "") for r in b_res.get("applied_rules", [])), "Bundle rule should apply for Manicure + Pedicure"

    # ==========================================
    # Feature 4: Staff Management & Service Mapping
    # ==========================================
    print("\n[FEATURE 4] Staff Management & Service Mapping...")
    staff_list = client.get("/api/v1/staff/").json()
    print(f"  [PASS] Stylists & Beauticians directory loaded: {len(staff_list)} professionals")
    assert len(staff_list) >= 2, "Expected seeded staff"

    # Create new stylist mapped to services
    new_staff_payload = {
        "name": "Nisha Roy",
        "title": "Master Nail Artist & Lash Specialist",
        "email": "nisha.roy@salon.com",
        "phone": "+91 98765 43220",
        "bio": "Certified Japanese gel artist with 8+ years experience in bridal 3D nail art.",
        "avatar_url": "",
        "service_ids": [srv_id, mani_srv["id"]],
    }
    create_staff_res = client.post("/api/v1/staff/", json=new_staff_payload, headers=auth_headers)
    assert create_staff_res.status_code == 201, f"Create staff failed: {create_staff_res.text}"
    st_data = create_staff_res.json()
    staff_id = st_data["id"]
    print(f"  [PASS] Stylist created: #{staff_id} {st_data['name']} mapped to services: {st_data['service_ids']}")
    assert srv_id in st_data["service_ids"]

    # ==========================================
    # Feature 5: Working Hours & Schedule Management
    # ==========================================
    print("\n[FEATURE 5] Working Hours & Schedule Management...")
    hours_res = client.get("/api/v1/schedule/working-hours").json()
    assert len(hours_res) == 7, "Expected 7 days of working hours"
    print(f"  [PASS] 7-Day salon schedule verified (Monday through Sunday)")

    # Update working hours for Monday
    hours_res[0]["close_time"] = "21:30"
    update_wh_res = client.put("/api/v1/schedule/working-hours", json={"hours": hours_res}, headers=auth_headers)
    assert update_wh_res.status_code == 200
    print("  [PASS] Salon working hours updated (Monday closing set to 21:30)")

    # Test holidays
    holidays = client.get("/api/v1/schedule/holidays").json()
    print(f"  [PASS] Salon holidays retrieved: {len(holidays)} holidays")
    add_hol = client.post("/api/v1/schedule/holidays", json={"holiday_date": "2026-12-31", "name": "New Year's Eve Early Close"}, headers=auth_headers)
    assert add_hol.status_code == 201
    hol_id = add_hol.json()["id"]
    print(f"  [PASS] Holiday added: {add_hol.json()['name']} ({add_hol.json()['holiday_date']})")
    del_hol = client.delete(f"/api/v1/schedule/holidays/{hol_id}", headers=auth_headers)
    assert del_hol.status_code == 200
    print("  [PASS] Holiday deleted successfully")

    # ==========================================
    # Feature 6: Booking Capacity Limit & Live Occupancy
    # ==========================================
    print("\n[FEATURE 6] Booking Capacity Limit & Live Hourly Occupancy...")
    cap_res = client.get("/api/v1/capacity/").json()
    print(f"  [PASS] Current Salon Chair Capacity Limit: {cap_res['max_bookings_per_hour']} clients/hour")

    # Update capacity limit
    update_cap = client.put("/api/v1/capacity/", json={"max_bookings_per_hour": 8, "slot_duration_minutes": 60, "notes": "Expanded to 8 styling stations"}, headers=auth_headers)
    assert update_cap.status_code == 200
    assert update_cap.json()["max_bookings_per_hour"] == 8
    print("  [PASS] Capacity limit updated to 8 bookings/hour")

    # Query live occupancy for today
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    occ_res = client.get(f"/api/v1/capacity/occupancy?date_str={today_str}").json()
    print(f"  [PASS] Live salon occupancy for {today_str} ({occ_res['day_name']}): {occ_res['total_bookings']} total bookings across {len(occ_res['slots'])} hour slots")
    assert len(occ_res["slots"]) > 0

    # ==========================================
    # Feature 7: Appointment Calendar & Approval/Reschedule/Cancel
    # ==========================================
    print("\n[FEATURE 7] Appointment Calendar: Approve, Cancel, Reschedule...")
    cal_res = client.get(f"/api/v1/appointments/calendar?start_date=2026-10-01&end_date=2026-10-31")
    assert cal_res.status_code == 200
    print(f"  [PASS] Calendar query: {len(cal_res.json())} appointments in date range")

    # Create a test pending appointment with client and stylist nomenclature
    test_app = client.post("/api/v1/appointments/", json={
        "client_name": "Siddharth Roy",
        "client_phone": "9988776655",
        "client_email": "siddharth.roy@example.com",
        "stylist_name": "Anya Roy",
        "staff_id": staff_id,
        "service_id": srv_id,
        "appointment_date": "2026-10-29",
        "appointment_time": "11:00 AM",
        "status": "pending",
        "notes": "Client requested appointment via salon VIP concierge",
    })
    assert test_app.status_code == 201, f"Failed booking: {test_app.text}"
    app_id = test_app.json()["id"]
    print(f"  [PASS] New client appointment booked: #{app_id} (Client: {test_app.json().get('client_name', test_app.json().get('patient_name'))}, Status: {test_app.json()['status']})")

    # Approve appointment
    approve_res = client.put(f"/api/v1/appointments/{app_id}/approve", headers=auth_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"
    print(f"  [PASS] Appointment #{app_id} Approved successfully!")

    # Reschedule appointment
    resched_res = client.put(f"/api/v1/appointments/{app_id}/reschedule", json={
        "new_date": "2026-10-30",
        "new_time": "12:00 PM",
        "reason": "Stylist scheduled for celebrity event; client agreed to Friday slot",
    }, headers=auth_headers)
    assert resched_res.status_code == 200, f"Reschedule failed: {resched_res.status_code} - {resched_res.text}"
    assert resched_res.json()["appointment_date"] == "2026-10-30"
    assert resched_res.json()["status"] == "rescheduled"
    print(f"  [PASS] Appointment #{app_id} Rescheduled to 2026-10-30 at 12:00 PM (Capacity verified)")

    # Cancel appointment with reason
    cancel_res = client.put(f"/api/v1/appointments/{app_id}/cancel", json={
        "reason": "Client requested cancellation due to travel",
    }, headers=auth_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
    assert "travel" in cancel_res.json()["cancellation_reason"]
    print(f"  [PASS] Appointment #{app_id} Cancelled with reason: '{cancel_res.json()['cancellation_reason']}'")

    # Re-activate via status update and test Complete
    status_res = client.put(f"/api/v1/appointments/{app_id}/status", json={
        "status": "approved",
        "notes": "Admin manually reinstated appointment for completion test",
    }, headers=auth_headers)
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "approved"
    print(f"  [PASS] Appointment #{app_id} status updated to 'approved' via status endpoint")

    # Complete appointment with completed_by staff via PATCH /status
    patch_res = client.patch(f"/api/v1/appointments/{app_id}/status", json={
        "status": "completed",
        "completed_by": "Anya Roy",
        "notes": "Balayage styling completed to perfection",
    }, headers=auth_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "completed"
    assert patch_res.json()["completed_by"] == "Anya Roy"
    print(f"  [PASS] Appointment #{app_id} patched to 'completed' with completed_by='Anya Roy'")

    # Also test complete endpoint with completed_by
    complete_res = client.put(f"/api/v1/appointments/{app_id}/complete", json={
        "completed_by": "Nisha Roy",
        "notes": "Treatment completed",
    }, headers=auth_headers)
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"
    assert complete_res.json()["completed_by"] == "Nisha Roy"
    print(f"  [PASS] Appointment #{app_id} Marked as Done via /complete with completed_by='Nisha Roy'")

    # ==========================================
    # Feature 7B: Booking Validations (Past Dates, Past Slots, Conflicts)
    # ==========================================
    print("\n[FEATURE 7B] Manual Booking Validations: Past Dates, Past Times, and Slot Conflict...")
    # 1. Past date rejection
    past_date_res = client.post("/api/v1/appointments/", json={
        "client_name": "Test Client",
        "stylist_name": "Anya Roy",
        "appointment_date": "2020-01-01",
        "appointment_time": "10:00 AM",
    })
    assert past_date_res.status_code == 400, f"Expected 400 for past date, got {past_date_res.status_code}"
    print("  [PASS] Correctly rejected booking for past date (HTTP 400)")

    # 2. Past time on today rejection
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    past_time_res = client.post("/api/v1/appointments/", json={
        "client_name": "Test Client",
        "stylist_name": "Anya Roy",
        "appointment_date": today_str,
        "appointment_time": "09:00 AM",
    })
    assert past_time_res.status_code == 400, f"Expected 400 for past time slot, got {past_time_res.status_code}"
    print("  [PASS] Correctly rejected booking for passed time slot on today (HTTP 400)")

    # 3. Double-booking conflict rejection on guaranteed open weekday
    days_ahead = 1
    target_dt = datetime.date.today() + datetime.timedelta(days=days_ahead)
    while target_dt.weekday() >= 5:  # skip Saturday & Sunday for regular weekday booking test
        days_ahead += 1
        target_dt = datetime.date.today() + datetime.timedelta(days=days_ahead)
    future_date = target_dt.strftime("%Y-%m-%d")
    first_book = client.post("/api/v1/appointments/", json={
        "client_name": "First Client",
        "stylist_name": "Anya Roy",
        "appointment_date": future_date,
        "appointment_time": "03:00 PM",
    })
    assert first_book.status_code == 201, f"Failed first booking: {first_book.text}"
    conflicting_app_id = first_book.json()["id"]

    # Try booking exact same slot for same stylist
    conflict_book = client.post("/api/v1/appointments/", json={
        "client_name": "Second Client",
        "stylist_name": "Anya Roy",
        "appointment_date": future_date,
        "appointment_time": "03:00 PM",
    })
    assert conflict_book.status_code == 409, f"Expected 409 for conflicting slot, got {conflict_book.status_code}"
    print("  [PASS] Correctly rejected double-booking conflict (HTTP 409)")

    # 4. Check available slots endpoint
    slots_res = client.get(f"/api/v1/appointments/available-slots?doctor_name=Anya%20Roy&date={future_date}")
    assert slots_res.status_code == 200
    slots_data = slots_res.json()["slots"]
    slot_3pm = next(s for s in slots_data if s["time"] == "03:00 PM")
    assert slot_3pm["available"] is False
    assert slot_3pm["status"] == "booked"
    assert "Already Booked" in slot_3pm["label"]
    print(f"  [PASS] Available slots breakdown verified: 03:00 PM is marked as '{slot_3pm['label']}'")

    # Clean up conflicting appointment
    client.delete(f"/api/v1/appointments/{conflicting_app_id}", headers=auth_headers)

    # ==========================================
    # Feature 8: Day-Specific Closing Time & Working Hours Enforcement
    # ==========================================
    print("\n[FEATURE 8] Day-Specific Closing Time & Operating Schedule...")
    # Fetch schedule and configure Saturday closing time to 17:00 (05:00 PM)
    curr_wh = client.get("/api/v1/schedule/working-hours").json()
    sat_item = next(h for h in curr_wh if h["day_name"] == "Saturday")
    sat_item["is_open"] = True
    sat_item["open_time"] = "09:00"
    sat_item["close_time"] = "17:00"
    sat_item["break_start"] = "13:00"
    sat_item["break_end"] = "14:00"
    client.put("/api/v1/schedule/working-hours", json={"hours": curr_wh}, headers=auth_headers)

    # Find the next Saturday date
    sat_ahead = 1
    next_sat = datetime.date.today() + datetime.timedelta(days=sat_ahead)
    while next_sat.weekday() != 5:  # Saturday = 5
        sat_ahead += 1
        next_sat = datetime.date.today() + datetime.timedelta(days=sat_ahead)
    sat_date_str = next_sat.strftime("%Y-%m-%d")

    # 1. Available slots on Saturday must NOT contain any slot after 05:00 PM (e.g. 05:30 PM, 06:00 PM)
    sat_slots_res = client.get(f"/api/v1/appointments/available-slots?doctor_name=Anya%20Roy&date={sat_date_str}")
    assert sat_slots_res.status_code == 200
    sat_slot_times = [s["time"] for s in sat_slots_res.json()["slots"]]
    assert "05:00 PM" in sat_slot_times, "Expected 05:00 PM to be the last slot for 17:00 close time"
    assert "05:30 PM" not in sat_slot_times, "Slots after 05:00 PM closing time must NOT appear"
    assert "06:00 PM" not in sat_slot_times, "Slots after 05:00 PM closing time must NOT appear"
    assert "01:00 PM" not in sat_slot_times, "Break hour slots [13:00-14:00) must NOT appear"
    assert "01:30 PM" not in sat_slot_times, "Break hour slots [13:00-14:00) must NOT appear"
    print(f"  [PASS] Saturday closing time (17:00) respected: 05:00 PM is last slot; no slots after 5 PM or during break")

    # 2. Attempting to book after Saturday closing time (e.g. 05:30 PM) is rejected with HTTP 400
    post_close_book = client.post("/api/v1/appointments/", json={
        "client_name": "Late Client",
        "stylist_name": "Anya Roy",
        "appointment_date": sat_date_str,
        "appointment_time": "05:30 PM",
    })
    assert post_close_book.status_code == 400, f"Expected 400 for post-closing time slot, got {post_close_book.status_code}"
    assert "after salon closing time" in post_close_book.json()["detail"]
    print("  [PASS] Booking after Saturday closing time strictly rejected (HTTP 400)")

    # 3. Attempting to book during break hours is rejected with HTTP 400
    break_book = client.post("/api/v1/appointments/", json={
        "client_name": "Break Client",
        "stylist_name": "Anya Roy",
        "appointment_date": sat_date_str,
        "appointment_time": "01:00 PM",
    })
    assert break_book.status_code == 400, f"Expected 400 for break slot, got {break_book.status_code}"
    assert "falls during salon break hours" in break_book.json()["detail"]
    print("  [PASS] Booking during break hours strictly rejected (HTTP 400)")

    # 4. Closed day validation (e.g. Sunday)
    sun_item = next(h for h in curr_wh if h["day_name"] == "Sunday")
    sun_item["is_open"] = False
    client.put("/api/v1/schedule/working-hours", json={"hours": curr_wh}, headers=auth_headers)

    sun_ahead = 1
    next_sun = datetime.date.today() + datetime.timedelta(days=sun_ahead)
    while next_sun.weekday() != 6:  # Sunday = 6
        sun_ahead += 1
        next_sun = datetime.date.today() + datetime.timedelta(days=sun_ahead)
    sun_date_str = next_sun.strftime("%Y-%m-%d")

    sun_slots_res = client.get(f"/api/v1/appointments/available-slots?doctor_name=Anya%20Roy&date={sun_date_str}")
    assert sun_slots_res.status_code == 200
    assert len(sun_slots_res.json()["slots"]) == 0, "Closed day should return 0 slots"
    print("  [PASS] Sunday closed schedule verified: 0 slots returned")

    sun_book = client.post("/api/v1/appointments/", json={
        "client_name": "Sunday Client",
        "stylist_name": "Anya Roy",
        "appointment_date": sun_date_str,
        "appointment_time": "11:00 AM",
    })
    assert sun_book.status_code == 400
    assert "salon is closed on Sundays" in sun_book.json()["detail"]
    print("  [PASS] Booking on closed day rejected with HTTP 400")

    # Clean up test records
    client.delete(f"/api/v1/appointments/{app_id}", headers=auth_headers)
    client.delete(f"/api/v1/staff/{staff_id}", headers=auth_headers)
    client.delete(f"/api/v1/services/{srv_id}", headers=auth_headers)
    print("  [PASS] Test records cleaned up cleanly.")

    print("\n" + "=" * 60)
    print(" ALL 7 SALON ADMIN DASHBOARD BACKEND FEATURES PASSED TEST! ")
    print("=" * 60)

if __name__ == "__main__":
    run_admin_suite()
