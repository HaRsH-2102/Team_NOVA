package config

import (
	"encoding/json"
	"os"
)

type RateLimit struct {
	Path          string `json:"path"`
	Method        string `json:"method"`
	Limit         int    `json:"limit"`
	WindowSeconds int    `json:"window_seconds"`
}

type Config struct {
	Server struct {
		ListenPort int    `json:"listen_port"`
		BackendURL string `json:"backend_url"`
	} `json:"server"`

	RateLimits []RateLimit `json:"rate_limits"`

	Security struct {
		BlacklistedIPs []string `json:"blacklisted_ips"`
	} `json:"security"`
}

func LoadConfig(path string) (*Config, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	err = json.Unmarshal(file, &cfg)
	return &cfg, err
}