package middleware

import (
	"fmt"
	"time"
)

func LogRequest(ip, path, method string) {
	fmt.Printf("[REQUEST] %s | %s %s | %s\n",
		time.Now().Format(time.RFC3339),
		method,
		path,
		ip,
	)
}

func LogBlocked(ip, reason string) {
	fmt.Printf("[BLOCKED] %s | IP: %s | Reason: %s\n",
		time.Now().Format(time.RFC3339),
		ip,
		reason,
	)
}