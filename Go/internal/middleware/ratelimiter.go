package middleware

import (
	"net/http"
	"sync"
	"time"

	"nova-shield/internal/config"
)

type clientData struct {
	count     int
	startTime int64 // 🔥 use int64 (faster)
	mu        sync.Mutex
}

var store sync.Map

type ruleKey struct {
	path   string
	method string
}

var ruleMap map[ruleKey]config.RateLimit

func initRules(rules []config.RateLimit) {
	ruleMap = make(map[ruleKey]config.RateLimit)
	for _, r := range rules {
		ruleMap[ruleKey{r.Path, r.Method}] = r
	}
}

func RateLimiter(rules []config.RateLimit) func(http.Handler) http.Handler {

	initRules(rules)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			ip := GetIP(r.RemoteAddr)

			rule, ok := ruleMap[ruleKey{r.URL.Path, r.Method}]
			if !ok {
				next.ServeHTTP(w, r)
				return
			}

			key := ip + ":" + r.URL.Path

			now := time.Now().Unix()

			val, _ := store.LoadOrStore(key, &clientData{
				startTime: now,
			})

			data := val.(*clientData)

			data.mu.Lock()

			window := int64(rule.WindowSeconds)

			// reset window
			if now-data.startTime > window {
				data.count = 0
				data.startTime = now
			}

			if data.count >= rule.Limit {
				data.mu.Unlock()
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
				return
			}

			data.count++
			data.mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}