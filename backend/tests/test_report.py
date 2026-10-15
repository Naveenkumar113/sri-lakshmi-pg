import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/auth/login", json={
        "email": "admin@srilakshmipg.com",
        "password": "Admin@PG2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def user_token():
    res = client.post("/api/auth/login", json={
        "email": "karthik.r@example.com",
        "password": "User@PG2026!"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

def test_get_issue_categories():
    res = client.get("/api/reports/categories")
    assert res.status_code == 200
    cats = res.json()["categories"]
    assert len(cats) >= 15
    assert "Room cleaning not completed today" in cats
    assert "Wi-Fi or internet problem" in cats

def test_get_my_info_authenticated(user_token):
    res = client.get("/api/reports/my-info", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "resident_name" in data
    assert "phone" in data
    assert "has_active_bed" in data

def test_unauthenticated_cannot_report():
    res = client.post("/api/reports", json={
        "issue_category": "Electrical problem",
        "description": "Light switch not working"
    })
    assert res.status_code == 401

def test_user_can_submit_report(user_token):
    res = client.post(
        "/api/reports",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "issue_category": "Room cleaning not completed today",
            "description": "Trash can not cleared and floor needs mopping"
        }
    )
    assert res.status_code == 201
    report = res.json()
    assert "REP-" in report["report_code"]
    assert report["issue_category"] == "Room cleaning not completed today"
    assert report["status"] == "OPEN"
    assert report["resident_name"] is not None
    assert report["resident_phone"] is not None

def test_user_can_view_my_reports(user_token):
    res = client.get("/api/reports/my", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    assert any("Room cleaning" in r["issue_category"] for r in data["items"])

def test_non_admin_cannot_access_admin_reports(user_token):
    res = client.get("/api/admin/reports", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403

def test_admin_can_view_and_manage_reports(admin_token, user_token):
    # 1. User creates a report
    create_res = client.post(
        "/api/reports",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "issue_category": "Plumbing or leakage problem",
            "description": "Washbasin tap dripping continuously"
        }
    )
    assert create_res.status_code == 201
    report_id = create_res.json()["id"]

    # 2. Admin retrieves reports list
    list_res = client.get("/api/admin/reports", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert any(r["id"] == report_id for r in items)

    # 3. Admin updates status to IN_PROGRESS
    prog_res = client.put(
        f"/api/admin/reports/{report_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "IN_PROGRESS", "resolution_notes": "Plumber assigned"}
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # 4. Admin marks as RESOLVED
    res_res = client.put(
        f"/api/admin/reports/{report_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "RESOLVED", "resolution_notes": "Replaced the washer in the tap"}
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "RESOLVED"
    assert res_res.json()["resolved_at"] is not None
    assert "Replaced the washer" in res_res.json()["resolution_notes"]

    # 5. Check user sees RESOLVED status
    my_res = client.get("/api/reports/my", headers={"Authorization": f"Bearer {user_token}"})
    assert my_res.status_code == 200
    matching = next(r for r in my_res.json()["items"] if r["id"] == report_id)
    assert matching["status"] == "RESOLVED"
    assert "Replaced the washer" in matching["resolution_notes"]
