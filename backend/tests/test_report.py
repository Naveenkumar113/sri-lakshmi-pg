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

def test_user_can_submit_report_and_creates_admin_notification(user_token, admin_token):
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

    # Check that in-app notification exists for admin with direct link
    admin_notifs_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_notifs_res.status_code == 200
    notifs = admin_notifs_res.json()
    admin_rep_notif = next((n for n in notifs if n.get("report_id") == report["id"]), None)
    assert admin_rep_notif is not None
    assert f"#{report['report_code']}" in admin_rep_notif["title"]
    assert f"/admin/reports?report_id={report['id']}" in admin_rep_notif["link"]

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

def test_admin_can_view_and_manage_reports_and_notifies_resident(admin_token, user_token):
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
    report_code = create_res.json()["report_code"]

    # 2. Admin retrieves reports list
    list_res = client.get("/api/admin/reports", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert any(r["id"] == report_id for r in items)

    # 3. Admin updates status to IN_PROGRESS
    prog_res = client.put(
        f"/api/admin/reports/{report_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "IN_PROGRESS", "resolution_notes": "Plumber assigned to Room"}
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

    # 5. Check resident received in-app resolution notification
    user_notifs_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {user_token}"})
    assert user_notifs_res.status_code == 200
    user_notifs = user_notifs_res.json()
    resolved_notif = next((n for n in user_notifs if n.get("report_id") == report_id and "Resolved" in n["title"]), None)
    assert resolved_notif is not None
    assert f"#{report_code}" in resolved_notif["title"]
    assert f"/report?report_id={report_id}" in resolved_notif["link"]

    # 6. Check user sees RESOLVED status in report list
    my_res = client.get("/api/reports/my", headers={"Authorization": f"Bearer {user_token}"})
    assert my_res.status_code == 200
    matching = next(r for r in my_res.json()["items"] if r["id"] == report_id)
    assert matching["status"] == "RESOLVED"
    assert "Replaced the washer" in matching["resolution_notes"]

def test_notification_mark_as_read_and_unread_count(user_token):
    # Fetch unread count
    count_res = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {user_token}"})
    assert count_res.status_code == 200
    assert "unread_count" in count_res.json()

    # Get notification list
    list_res = client.get("/api/notifications", headers={"Authorization": f"Bearer {user_token}"})
    assert list_res.status_code == 200
    notifs = list_res.json()
    if notifs:
        target_id = notifs[0]["id"]
        # Mark as read
        read_res = client.put(f"/api/notifications/{target_id}/read", headers={"Authorization": f"Bearer {user_token}"})
        assert read_res.status_code == 200
        assert read_res.json()["message"] == "Notification marked as read."
