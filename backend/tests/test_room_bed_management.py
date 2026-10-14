import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.models.models import Room, RoomBed, Resident, BedAllocation, ResidentHistory, User, Booking

client = TestClient(app)

def _clean_test_db():
    db = SessionLocal()
    try:
        # Delete test bookings
        test_users = db.query(User).filter(User.email.in_(["booking.applicant@test.com"])).all()
        for u in test_users:
            db.query(Booking).filter(Booking.user_id == u.id).delete()

        # Delete test rooms & allocations
        test_rooms = db.query(Room).filter(Room.room_number.in_(["S-2", "T-1"])).all()
        for r in test_rooms:
            bed_ids = [b.id for b in r.beds]
            if bed_ids:
                db.query(BedAllocation).filter(BedAllocation.bed_id.in_(bed_ids)).delete()
                db.query(RoomBed).filter(RoomBed.room_id == r.id).delete()
            db.delete(r)

        # Delete test residents & histories
        test_res = db.query(Resident).filter(
            Resident.email.in_([
                "arun.test.s2@example.com",
                "karthik.test.s2@example.com",
                "naveen.test.s2@example.com",
                "fourth@example.com",
                "booking.applicant@test.com"
            ])
        ).all()
        for res in test_res:
            db.query(ResidentHistory).filter(ResidentHistory.resident_id == res.id).delete()
            db.query(BedAllocation).filter(BedAllocation.resident_id == res.id).delete()
            db.delete(res)

        for u in test_users:
            db.delete(u)

        db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()

@pytest.fixture(autouse=True, scope="module")
def cleanup_before_and_after():
    _clean_test_db()
    yield
    _clean_test_db()

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

def test_unauthorized_access():
    """Scenario 14: An unauthorized user cannot access admin APIs."""
    # Without token
    res = client.get("/api/admin/rooms")
    assert res.status_code in [401, 403]

    # With regular user token
    user_token = get_user_token()
    headers = {"Authorization": f"Bearer {user_token}"}
    res = client.get("/api/admin/rooms", headers=headers)
    assert res.status_code == 403

    res = client.get("/api/admin/residents", headers=headers)
    assert res.status_code == 403

