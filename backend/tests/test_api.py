import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_rooms():
    response = client.get("/api/rooms")
    assert response.status_code == 200
    rooms = response.json()
    assert isinstance(rooms, list)
    assert len(rooms) >= 6

def test_get_facilities():
    response = client.get("/api/facilities")
    assert response.status_code == 200
    facilities = response.json()
    assert len(facilities) >= 9

def test_get_gallery():
    response = client.get("/api/gallery")
    assert response.status_code == 200
    gallery = response.json()
    assert len(gallery) >= 8

def test_get_pg_details():
    response = client.get("/api/pg-details")
    assert response.status_code == 200
    data = response.json()
    assert "Sri Lakshmi Srinivasa" in data["name"]
    assert "Velachery" in data["address"]

def test_admin_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@srilakshmipg.com",
        "password": "Admin@PG2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"

def test_user_login():
    response = client.post("/api/auth/login", json={
        "email": "karthik.r@example.com",
        "password": "User@PG2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "USER"

def test_contact_submission():
    response = client.post("/api/contact", json={
        "name": "Arun Kumar",
        "phone": "+91 9988776655",
        "email": "arun.test@gmail.com",
        "message": "Testing contact enquiry for double sharing room."
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Arun Kumar"

# ========================================================
# SECURITY & PENETRATION REGRESSION TESTS
# ========================================================

def test_security_resident_cannot_access_admin_endpoints():
    """Ensure regular resident JWT cannot access any admin endpoint (HTTP 403 Forbidden)."""
    user_login = client.post("/api/auth/login", json={
        "email": "karthik.r@example.com",
        "password": "User@PG2026!"
    })
    assert user_login.status_code == 200
    user_token = user_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {user_token}"}

    # Attempt to access admin routes
    endpoints_to_test = [
        ("GET", "/api/admin/analytics"),
        ("GET", "/api/admin/residents"),
        ("GET", "/api/admin/rooms"),
        ("GET", "/api/admin/rent/records"),
        ("GET", "/api/admin/audit-logs"),
        ("GET", "/api/admin/users"),
    ]
    for method, path in endpoints_to_test:
        if method == "GET":
            res = client.get(path, headers=headers)
        elif method == "POST":
            res = client.post(path, headers=headers, json={})
        assert res.status_code == 403, f"Resident was improperly allowed access to {path}"

def test_security_prevent_privilege_escalation_via_registration():
    """Ensure registering users cannot specify role='ADMIN' to gain administrative access."""
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Attacker Hack",
        "email": "attacker@evil.com",
        "phone": "9999999999",
        "password": "HackerPassword123!",
        "role": "ADMIN"  # Attempt to escalate privilege
    })
    if reg_res.status_code == 200:
        data = reg_res.json()
        assert data["user"]["role"] == "USER", "User was granted ADMIN role through public registration parameter"

def test_security_malicious_upload_rejection():
    """Ensure file upload rejects non-image files such as executable scripts (.php, .exe, .py)."""
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@srilakshmipg.com",
        "password": "Admin@PG2026!"
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Attempt to upload dangerous php script
    files = {"file": ("shell.php", b"<?php echo 'hacked'; ?>", "application/x-php")}
    data = {"title": "Exploit Test", "category": "Exterior"}
    res = client.post("/api/admin/gallery/upload", headers=headers, data=data, files=files)
    assert res.status_code == 400
    assert "Invalid image format" in res.json()["detail"]

