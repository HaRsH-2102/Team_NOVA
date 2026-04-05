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

	cfg, err := config.LoadConfig("config.json")
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
	handler = middleware.RateLimiter(cfg.RateLimits)(handler)

	// 🔥 HIGH PERFORMANCE SERVER
	server := &http.Server{
		Addr:              ":9090",
		Handler:           handler,
		ReadTimeout:       5 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
		ReadHeaderTimeout: 2 * time.Second,
	}

	log.Println("🚀 Proxy running on port", cfg.Server.ListenPort)

	log.Fatal(server.ListenAndServe())
}