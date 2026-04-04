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
}

func WAFMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Read body
		bodyBytes, _ := io.ReadAll(r.Body)
		bodyString := string(bodyBytes)

		// Restore body (VERY IMPORTANT)
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		data := r.URL.String() + bodyString

		for _, p := range patterns {
			if p.MatchString(data) {
				http.Error(w, "SQL Injection Detected", http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}