import requests
import time

URL = "http://localhost:9090/login"

data = {
    "username": "admin",
    "password": "123"
}

total_requests = 10
success = 0
blocked = 0

start = time.time()

for i in range(total_requests):
    try:
        r = requests.post(URL, json=data)

        if r.status_code == 200:
            success += 1
        elif r.status_code == 429:
            blocked += 1

        print(f"{i+1} → {r.status_code}")

    except Exception as e:
        print("Error:", e)

end = time.time()

print("\n===== RESULT =====")
print("Total:", total_requests)
print("Success:", success)
print("Blocked (Rate Limit):", blocked)
print("Time Taken:", round(end - start, 2), "seconds")

# import requests
# import threading

# URL = "http://localhost:9090/login"

# data = {
#     "username": "admin",
#     "password": "123"
# }

# success = 0
# blocked = 0
# lock = threading.Lock()

# def send_request():
#     global success, blocked
#     r = requests.post(URL, json=data)

#     with lock:
#         if r.status_code == 200:
#             success += 1
#         elif r.status_code == 429:
#             blocked += 1

# threads = []

# for _ in range(5000):
#     t = threading.Thread(target=send_request)
#     threads.append(t)
#     t.start()

# for t in threads:
#     t.join()

# print("Success:", success)
# print("Blocked:", blocked)