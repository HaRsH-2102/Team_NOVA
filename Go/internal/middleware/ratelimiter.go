package middleware

import (
	"net/http"
	"sync"
	"time"

	"nova-shield/internal/config"
)

type clientData struct {
	count     int
	startTime time.Time
}

var store = make(map[string]*clientData)
var mu sync.Mutex

func findRule(r *http.Request, rules []config.RateLimit) *config.RateLimit {
	for _, rule := range rules {
		if r.URL.Path == rule.Path && r.Method == rule.Method {
			return &rule
		}
	}
	return nil
}

func RateLimiter(rules []config.RateLimit) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			ip := GetIP(r.RemoteAddr)
			rule := findRule(r, rules)

			if rule == nil {
				next.ServeHTTP(w, r)
				return
			}

			key := ip + r.URL.Path

			mu.Lock()
			defer mu.Unlock()

			data, exists := store[key]
			now := time.Now()

			if !exists {
				store[key] = &clientData{1, now}
				next.ServeHTTP(w, r)
				return
			}

			if now.Sub(data.startTime) > time.Duration(rule.WindowSeconds)*time.Second {
				store[key] = &clientData{1, now}
				next.ServeHTTP(w, r)
				return
			}

			if data.count >= rule.Limit {
				LogBlocked(ip, "Rate limit exceeded")
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
				return
			}

			data.count++
			next.ServeHTTP(w, r)
		})
	}
}