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
