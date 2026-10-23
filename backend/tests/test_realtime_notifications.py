import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.models.models import Notification, IssueReport, PushSubscription

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


def test_get_vapid_public_key():
    """Verify VAPID public key endpoint returns a valid URL-safe public key for browsers."""
    res = client.get("/api/notifications/vapid-public-key")
    assert res.status_code == 200
    data = res.json()
    assert "publicKey" in data
    assert len(data["publicKey"]) > 50


def test_push_subscription_crud(admin_token, user_token):
    """Test subscribing and unsubscribing Web Push endpoints."""
    # 1. Non-admin forbidden
    bad_res = client.post(
        "/api/notifications/push-subscribe",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-sub-1",
            "p256dh": "test-p256dh-key-base64",
            "auth": "test-auth-secret"
        }
    )
    assert bad_res.status_code == 403

    # 2. Admin successfully subscribes
    sub_res = client.post(
        "/api/notifications/push-subscribe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-sub-1",
            "p256dh": "test-p256dh-key-base64",
            "auth": "test-auth-secret",
            "user_agent": "Mozilla/5.0 Test Chrome/130.0"
        }
    )
    assert sub_res.status_code == 200
    assert "saved successfully" in sub_res.json()["message"]

    # Verify DB persistence
    db = SessionLocal()
    sub = db.query(PushSubscription).filter(PushSubscription.endpoint == "https://fcm.googleapis.com/fcm/send/test-sub-1").first()
    assert sub is not None
    assert sub.p256dh == "test-p256dh-key-base64"
    db.close()

    # 3. Admin unsubscribes
    unsub_res = client.post(
        "/api/notifications/push-unsubscribe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-sub-1",
            "p256dh": "test-p256dh-key-base64",
            "auth": "test-auth-secret"
        }
    )
    assert unsub_res.status_code == 200


def test_paginated_notifications_and_filtering(admin_token):
    """Test paginated notifications endpoint and filtering."""
    res = client.get(
        "/api/notifications/paginated?page=1&limit=10",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "unread_count" in data
    assert "page" in data
    assert data["page"] == 1
    assert data["page_size"] == 10


def test_report_creation_and_delivery_metadata(user_token, admin_token):
    """Test report creation atomically persists notification with delivery_status and delivery_timestamp."""
    res = client.post(
        "/api/reports",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "issue_category": "Water supply problem",
            "description": "Geyser water heater is not heating water in the morning"
        }
    )
    assert res.status_code == 201
    report = res.json()
    assert "REP-" in report["report_code"]

    # Check notification delivery metadata
    admin_notifs = client.get(
        "/api/notifications?paginated=true",
        headers={"Authorization": f"Bearer {admin_token}"}
    ).json()

    matched = next((n for n in admin_notifs["items"] if n.get("report_id") == report["id"]), None)
    assert matched is not None
    assert "🔔 Sri Lakshmi PG — New Issue Report" in matched["title"]
    assert matched["delivery_status"] == "DELIVERED"
    assert matched["delivery_timestamp"] is not None


def test_deduplication_guard(user_token):
    """Test submitting identical report within 60s returns existing report without duplicating."""
    unique_desc = "Testing deduplication guard specific description xyz"
    # First submission
    res1 = client.post(
        "/api/reports",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "issue_category": "Electrical problem",
            "description": unique_desc
        }
    )
    assert res1.status_code == 201
    rep1 = res1.json()

    # Second submission (immediate retry)
    res2 = client.post(
        "/api/reports",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "issue_category": "Electrical problem",
            "description": unique_desc
        }
    )
    assert res2.status_code == 201
    rep2 = res2.json()

    # Must be the exact same report ID and report code (no duplicate created)
    assert rep1["id"] == rep2["id"]
    assert rep1["report_code"] == rep2["report_code"]


def test_test_push_endpoint(admin_token, user_token):
    """Test test-push endpoint authorization."""
    unauth = client.post("/api/notifications/test-push", headers={"Authorization": f"Bearer {user_token}"})
    assert unauth.status_code == 403

    auth = client.post("/api/notifications/test-push", headers={"Authorization": f"Bearer {admin_token}"})
    assert auth.status_code == 200
    assert "dispatched" in auth.json()["message"]


def test_websocket_authorization(user_token):
    """Test that connecting without token or with resident token is rejected."""
    # 1. No token
    with pytest.raises(Exception):
        with client.websocket_connect("/api/notifications/ws") as ws:
            pass

    # 2. Resident token (non-admin)
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/notifications/ws?token={user_token}") as ws:
            pass
