import sys
import json
import requests
from datetime import datetime

# Ensure utf-8 stdout on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"

def run_verification():
    print("=" * 60)
    print("STARTING COMPLETE END-TO-END NOTIFICATION FLOW VERIFICATION")
    print("=" * 60)

    # 1. Login as resident
    print("\n[Step 1] Logging in as resident...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "karthik.r@example.com",
        "password": "User@PG2026!"
    })
    assert res.status_code == 200, f"Resident login failed: {res.text}"
    user_token = res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("  [OK] Resident login successful.")

    # 2. Login as admin
    print("\n[Step 2] Logging in as admin...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@srilakshmipg.com",
        "password": "Admin@PG2026!"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  [OK] Admin login successful.")

    # Get initial admin unread count
    initial_unread_res = requests.get(f"{BASE_URL}/notifications/unread-count", headers=admin_headers)
    assert initial_unread_res.status_code == 200
    initial_unread_count = initial_unread_res.json()["count"]
    print(f"  [OK] Initial admin unread notification count: {initial_unread_count}")

    # 3. Submit new issue report as resident
    unique_issue_desc = f"Ceiling fan speed regulator knob broken - run at {datetime.utcnow().isoformat()}"
    print(f"\n[Step 3] Submitting issue report as resident: 'Electrical problem'...")
    create_res = requests.post(f"{BASE_URL}/reports", headers=user_headers, json={
        "issue_category": "Electrical problem",
        "description": unique_issue_desc
    })
    assert create_res.status_code == 201, f"Report creation failed: {create_res.text}"
    report_data = create_res.json()
    report_id = report_data["id"]
    report_code = report_data["report_code"]
    print(f"  [OK] Issue report created: ID={report_id}, Code={report_code}, Status={report_data['status']}")

    # 4. Verify admin unread count increased
    print("\n[Step 4] Checking admin unread count update...")
    new_unread_res = requests.get(f"{BASE_URL}/notifications/unread-count", headers=admin_headers)
    assert new_unread_res.status_code == 200
    new_unread_count = new_unread_res.json()["count"]
    print(f"  [OK] New admin unread count: {new_unread_count} (Previous: {initial_unread_count})")
    assert new_unread_count >= initial_unread_count + 1, "Unread count did not increment!"

    # 5. Verify admin notification content and metadata
    print("\n[Step 5] Fetching admin notification items...")
    notifs_res = requests.get(f"{BASE_URL}/notifications?paginated=true&limit=10", headers=admin_headers)
    assert notifs_res.status_code == 200
    notifs_data = notifs_res.json()
    matched_notif = next((n for n in notifs_data["items"] if n.get("report_id") == report_id), None)
    assert matched_notif is not None, "Notification for report not found in admin inbox!"
    
    print(f"  [OK] Notification ID: {matched_notif['id']}")
    print(f"  [OK] Notification Title: {matched_notif['title']}")
    print(f"  [OK] Notification Message: {matched_notif['message']}")
    print(f"  [OK] Notification Delivery Status: {matched_notif.get('delivery_status')}")
    print(f"  [OK] Notification Link: {matched_notif.get('link')}")
    print(f"  [OK] Notification Is Read: {matched_notif['is_read']}")

    assert matched_notif["is_read"] is False, "Notification should initially be unread"
    assert report_code in matched_notif["title"] or report_code in matched_notif["message"]

    # 6. Test Mark-as-read flow
    print(f"\n[Step 6] Marking notification {matched_notif['id']} as read...")
    read_res = requests.put(f"{BASE_URL}/notifications/{matched_notif['id']}/read", headers=admin_headers)
    assert read_res.status_code == 200, f"Mark as read failed: {read_res.text}"
    read_data = read_res.json()
    assert read_data["is_read"] is True, "Notification did not mark as read"
    print(f"  [OK] Notification marked read: read_at={read_data['read_at']}")

    # 7. Verify admin unread count decreased
    after_read_unread_res = requests.get(f"{BASE_URL}/notifications/unread-count", headers=admin_headers)
    assert after_read_unread_res.status_code == 200
    after_read_count = after_read_unread_res.json()["count"]
    print(f"  [OK] Admin unread count after marking read: {after_read_count} (Decreased from {new_unread_count})")
    assert after_read_count == new_unread_count - 1

    # 8. Test persistence: reload list
    print("\n[Step 8] Testing notification persistence across re-fetch...")
    reload_notifs = requests.get(f"{BASE_URL}/notifications?paginated=true&limit=10", headers=admin_headers).json()
    reloaded_item = next((n for n in reload_notifs["items"] if n["id"] == matched_notif["id"]), None)
    assert reloaded_item is not None
    assert reloaded_item["is_read"] is True, "Read state did not persist!"
    print("  [OK] Notification persisted with correct read status in PostgreSQL.")

    # 9. Test Security & Authorization Isolation: Resident cannot access admin notifications
    print("\n[Step 9] Testing role authorization: resident forbidden from admin paginated inbox...")
    forbidden_res = requests.get(f"{BASE_URL}/notifications/paginated", headers=user_headers)
    assert forbidden_res.status_code == 403, f"Expected 403 Forbidden, got {forbidden_res.status_code}"
    print("  [OK] Resident correctly forbidden (403) from accessing admin notifications.")

    # 10. Test Resident Reports Isolation: Resident cannot see other residents' reports
    print("\n[Step 10] Testing report access: resident only sees their own reports...")
    my_reports_res = requests.get(f"{BASE_URL}/reports/my", headers=user_headers)
    assert my_reports_res.status_code == 200
    my_reports = my_reports_res.json()["items"]
    for r in my_reports:
        assert r["user_id"] == report_data["user_id"], "Found another user's report in /reports/my!"
    print(f"  [OK] Resident successfully verified isolation ({len(my_reports)} user reports returned).")

    # 11. Test Deduplication Guard: immediate duplicate submission suppressed
    print("\n[Step 11] Testing deduplication guard...")
    dup_res = requests.post(f"{BASE_URL}/reports", headers=user_headers, json={
        "issue_category": "Electrical problem",
        "description": unique_issue_desc
    })
    assert dup_res.status_code == 200 or dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["id"] == report_id, "Deduplication did not return existing report!"
    print("  [OK] Deduplication guard successfully prevented duplicate insertion.")

    print("\n" + "=" * 60)
    print("ALL 11 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_verification()
