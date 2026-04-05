package middleware

import "net/http"

func BlacklistMiddleware(blacklist []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			ip := GetIP(r.RemoteAddr)

			for _, b := range blacklist {
				if ip == b {
					LogBlocked(ip, "Blacklisted IP")
					http.Error(w, "Blocked IP", http.StatusForbidden)
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}