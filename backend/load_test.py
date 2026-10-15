"""
Asynchronous High-Concurrency Load Testing Script
Simulates stepped concurrent users (50, 100, 250, 500, 750, 1000)
Measuring throughput, p95, p99, error rates, and database stability.
"""
import asyncio
import time
import statistics
import aiohttp

BASE_URL = "http://127.0.0.1:8000"

ENDPOINTS = [
    ("GET", "/api/health"),
    ("GET", "/api/rooms"),
    ("GET", "/api/facilities"),
    ("GET", "/api/gallery"),
    ("GET", "/api/pg-details"),
]

async def simulate_user(session, user_id, results):
    for method, path in ENDPOINTS:
        url = f"{BASE_URL}{path}"
        start = time.perf_counter()
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                await resp.read()
                latency = (time.perf_counter() - start) * 1000
                results.append((resp.status, latency))
        except Exception as e:
            latency = (time.perf_counter() - start) * 1000
            results.append((500, latency))

async def run_stage(concurrency):
    results = []
    print(f"\n--- Running Load Stage: {concurrency} Concurrent Users ---")
    conn = aiohttp.TCPConnector(limit=concurrency + 50)
    async with aiohttp.ClientSession(connector=conn) as session:
        tasks = [simulate_user(session, i, results) for i in range(concurrency)]
        t0 = time.perf_counter()
        await asyncio.gather(*tasks)
        total_time = time.perf_counter() - t0

    latencies = [lat for status, lat in results]
    success_count = sum(1 for status, lat in results if 200 <= status < 300)
    failed_count = len(results) - success_count
    rps = len(results) / total_time if total_time > 0 else 0

    p50 = statistics.median(latencies) if latencies else 0
    p95 = statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 100 else (max(latencies) if latencies else 0)
    p99 = statistics.quantiles(latencies, n=100)[98] if len(latencies) >= 100 else (max(latencies) if latencies else 0)
    avg = statistics.mean(latencies) if latencies else 0
    error_rate = (failed_count / len(results) * 100) if results else 0

    print(f"Total Requests: {len(results)}")
    print(f"Throughput: {rps:.1f} req/sec | Elapsed: {total_time:.2f}s")
    print(f"Success: {success_count} | Failed: {failed_count} (Error Rate: {error_rate:.2f}%)")
    print(f"Latency -> Avg: {avg:.1f}ms | Median: {p50:.1f}ms | p95: {p95:.1f}ms | p99: {p99:.1f}ms")

if __name__ == "__main__":
    for level in [50, 100, 250, 500, 750, 1000]:
        asyncio.run(run_stage(level))
