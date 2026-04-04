package main

import (
	"log"
	"net/http"
	"time"

	"nova-shield/internal/config"
	"nova-shield/internal/middleware"
	"nova-shield/internal/proxy"
)

func main() {

	cfg, err := config.LoadConfig("../../config.json")
	if err != nil {
		log.Fatal(err)
	}

	p, err := proxy.NewReverseProxy(cfg.Server.BackendURL)
	if err != nil {
		log.Fatal(err)
	}

	handler := http.Handler(p)

	handler = middleware.BlacklistMiddleware(cfg.Security.BlacklistedIPs)(handler)
	handler = middleware.WAFMiddleware(handler)
	handler = middleware.RateLimiter(5, 60*time.Second)(handler)

	log.Println("Proxy running on port", cfg.Server.ListenPort)

	http.ListenAndServe(":9090", handler)
}