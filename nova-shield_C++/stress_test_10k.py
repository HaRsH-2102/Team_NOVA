import requests
import threading
import time
import sys

PROXY_URL = "http://localhost:9090"
TOTAL_REQUESTS = 10000
CONCURRENCY = 5000  # Number of threads pushing simultaneously

success_count = 0
failed_count = 0
lock = threading.Lock()

def send_burst(requests_to_send):
    global success_count, failed_count
    
    local_success = 0
    local_fail = 0
    
    for _ in range(requests_to_send):
        try:
            # We hit a non-limited route to purely test socket networking throughput
            res = requests.get(f"{PROXY_URL}/", timeout=5)
            if res.status_code == 200:
                local_success += 1
            else:
                local_fail += 1
        except requests.exceptions.RequestException:
            local_fail += 1

    with lock:
        success_count += local_success
        failed_count += local_fail


print("==================================================")
print(f"🚀 Nova Shield - 10k Threading Concurrency Test")
print("==================================================\n")

print(f"[*] Firing {TOTAL_REQUESTS} requests across {CONCURRENCY} concurrent threads...")

start_time = time.time()

# Split work among threads
requests_per_thread = TOTAL_REQUESTS // CONCURRENCY
threads = []

for _ in range(CONCURRENCY):
    t = threading.Thread(target=send_burst, args=(requests_per_thread,))
    threads.append(t)
    t.start()

# Wait for all threads to finish shooting
for t in threads:
    t.join()

end_time = time.time()
duration = end_time - start_time
rps = TOTAL_REQUESTS / duration

print("\n--- RESULTS ---")
print(f"✅ Successful Connections: {success_count}")
print(f"❌ Failed/Dropped Connections: {failed_count}")
print(f"⏱️ Total Time: {duration:.2f} seconds")
print(f"⚡ Throughput: {rps:.2f} req/sec\n")

if failed_count == 0:
    print("[PASS] The C++ Server successfully handled all 10,000 parallel requests without dropping a single socket!")
else:
    print("[FAIL] Dropped packets detected. The connection queue or TCP backlog may need tuning.")
