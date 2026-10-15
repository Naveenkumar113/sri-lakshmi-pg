"""
Simultaneous Login Load Testing Suite (50, 100, 200, 300, 500 Concurrent Users)
Measures concurrent authentication throughput, p50, p95, p99 latency, and error rates.
"""
import asyncio
import time
import statistics
import aiohttp
import sys

BASE_URL = "http://127.0.0.1:8000"

async def attempt_login(session, user_index, results):
    url = f"{BASE_URL}/api/auth/login"
    payload = {
        "email": "admin@srilakshmipg.com",
        "password": "Admin@PG2026!"
    }
    # Simulate client IP variation to mirror real users
    headers = {
        "X-Forwarded-For": f"192.168.1.{ (user_index % 250) + 1 }",
        "Content-Type": "application/json"
    }
    start = time.perf_counter()
    try:
        async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            data = await resp.read()
            latency = (time.perf_counter() - start) * 1000
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        results.append((500, latency, str(type(e).__name__) + ": " + str(e)))
    else:
        results.append((resp.status, latency, None))

async def run_login_stage(concurrency):
    results = []
    print(f"\n========================================================")
    print(f"  Testing {concurrency} Simultaneous Login Attempts")
    print(f"========================================================")
    conn = aiohttp.TCPConnector(limit=concurrency + 50)
    async with aiohttp.ClientSession(connector=conn) as session:
        tasks = [attempt_login(session, i, results) for i in range(concurrency)]
        t0 = time.perf_counter()
        await asyncio.gather(*tasks)
        total_time = time.perf_counter() - t0

    latencies = [lat for status, lat, err in results]
    success_count = sum(1 for status, lat, err in results if 200 <= status < 300)
    failed_count = len(results) - success_count
    rps = len(results) / total_time if total_time > 0 else 0
    errors = [err for status, lat, err in results if err is not None]
    if errors:
        print(f"Sample error: {errors[0]}")

    p50 = statistics.median(latencies) if latencies else 0
    p95 = statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 100 else (max(latencies) if latencies else 0)
    p99 = statistics.quantiles(latencies, n=100)[98] if len(latencies) >= 100 else (max(latencies) if latencies else 0)
    avg = statistics.mean(latencies) if latencies else 0
    error_rate = (failed_count / len(results) * 100) if results else 0

    print(f"Simultaneous Logins : {concurrency}")
    print(f"Total Requests      : {len(results)}")
    print(f"Completed In        : {total_time:.2f}s")
    print(f"Throughput          : {rps:.1f} req/sec")
    print(f"Success / Failed    : {success_count} / {failed_count} (Error Rate: {error_rate:.2f}%)")
    print(f"Latencies (ms)      : Avg={avg:.1f}ms | Median={p50:.1f}ms | p95={p95:.1f}ms | p99={p99:.1f}ms")
    return {
        "concurrency": concurrency,
        "success": success_count,
        "failed": failed_count,
        "error_rate": error_rate,
        "rps": rps,
        "avg": avg,
        "p95": p95,
        "p99": p99,
        "total_time": total_time
    }

async def main():
    levels = [50, 100, 200, 300, 500]
    summary = []
    for level in levels:
        res = await run_login_stage(level)
        summary.append(res)
        await asyncio.sleep(1) # cool down between stages

    print("\n\n=================== BENCHMARK SUMMARY ===================")
    print(f"{'Concurrency':<12} | {'Success':<8} | {'Failed':<8} | {'Avg (ms)':<10} | {'p95 (ms)':<10} | {'p99 (ms)':<10} | {'Req/s':<8}")
    print("-" * 75)
    for s in summary:
        print(f"{s['concurrency']:<12} | {s['success']:<8} | {s['failed']:<8} | {s['avg']:<10.1f} | {s['p95']:<10.1f} | {s['p99']:<10.1f} | {s['rps']:<8.1f}")

if __name__ == "__main__":
    asyncio.run(main())
