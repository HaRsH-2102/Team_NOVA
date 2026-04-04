package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

type clientData struct {
	count     int
	startTime time.Time
}

var store = make(map[string]*clientData)
var mu sync.Mutex

func getIP(addr string) string {
	// Remove port from IP
	if strings.Contains(addr, ":") {
		return strings.Split(addr, ":")[0]
	}
	return addr
}

func RateLimiter(limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			ip := getIP(r.RemoteAddr) // ✅ FIXED
			key := ip + r.URL.Path

			mu.Lock()
			defer mu.Unlock()

			data, exists := store[key]
			now := time.Now()

			// First request
			if !exists {
				store[key] = &clientData{1, now}
				next.ServeHTTP(w, r)
				return
			}

			// Window expired → reset
			if now.Sub(data.startTime) > window {
				store[key] = &clientData{1, now}
				next.ServeHTTP(w, r)
				return
			}

			// Limit exceeded
			if data.count >= limit {
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
				return
			}

			// Increment
			data.count++
			next.ServeHTTP(w, r)
		})
	}
}