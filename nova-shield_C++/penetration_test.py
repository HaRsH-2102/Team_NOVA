import requests
import time
import threading
import sys

PROXY_URL = "http://localhost:9090"
RATE_LIMIT_PATH = "/login"

def print_status(name, response, expected_status=None):
    color = "\033[92m" if response.status_code == expected_status else "\033[91m"
    reset = "\033[0m"
    print(f"[{name}] -> Status: {color}{response.status_code}{reset} | Response: {response.text.strip()}")

print("=========================================")
print("🛡️ Nova Shield Automated Penetration Test")
print("=========================================\n")

# 1. Normal Traffic Test
print("[*] Sending Normal Traffic...")
try:
    res = requests.get(f"{PROXY_URL}/", timeout=2)
    print_status("VALID_REQUEST", res, 200)
except requests.exceptions.RequestException as e:
    print(f"Server Offline or Error: {e}")
    sys.exit(1)

# 2. WAF Test: SQL Injection
print("\n[*] Sending WAF Attack (SQL Injection)...")
sql_payloads = [
    f"{PROXY_URL}/api/users?id=1' OR '1'='1",
    f"{PROXY_URL}/login?user=admin'--"
]
for payload in sql_payloads:
    res = requests.get(payload)
    print_status("SQLi_ATTACK", res, 403)

# 3. WAF Test: Cross-Site Scripting (XSS)
print("\n[*] Sending WAF Attack (XSS)...")
xss_payload = f"{PROXY_URL}/search?q=<script>alert(1)</script>"
res = requests.get(xss_payload)
print_status("XSS_ATTACK", res, 403)

# 4. WAF Test: Path Traversal
print("\n[*] Sending WAF Attack (Path Traversal)...")
path_payload = f"{PROXY_URL}/download?file=../../../etc/passwd"
res = requests.get(path_payload)
print_status("PATH_TRAVERSAL", res, 403)

# 5. Rate Limiter Test (DDoS Simulation)
print(f"\n[*] Sending DDoS / Brute Force Attack to {RATE_LIMIT_PATH}...")
print("    (Sending 10 rapid POST requests to trigger HTTP 429)")

def send_rapid_request(i):
    res = requests.post(f"{PROXY_URL}{RATE_LIMIT_PATH}")
    if res.status_code == 429:
        print_status(f"RATELIMIT_HIT_{i}", res, 429)

threads = []
for i in range(10):
    t = threading.Thread(target=send_rapid_request, args=(i,))
    threads.append(t)
    t.start()
    time.sleep(0.05) # Tiny delay to simulate brute force burst

for t in threads:
    t.join()

# 6. Check Metrics
print("\n[*] Pulling telemetry from C++ Proxy...")
metrics = requests.get(f"{PROXY_URL}/metrics").json()
print(f"Total Requests Processed: {metrics['total_requests']}")
print(f"Total Blocked: {metrics['blocked_requests']}")
print(f"  - WAF Blocks: {metrics['waf_blocks']}")
print(f"  - Rate Limits: {metrics['rate_limit_blocks']}")

print("\n✅ Penetration Test Complete. Check your React Dashboard!")
