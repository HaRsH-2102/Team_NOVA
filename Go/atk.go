package main

import (
	"bytes"
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

const (
	URL        = "http://localhost:9090/login"
	Total      = 5000
	Workers    = 200   // 🔥 controlled concurrency
	RatePerSec = 800   // 🔥 requests per second (throttle)
)

var payloads = [][]byte{
	[]byte(`{"username":"admin","password":"123"}`),
	[]byte(`{"username":"admin","password":"wrong"}`),
	[]byte(`{"username":"admin' OR '1'='1","password":"123"}`),
	[]byte(`{"username":"<script>alert(1)</script>","password":"123"}`),
}

func main() {

	rand.Seed(time.Now().UnixNano())

	// 🔥 HIGH PERFORMANCE CLIENT
	transport := &http.Transport{
		MaxIdleConns:        1000,
		MaxIdleConnsPerHost: 1000,
		MaxConnsPerHost:     1000,
		IdleConnTimeout:     90 * time.Second,
		DisableKeepAlives:   false,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   5 * time.Second,
	}

	var success int64
	var blocked int64
	var errors int64

	jobs := make(chan int, Total)

	var wg sync.WaitGroup

	// 🔥 RATE LIMITER (client-side pacing)
	ticker := time.NewTicker(time.Second / RatePerSec)
	defer ticker.Stop()

	// 🔥 WORKERS
	for i := 0; i < Workers; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()

			for range jobs {

				<-ticker.C // 🔥 pacing (CRITICAL)

				payload := payloads[rand.Intn(len(payloads))]

				req, _ := http.NewRequest("POST", URL, bytes.NewBuffer(payload))
				req.Header.Set("Content-Type", "application/json")

				resp, err := client.Do(req)
				if err != nil {
					atomic.AddInt64(&errors, 1)
					continue
				}

				resp.Body.Close()

				switch resp.StatusCode {
				case 200:
					atomic.AddInt64(&success, 1)
				case 403, 429:
					atomic.AddInt64(&blocked, 1)
				default:
					atomic.AddInt64(&errors, 1)
				}
			}
		}()
	}

	start := time.Now()

	// 🔥 SEND TRAFFIC
	for i := 0; i < Total; i++ {
		jobs <- i
	}
	close(jobs)

	wg.Wait()

	elapsed := time.Since(start)

	fmt.Println("\n===== ATTACK RESULT (IMPROVED) =====")
	fmt.Println("Total:", Total)
	fmt.Println("Success:", success)
	fmt.Println("Blocked:", blocked)
	fmt.Println("Errors:", errors)
	fmt.Println("Time:", elapsed)
	fmt.Println("Req/sec:", float64(Total)/elapsed.Seconds())
}