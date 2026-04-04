package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// Request structure
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Response structure
type Response struct {
	Message string `json:"message"`
}

// ---------------- LOGIN ----------------
func login(w http.ResponseWriter, r *http.Request) {

	// Allow only POST
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest

	// Decode JSON body
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON Body", http.StatusBadRequest)
		return
	}

	// 🔍 DEBUG LOG (check terminal)
	fmt.Println("Login Attempt -> Username:", req.Username, "Password:", req.Password)

	// Validate credentials
	if req.Username == "admin" && req.Password == "123" {

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{
			Message: "Login Successful",
		})

	} else {
		http.Error(w, "Invalid Credentials", http.StatusUnauthorized)
	}
}

// ---------------- BALANCE ----------------
func balance(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(map[string]int{
		"balance": 5000,
	})
}

// ---------------- TRANSFER ----------------
func transfer(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(Response{
		Message: "Transfer Successful",
	})
}

// ---------------- MAIN ----------------
func main() {

	http.HandleFunc("/login", login)
	http.HandleFunc("/balance", balance)
	http.HandleFunc("/transfer", transfer)

	fmt.Println("Backend running on http://localhost:8080")

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}