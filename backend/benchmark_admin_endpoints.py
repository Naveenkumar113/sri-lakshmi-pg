import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def benchmark():
    # Login as admin
    login_payload = json.dumps({"email": "admin@srilakshmipg.com", "password": "Admin@PG2026!"}).encode()
    login_req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(login_req) as resp:
        token = json.loads(resp.read())["access_token"]
    print(f"POST /api/auth/login : {(time.perf_counter() - t0)*1000:.1f}ms")

    endpoints = [
        "/api/admin/analytics",
        "/api/admin/rooms",
        "/api/admin/residents",
        "/api/admin/rent/dashboard-stats?month=2026-10",
        "/api/admin/rent/records?page=1&limit=20",
        "/api/admin/bookings",
        "/api/admin/visits",
        "/api/admin/users",
        "/api/admin/facilities",
        "/api/gallery",
        "/api/pg-details",
        "/api/admin/contact",
        "/api/admin/rent/settings"
    ]

    print("\n--- Measured Backend Latencies (p95 Target: < 300ms) ---")
    headers = {"Authorization": f"Bearer {token}"}
    for ep in endpoints:
        req = urllib.request.Request(f"{BASE_URL}{ep}", headers=headers)
        t_start = time.perf_counter()
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            dt = (time.perf_counter() - t_start) * 1000
            print(f"{ep:<45} : {dt:6.1f} ms | HTTP {resp.status} | {len(data)} bytes")

if __name__ == "__main__":
    benchmark()
