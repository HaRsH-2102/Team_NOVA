package main

import (
	"log"
	"net/http"

	"nova-shield/internal/config"
	"nova-shield/internal/middleware"
	"nova-shield/internal/proxy"
)

func main() {

	cfg, err := config.LoadConfig("config.json")
	if err != nil {
		log.Fatal(err)
	}

	p, err := proxy.NewReverseProxy(cfg.Server.BackendURL)
	if err != nil {
		log.Fatal(err)
	}

	handler := http.Handler(p)

	// Order matters
	handler = middleware.BlacklistMiddleware(cfg.Security.BlacklistedIPs)(handler)
	handler = middleware.WAFMiddleware(handler)
	handler = middleware.RateLimiter(cfg.RateLimits)(handler)

	log.Println("Proxy running on port", cfg.Server.ListenPort)

	http.ListenAndServe(":9090", handler)
}