def test_room_creation_and_bed_generation():
    """Scenario 1: Admin creates room S-2 with three beds."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Delete S-2 if it existed in test run
    _clean_test_db()

    create_payload = {
        "room_number": "S-2",
        "floor": 1,
        "room_type": "Non-AC",
        "sharing_type": "Triple Sharing",
        "capacity": 3,
        "available_beds": 3,
        "monthly_rent": 5500.0,
        "monthly_rent_per_bed": 5500.0,
        "is_ac": False,
        "status": "AVAILABLE",
        "description": "Well ventilated triple sharing room on floor 1"
    }
    res = client.post("/api/admin/rooms", json=create_payload, headers=headers)
    assert res.status_code == 200, res.text
    room = res.json()
    assert room["room_number"] == "S-2"
    assert room["capacity"] == 3
    assert room["available_beds"] == 3
    assert room["occupied_beds"] == 0
    assert len(room["beds"]) == 3

    # Beds should be Bed 1, Bed 2, Bed 3
    bed_numbers = [b["bed_number"] for b in room["beds"]]
    assert "Bed 1" in bed_numbers
    assert "Bed 2" in bed_numbers
    assert "Bed 3" in bed_numbers

def test_add_residents_and_unique_ids():
    """
    Scenario 2 & 3: Admin adds two residents.
    System generates unique IDs (SLPG-xxxx).
    Scenario 4: Room S-2 shows two occupied beds and one available bed.
    """
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch room S-2
    res_list = client.get("/api/admin/rooms", headers=headers).json()
    room_s2 = next(r for r in res_list if r["room_number"] == "S-2")
    bed1 = room_s2["beds"][0]
    bed2 = room_s2["beds"][1]
    bed3 = room_s2["beds"][2]

    # Add resident 1 (Method B)
    res1_payload = {
        "full_name": "Arun Kumar Test",
        "phone": "9111122222",
        "email": "arun.test.s2@example.com",
        "occupation": "Analyst",
        "room_id": room_s2["id"],
        "bed_id": bed1["id"],
        "move_in_date": "2026-03-01"
    }
    r1 = client.post("/api/admin/residents", json=res1_payload, headers=headers)
    assert r1.status_code == 200, r1.text
    resident1 = r1.json()
    assert resident1["resident_code"].startswith("SLPG-")
    assert resident1["current_room_number"] == "S-2"
    assert resident1["current_bed_number"] == bed1["bed_number"]

    # Add resident 2 (Method B)
    res2_payload = {
        "full_name": "Karthik Test",
        "phone": "9222233333",
        "email": "karthik.test.s2@example.com",
        "occupation": "Designer",
        "room_id": room_s2["id"],
        "bed_id": bed2["id"],
        "move_in_date": "2026-03-01"
    }
    r2 = client.post("/api/admin/residents", json=res2_payload, headers=headers)
    assert r2.status_code == 200, r2.text
    resident2 = r2.json()
    assert resident2["resident_code"].startswith("SLPG-")
    assert resident2["resident_code"] != resident1["resident_code"]

    # Scenario 4: Room S-2 shows 2 occupied beds and 1 available bed
    room_check = client.get(f"/api/admin/rooms/{room_s2['id']}", headers=headers).json()
    assert room_check["capacity"] == 3
    assert room_check["occupied_beds"] == 2
    assert room_check["available_beds"] == 1
    assert room_check["status"] == "PARTIALLY_AVAILABLE"

def test_add_third_resident_and_room_full():
    """
    Scenario 5: Admin adds a third resident.
    Scenario 6: Room S-2 becomes full.
    Scenario 7: A fourth resident cannot be allocated to S-2.
    """
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    res_list = client.get("/api/admin/rooms", headers=headers).json()
    room_s2 = next(r for r in res_list if r["room_number"] == "S-2")
    bed3 = room_s2["beds"][2]

    # Add resident 3 into Bed 3
    res3_payload = {
        "full_name": "Naveen Test",
        "phone": "9333344444",
        "email": "naveen.test.s2@example.com",
        "occupation": "Product Engineer",
        "room_id": room_s2["id"],
        "bed_id": bed3["id"],
        "move_in_date": "2026-03-02"
    }
    r3 = client.post("/api/admin/residents", json=res3_payload, headers=headers)
    assert r3.status_code == 200, r3.text
    resident3 = r3.json()
    assert resident3["resident_code"].startswith("SLPG-")

    # Scenario 6: Room S-2 shows occupied: 3, available: 0, status: FULL
    room_check = client.get(f"/api/admin/rooms/{room_s2['id']}", headers=headers).json()
    assert room_check["occupied_beds"] == 3
    assert room_check["available_beds"] == 0
    assert room_check["status"] == "FULL"

    # Scenario 7: A fourth resident cannot be allocated to S-2
    res4_payload = {
        "full_name": "Fourth Resident",
        "phone": "9444455555",
        "email": "fourth@example.com",
        "room_id": room_s2["id"],
        "bed_id": bed3["id"],
        "move_in_date": "2026-03-03"
    }
    r4 = client.post("/api/admin/residents", json=res4_payload, headers=headers)
    assert r4.status_code == 400
    assert "already occupied" in r4.text or "full capacity" in r4.text

def test_resident_checkout():
    """
    Scenario 8 & 9: Admin checks out one resident. One bed becomes available.
    Room occupancy updates automatically.
    """
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch room S-2
    room_s2 = client.get("/api/admin/rooms", headers=headers).json()
    room_s2 = next(r for r in room_s2 if r["room_number"] == "S-2")

    # Get allocation for Bed 2
    bed2 = room_s2["beds"][1]
    assert bed2["is_occupied"] is True
    allocation_id = bed2["current_allocation_id"]
    resident_id = bed2["current_occupant_id"]

    # Checkout resident
    checkout_res = client.put(f"/api/admin/allocations/{allocation_id}/checkout", json={
        "checkout_date": "2026-04-01",
        "notes": "Relocating to another city"
    }, headers=headers)
    assert checkout_res.status_code == 200

    # Room S-2 must now have 2 occupied and 1 available
    room_check = client.get(f"/api/admin/rooms/{room_s2['id']}", headers=headers).json()
    assert room_check["occupied_beds"] == 2
    assert room_check["available_beds"] == 1
    assert room_check["status"] == "PARTIALLY_AVAILABLE"

    # Checked out resident profile and ID are preserved
    res_profile = client.get(f"/api/admin/residents/{resident_id}", headers=headers).json()
    assert res_profile["resident_status"] == "CHECKED_OUT"
    assert len(res_profile["history"]) >= 2

def test_room_transfer():
    """
    Scenario 10 & 11: Admin transfers a resident to another room.
    The old bed becomes free and the new bed becomes occupied atomically.
    Resident ID remains unchanged.
    """
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    rooms = client.get("/api/admin/rooms", headers=headers).json()
    room_s2 = next(r for r in rooms if r["room_number"] == "S-2")

    # Create destination room T-1
    t1_payload = {
        "room_number": "T-1",
        "floor": 2,
        "room_type": "AC",
        "sharing_type": "Single Sharing",
        "capacity": 1,
        "available_beds": 1,
        "monthly_rent": 10000.0,
        "is_ac": True,
        "status": "AVAILABLE"
    }
    client.post("/api/admin/rooms", json=t1_payload, headers=headers)
    rooms = client.get("/api/admin/rooms", headers=headers).json()
    room_t1 = next(r for r in rooms if r["room_number"] == "T-1")
    target_bed = room_t1["beds"][0]

    # Find active allocation in S-2 (e.g. Bed 1)
    bed1 = room_s2["beds"][0]
    alloc_id = bed1["current_allocation_id"]
    res_code_before = bed1["current_resident_code"]

    transfer_res = client.put(f"/api/admin/allocations/{alloc_id}/transfer", json={
        "new_room_id": room_t1["id"],
        "new_bed_id": target_bed["id"],
        "transfer_date": "2026-04-10",
        "notes": "Upgraded to AC single room"
    }, headers=headers)
    assert transfer_res.status_code == 200, transfer_res.text

    # Old room S-2 bed 1 must be free
    s2_updated = client.get(f"/api/admin/rooms/{room_s2['id']}", headers=headers).json()
    bed1_updated = next(b for b in s2_updated["beds"] if b["id"] == bed1["id"])
    assert bed1_updated["is_occupied"] is False

    # New room T-1 bed must be occupied
    t1_updated = client.get(f"/api/admin/rooms/{room_t1['id']}", headers=headers).json()
    assert t1_updated["occupied_beds"] == 1
    assert t1_updated["available_beds"] == 0
    assert t1_updated["status"] == "FULL"

    # Resident ID must be unchanged
    assert t1_updated["beds"][0]["current_resident_code"] == res_code_before

def test_booking_approval_creates_resident_and_bed_allocation():
    """
    Scenario 12: Method A - Booking approval allocates bed and generates resident ID.
    """
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Register a new website user with 10-digit phone
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Booking Applicant",
        "email": "booking.applicant@test.com",
        "phone": "9888877777",
        "password": "Password123!",
        "occupation": "Consultant"
    })
    assert reg_res.status_code == 200
    user_data = reg_res.json()["user"]
    user_token = reg_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # User submits room booking request
    book_res = client.post("/api/bookings", json={
        "room_type": "Double Sharing",
        "is_ac": True,
        "preferred_joining_date": "2026-05-01",
        "stay_duration_months": 6,
        "message": "Looking forward to moving in."
    }, headers=user_headers)
    assert book_res.status_code == 200
    booking_id = book_res.json()["id"]

    # Admin approves booking
    approve_res = client.put(f"/api/admin/bookings/{booking_id}/approve", json={
        "admin_notes": "Welcome to Sri Lakshmi PG!"
    }, headers=headers)
    assert approve_res.status_code == 200
    approved_booking = approve_res.json()
    assert approved_booking["status"] == "APPROVED"
    assert approved_booking["allocated_bed"] is not None

    # Verify Resident was created and linked to this user
    residents = client.get(f"/api/admin/residents?search={user_data['phone']}", headers=headers).json()
    assert len(residents) >= 1
    applicant_resident = residents[0]
    assert applicant_resident["resident_code"].startswith("SLPG-")
    assert applicant_resident["user_id"] == user_data["id"]
    assert applicant_resident["current_room_number"] is not None

def test_phone_number_strict_validation():
    """Test strict 10-digit Indian phone validation (digits 0-9 only)."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Reject alphabetic characters
    r_alpha = client.post("/api/admin/residents", json={
        "full_name": "Invalid Alpha",
        "phone": "98765abc10",
        "move_in_date": "2026-03-01"
    }, headers=headers)
    assert r_alpha.status_code in [400, 422]

    # 2. Reject special characters
    r_spec = client.post("/api/admin/residents", json={
        "full_name": "Invalid Special",
        "phone": "98765@2100",
        "move_in_date": "2026-03-01"
    }, headers=headers)
    assert r_spec.status_code in [400, 422]

    # 3. Reject fewer than 10 digits
    r_short = client.post("/api/admin/residents", json={
        "full_name": "Invalid Short",
        "phone": "98765",
        "move_in_date": "2026-03-01"
    }, headers=headers)
    assert r_short.status_code in [400, 422]

    # 4. Reject more than 10 digits
    r_long = client.post("/api/admin/residents", json={
        "full_name": "Invalid Long",
        "phone": "987654321012",
        "move_in_date": "2026-03-01"
    }, headers=headers)
    assert r_long.status_code in [400, 422]

