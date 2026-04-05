import requests
import time
import sys

URL = "http://localhost:9090/login"

def mode_a():
    print("=== MODE A: BRUTE FORCE (Rate Limiting) ===")
    print(f"Targeting POST {URL} (Limit: 5/min)")
    for i in range(1, 11):
        try:
            resp = requests.post(URL, json={"username": "admin", "password": "123"})
            print(f"Request {i:02d} | Status: {resp.status_code} | Response: {resp.text.strip()}")
        except requests.exceptions.RequestException as e:
            print(f"Request {i:02d} | Failed to connect: {e}")
        time.sleep(0.1)

def mode_b():
    print("\n=== MODE B: EXPLOIT PAYLOADS (WAF Testing) ===")
    payloads = [
        {"username": "admin' OR '1'='1", "password": "x"},
        {"username": "'; DROP TABLE users; --", "password": "x"},
        {"username": "' UNION SELECT * FROM accounts--", "password": "x"},
        {"username": "<script>alert(1)</script>", "password": "x"},
        {"username": "../../etc/passwd", "password": "x"}
    ]
    
    for i, p in enumerate(payloads, 1):
        print(f"\n[Payload {i}] {p['username']}")
        try:
            resp = requests.post(URL, json=p)
            print(f"Status: {resp.status_code} | Response: {resp.text.strip()}")
        except requests.exceptions.RequestException as e:
            print(f"Failed to connect: {e}")
        time.sleep(0.2)

if __name__ == "__main__":
    mode_a()
    time.sleep(1)
    mode_b()
