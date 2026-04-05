package middleware

import (
	"bytes"
	"io"
	"net/http"
	"regexp"
)

var patterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(OR|AND).*=.*`),
	regexp.MustCompile(`(?i)SELECT.*FROM`),
	regexp.MustCompile(`(?i)DROP TABLE`),
	regexp.MustCompile(`--`),
	regexp.MustCompile(`;`),
	regexp.MustCompile(`(?i)<script>`),
}

func WAFMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// 🔥 Step 1: Read body safely
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request", 500)
			return
		}

		// 🔥 Step 2: ALWAYS restore body BEFORE anything
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		// 🔥 Step 3: Use copy for scanning
		data := r.URL.String() + string(bodyBytes)

		for _, p := range patterns {
			if p.MatchString(data) {
				http.Error(w, "Malicious Request Blocked", http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}