def test_sharing_type_validation_and_automatic_capacity():
    """Test dynamic sharing capacity (1 to 20 persons), automatic sharing label, and bed generation."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Reject invalid capacities (0, negative, > 20)
    for bad_cap in [0, -1, 21, 50]:
        r_bad = client.post("/api/admin/rooms", json={
            "room_number": f"ERR-{bad_cap}",
            "floor": 1,
            "room_type": "Non-AC",
            "capacity": bad_cap,
            "is_ac": False
        }, headers=headers)
        assert r_bad.status_code in [400, 422], f"Expected rejection for capacity {bad_cap}"

    # 2. Test dynamic capacity = 7 (Seven Sharing) generates exactly 7 beds
    r_seven = client.post("/api/admin/rooms", json={
        "room_number": "TEST-SEVEN-7",
        "floor": 2,
        "room_type": "Non-AC",
        "capacity": 7,
        "is_ac": False
    }, headers=headers)
    assert r_seven.status_code == 200, r_seven.text
    seven_data = r_seven.json()
    assert seven_data["capacity"] == 7
    assert seven_data["sharing_type"] == "Seven Sharing"
    assert len(seven_data["beds"]) == 7
    bed_numbers = [b["bed_number"] for b in seven_data["beds"]]
    assert bed_numbers == [f"Bed {i}" for i in range(1, 8)]

    room_id = seven_data["id"]

    # 3. Test increasing capacity from 7 to 8 adds Bed 8
    r_update_inc = client.put(f"/api/admin/rooms/{room_id}", json={
        "capacity": 8
    }, headers=headers)
    assert r_update_inc.status_code == 200
    inc_data = r_update_inc.json()
    assert inc_data["capacity"] == 8
    assert inc_data["sharing_type"] == "Eight Sharing"
    assert len(inc_data["beds"]) == 8

    # 4. Test decreasing capacity from 8 to 6 safely removes unoccupied beds
    r_update_dec = client.put(f"/api/admin/rooms/{room_id}", json={
        "capacity": 6
    }, headers=headers)
    assert r_update_dec.status_code == 200
    dec_data = r_update_dec.json()
    assert dec_data["capacity"] == 6
    assert dec_data["sharing_type"] == "Six Sharing"
    assert len(dec_data["beds"]) == 6

    # 5. Cleanup
    client.delete(f"/api/admin/rooms/{room_id}", headers=headers)
