import pytest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.models.models import (
    Resident, BedAllocation, Room, RoomBed,
    RentRecord, PaymentTransaction, WhatsAppReminderLog, RentSettings, User
)
from app.utils.rent_calculator import (
    calculate_billing_schedule_for_resident, calculate_valid_due_date,
    determine_payment_status, parse_date_flexible
)
from app.utils.whatsapp_service import (
    generate_rent_reminder_text, normalize_whatsapp_phone,
    get_whatsapp_setup_status, send_whatsapp_message, build_whatsapp_chat_url
)
from app.scheduler.rent_scheduler import (
    ensure_rent_records_for_allocation, process_daily_rent_and_reminders
)

client = TestClient(app)

def get_admin_token():
    res = client.post("/api/auth/login", json={
        "email": "admin@srilakshmipg.com",
        "password": "Admin@PG2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

def get_user_token():
    res = client.post("/api/auth/login", json={
        "email": "karthik.r@example.com",
        "password": "User@PG2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

# 1. TEST DUE DATE CALCULATION & MONTH-END HANDLING
def test_due_date_calculation_and_month_end_edge_cases():
    """Tests leap year Feb, non-leap Feb, 30-day months, 31-day months."""
    # 31st in February 2026 (non-leap) -> 28 Feb
    assert calculate_valid_due_date(2026, 2, 31) == date(2026, 2, 28)
    # 31st in February 2028 (leap year) -> 29 Feb
    assert calculate_valid_due_date(2028, 2, 31) == date(2028, 2, 29)
    # 31st in April -> 30 Apr
    assert calculate_valid_due_date(2026, 4, 31) == date(2026, 4, 30)
    # 31st in May -> 31 May
    assert calculate_valid_due_date(2026, 5, 31) == date(2026, 5, 31)
    # 31st in September -> 30 Sep
    assert calculate_valid_due_date(2026, 9, 31) == date(2026, 9, 30)

def test_arun_kumar_billing_schedule_example():
    """
    Validates exact prompt specification for Arun Kumar:
    - Move-in date: 09-09-2026
    - First monthly rent due date: 09-10-2026 (October 2026)
    - Next monthly rent due date: 09-11-2026 (November 2026)
    - Following due date: 09-12-2026 (December 2026)
    """
    schedule = calculate_billing_schedule_for_resident(
        move_in_date_val="09-09-2026",
        monthly_rent=6000.0,
        max_months=3,
        as_of_date=date(2026, 10, 15)
    )
    assert len(schedule) == 3
    # Month 1
    assert schedule[0]["rent_month"] == "October 2026"
    assert schedule[0]["rent_period"] == "2026-10"
    assert schedule[0]["due_date"] == "2026-10-09"
    assert schedule[0]["due_date_formatted"] == "09-10-2026"
    assert schedule[0]["rent_amount"] == 6000.0
    assert schedule[0]["is_past_due"] == True

    # Month 2
    assert schedule[1]["rent_month"] == "November 2026"
    assert schedule[1]["rent_period"] == "2026-11"
    assert schedule[1]["due_date"] == "2026-11-09"
    assert schedule[1]["due_date_formatted"] == "09-11-2026"

    # Month 3
    assert schedule[2]["rent_month"] == "December 2026"
    assert schedule[2]["rent_period"] == "2026-12"
    assert schedule[2]["due_date"] == "2026-12-09"
    assert schedule[2]["due_date_formatted"] == "09-12-2026"

# 2. TEST CHECKED-OUT RESIDENTS STOP GENERATING RENT
def test_checked_out_resident_stops_generating_rent():
    """Verifies that rent is not generated for periods after checkout date."""
    schedule = calculate_billing_schedule_for_resident(
        move_in_date_val="2026-09-09",
        monthly_rent=6000.0,
        move_out_date_val="2026-10-20", # Checked out on Oct 20
        max_months=6,
        as_of_date=date(2026, 10, 25)
    )
    # Only October (due Oct 9) should be generated; November (due Nov 9) must not be generated
    assert len(schedule) == 1
    assert schedule[0]["rent_period"] == "2026-10"

# 3. TEST WHATSAPP MESSAGE TEXT GENERATION & PHONE NORMALIZATION
def test_whatsapp_message_dynamic_generation():
    msg = generate_rent_reminder_text(
        resident_name="Arun Kumar",
        room_number="S-2",
        rent_month="October 2026",
        monthly_rent=6000.0,
        amount_paid=0.0,
        balance_due=6000.0,
        due_date_formatted="09-10-2026",
        admin_whatsapp_number="9876543210"
    )
    assert "Hello Arun Kumar," in msg
    assert "This is a friendly reminder from Sri Lakshmi Srinivasa Gents PG." in msg
    assert "- Room Number: S-2" in msg
    assert "- Rent Month: October 2026" in msg
    assert "- Monthly Rent: ₹6,000" in msg
    assert "- Amount Paid: ₹0" in msg
    assert "- Outstanding Balance: ₹6,000" in msg
    assert "- Due Date: 09-10-2026" in msg
    assert "contact the PG administrator at +91 9876543210." in msg
    assert "Velachery, Chennai." in msg

    # Phone normalization
    assert normalize_whatsapp_phone("+91 98765 43210") == "919876543210"
    assert normalize_whatsapp_phone("9876543210") == "919876543210"

    # Click-to-chat URL building
    url = build_whatsapp_chat_url("9876543210", msg)
    assert url.startswith("https://wa.me/919876543210?text=")
    assert "Arun" in url

# 4. TEST PAYMENT STATUS TRANSITIONS (Pending, Partially Paid, Paid, Overdue)
def test_payment_status_logic():
    as_of = date(2026, 10, 15)
    # Future due date -> PENDING
    assert determine_payment_status(6000, 0, "2026-11-09", as_of_date=as_of) == "PENDING"
    # Past due date with 0 paid -> OVERDUE
    assert determine_payment_status(6000, 0, "2026-10-09", as_of_date=as_of) == "OVERDUE"
    # Partial payment -> PARTIALLY_PAID
    assert determine_payment_status(6000, 2000, "2026-10-09", as_of_date=as_of) == "PARTIALLY_PAID"
    # Full payment -> PAID
    assert determine_payment_status(6000, 6000, "2026-10-09", as_of_date=as_of) == "PAID"

# 5. TEST RECORD PAYMENT API & PARTIAL/FULL PAYMENT TRANSITIONS
def test_record_payment_api_partial_and_full():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get rent records
    res = client.get("/api/admin/rent/records?month=2026-10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "records" in data
    records = data["records"]
    assert len(records) > 0

    record = records[0]
    rec_id = record["id"]
    initial_balance = record["balance_due"]

    if initial_balance > 2000:
        # Step A: Pay ₹2,000 partial payment
        pay_res = client.post(
            f"/api/admin/rent/records/{rec_id}/payments",
            headers=headers,
            json={
                "amount": 2000.0,
                "payment_date": "2026-10-15",
                "payment_method": "UPI",
                "transaction_reference": "UPI9872348723",
                "notes": "Partial rent payment via GPay"
            }
        )
        assert pay_res.status_code == 200
        updated = pay_res.json()
        assert updated["amount_paid"] >= 2000.0
        assert updated["balance_due"] == round(initial_balance - 2000.0, 2)
        assert updated["payment_status"] == "PARTIALLY_PAID"

        # Step B: Pay remaining balance
        rem_balance = updated["balance_due"]
        pay_res2 = client.post(
            f"/api/admin/rent/records/{rec_id}/payments",
            headers=headers,
            json={
                "amount": rem_balance,
                "payment_date": "2026-10-15",
                "payment_method": "Bank Transfer",
                "transaction_reference": "NEFT672384723",
                "notes": "Settling remaining balance"
            }
        )
        assert pay_res2.status_code == 200
        settled = pay_res2.json()
        assert settled["balance_due"] == 0.0
        assert settled["payment_status"] == "PAID"

        # Step C: Attempt to overpay -> should be rejected with 400
        overpay_res = client.post(
            f"/api/admin/rent/records/{rec_id}/payments",
            headers=headers,
            json={
                "amount": 500.0,
                "payment_date": "2026-10-15",
                "payment_method": "Cash"
            }
        )
        assert overpay_res.status_code == 400

# 6. TEST IDEMPOTENT RENT RECORD GENERATION
def test_idempotent_rent_record_generation():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Run sync twice
    res1 = client.post("/api/admin/rent/sync-records", headers=headers)
    assert res1.status_code == 200
    
    res2 = client.post("/api/admin/rent/sync-records", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["new_records_created"] == 0 # 0 duplicates!

# 7. TEST ADMIN WHATSAPP NUMBER CONFIGURATION & CLICK-TO-CHAT FLOW
def test_admin_whatsapp_number_and_reminder_flow():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Admin WhatsApp number validation (10 digits required)
    invalid_res = client.put("/api/admin/rent/settings", headers=headers, json={"admin_whatsapp_number": "12345"})
    assert invalid_res.status_code == 422 or invalid_res.status_code == 400

    # Valid 10-digit number
    valid_res = client.put("/api/admin/rent/settings", headers=headers, json={"admin_whatsapp_number": "9876543210"})
    assert valid_res.status_code == 200
    assert valid_res.json()["admin_whatsapp_number"] == "9876543210"

    # 2. Get records
    res = client.get("/api/admin/rent/records", headers=headers)
    record = res.json()["records"][0]

    # 3. Trigger reminder (force=True to bypass existing cooldown)
    send_res = client.post(f"/api/admin/rent/records/{record['id']}/send-reminder?force=true", headers=headers)
    assert send_res.status_code == 200
    data = send_res.json()
    assert data["success"] == True
    assert data["delivery_status"] == "OPENED"
    assert "whatsapp_url" in data
    assert data["whatsapp_url"].startswith("https://wa.me/91")
    assert "9876543210" in data["whatsapp_url"] # Admin contact number included
    log_id = data["log_id"]

    # 4. Confirm sent
    confirm_res = client.post(f"/api/admin/rent/reminders/{log_id}/confirm-sent", headers=headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["delivery_status"] == "CONFIRMED_SENT"

    # 5. Immediate second send without force must trigger cooldown 400
    dup_res = client.post(f"/api/admin/rent/records/{record['id']}/send-reminder", headers=headers)
    assert dup_res.status_code == 400
    assert "already sent" in dup_res.json()["detail"].lower()

# 8. TEST DASHBOARD STATS CALCULATION
def test_dashboard_stats_endpoint():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/rent/dashboard-stats?month=2026-10", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert "total_active_residents" in stats
    assert "expected_rent" in stats
    assert "collected_rent" in stats
    assert "outstanding_rent" in stats
    assert "whatsapp_status" in stats
    assert stats["total_active_residents"] >= 2
    assert stats["expected_rent"] >= 0

# 9. TEST REMINDER LOGS ENDPOINT
def test_reminder_logs_endpoint():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/rent/reminders/logs", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "logs" in data
    assert "total" in data

# 10. TEST ADMIN AUTHORIZATION SECURITY
def test_admin_authorization_security():
    # Unauthenticated request -> 401
    res = client.get("/api/admin/rent/records")
    assert res.status_code == 401

    # Normal user token -> 403 Forbidden
    user_token = get_user_token()
    res_user = client.get("/api/admin/rent/records", headers={"Authorization": f"Bearer {user_token}"})
    assert res_user.status_code == 403
