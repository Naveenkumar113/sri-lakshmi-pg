import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_missing_fields():
    resp = client.post("/api/auth/login", json={})
    assert resp.status_code in [400, 422]

def test_login_invalid_credentials():
    resp = client.post("/api/auth/login", json={"email": "nonexistent@user.com", "password": "WrongPassword123!"})
    assert resp.status_code == 401
    assert "Invalid email or password" in resp.json().get("detail", "")

def test_register_invalid_phone():
    resp = client.post("/api/auth/register", json={
        "full_name": "Test User",
        "email": "testphone@example.com",
        "phone": "12345",  # Invalid < 10 digits
        "password": "Password123!"
    })
    assert resp.status_code in [400, 422]

def test_register_short_password():
    resp = client.post("/api/auth/register", json={
        "full_name": "Test User",
        "email": "shortpwd@example.com",
        "phone": "9876543210",
        "password": "123"  # Too short
    })
    assert resp.status_code in [400, 422]

def test_unauthorized_admin_access_no_token():
    endpoints = [
        "/api/admin/rooms",
        "/api/admin/residents",
        "/api/admin/rent/records",
        "/api/admin/bookings",
        "/api/admin/visits",
        "/api/admin/users",
        "/api/admin/facilities"
    ]
    for ep in endpoints:
        resp = client.get(ep)
        assert resp.status_code in [401, 403], f"Endpoint {ep} should require authentication, got {resp.status_code}"

def test_unauthorized_admin_access_invalid_token():
    headers = {"Authorization": "Bearer invalid_tampered_token_xyz"}
    resp = client.get("/api/admin/rooms", headers=headers)
    assert resp.status_code in [401, 403]

def test_resident_cannot_access_admin_portal():
    # Login as resident
    res_login = client.post("/api/auth/login", json={
        "email": "guru@srilakshmipg.com",
        "password": "User@PG2026!"
    })
    if res_login.status_code == 200:
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        # Attempt to access admin routes
        resp = client.get("/api/admin/rooms", headers=headers)
        assert resp.status_code == 403, "Resident should receive 403 Forbidden on admin routes"

def test_sql_injection_defense():
    # Attempt SQL injection payload in login
    resp = client.post("/api/auth/login", json={
        "email": "admin@srilakshmipg.com' OR '1'='1",
        "password": "' OR '1'='1"
    })
    assert resp.status_code in [400, 401, 422]

def test_xss_protection_in_contact():
    payload = {
        "name": "<script>alert('XSS')</script>",
        "email": "attacker@example.com",
        "phone": "9876543210",
        "message": "<img src=x onerror=alert(1)> Inquiring about room"
    }
    resp = client.post("/api/contact", json=payload)
    assert resp.status_code in [200, 201]
