package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// Measurement represents a single water consumption measurement
type Measurement struct {
	ID        int       `json:"id"`
	Value     float64   `json:"value"`
	Timestamp time.Time `json:"timestamp"`
}

var measurements []Measurement
var nextID = 1

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func measurementsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getMeasurements(w, r)
	case http.MethodPost:
		createMeasurement(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getMeasurements(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(measurements)
}

func createMeasurement(w http.ResponseWriter, r *http.Request) {
	var m struct {
		Value float64 `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newMeasurement := Measurement{
		ID:        nextID,
		Value:     m.Value,
		Timestamp: time.Now(),
	}
	nextID++
	measurements = append(measurements, newMeasurement)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newMeasurement)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/measurements", measurementsHandler)

	log.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", corsMiddleware(mux)))
}