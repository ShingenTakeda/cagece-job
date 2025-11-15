package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Measurement represents a single water consumption measurement
type Measurement struct {
	ID              int       `json:"id"`
	UserID          int       `json:"userId"`
	MeterNumber     string    `json:"meterNumber"`
	CurrentReading  float64   `json:"currentReading"`
	PreviousReading float64   `json:"previousReading"`
	Consumption     float64   `json:"consumption"`
	Price           float64   `json:"price"`
	Location        string    `json:"location"`
	Notes           string    `json:"notes"`
	Timestamp       time.Time `json:"timestamp"`
}

// Appliance represents a user's appliance
type Appliance struct {
	ID     int    `json:"id"`
	UserID int    `json:"userId"`
	Name   string `json:"name"`
}

// User represents a user of the system
type User struct {
	ID         int    `json:"id"`
	Username   string `json:"username"`
	Email      string `json:"email"`
	// In a production environment, this should be a hashed password
	Password   string `json:"password"`
	Street     string `json:"street"`
	District   string `json:"district"`
	// Appliances will now be stored in a separate table
	Appliances []Appliance `json:"appliances,omitempty"` // For API response, not stored directly in users table
}

var db *sql.DB

type contextKey string

const userIDKey contextKey = "userID"

func main() {
	var err error
	db, err = sql.Open("sqlite3", "/app/data/cagece.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	createUsersTableSQL := `CREATE TABLE IF NOT EXISTS users (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"username" TEXT,
		"email" TEXT UNIQUE,
		"password" TEXT,
		"street" TEXT,
		"district" TEXT
	);`

	_, err = db.Exec(createUsersTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	createAppliancesTableSQL := `CREATE TABLE IF NOT EXISTS appliances (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"user_id" INTEGER,
		"name" TEXT,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	);`
	_, err = db.Exec(createAppliancesTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	createMeasurementsTableSQL := `CREATE TABLE IF NOT EXISTS measurements (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,		
		"user_id" INTEGER,
		"meterNumber" TEXT,
		"currentReading" REAL,
		"previousReading" REAL,
		"consumption" REAL,
		"price" REAL,
		"location" TEXT,
		"notes" TEXT,
		"timestamp" DATETIME,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`
	_, err = db.Exec(createMeasurementsTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/login", loginHandler)
	mux.Handle("/api/measurements", authMiddleware(http.HandlerFunc(measurementsHandler)))
	mux.HandleFunc("/api/measurements/", measurementHandler)
	mux.Handle("/api/measurements/predict", authMiddleware(http.HandlerFunc(predictionHandler)))
	mux.HandleFunc("/api/users", usersHandler)
	mux.HandleFunc("/api/users/", userHandler)
	mux.Handle("/api/comparison", authMiddleware(http.HandlerFunc(comparisonHandler)))

	log.Println("Server starting on port 8081...")
	log.Fatal(http.ListenAndServe(":8081", corsMiddleware(mux)))
}

func predictionHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	rows, err := db.Query("SELECT consumption FROM measurements WHERE user_id = ? AND timestamp > ?", userID, time.Now().AddDate(0, 0, -30))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var consumptions []float64
	var sum float64
	var count int
	for rows.Next() {
		var consumption float64
		if err := rows.Scan(&consumption); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		consumptions = append(consumptions, consumption)
		sum += consumption
		count++
	}

	var prediction float64
	if count > 0 {
		prediction = sum / float64(count)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]float64{"prediction": prediction})
}


func calculatePrice(consumptionLiters float64) float64 {
	consumptionM3 := consumptionLiters / 1000
	var price float64

	if consumptionM3 <= 10 {
		price = consumptionM3 * 2.03
	} else if consumptionM3 <= 15 {
		price = (10 * 2.03) + ((consumptionM3 - 10) * 2.59)
	} else if consumptionM3 <= 20 {
		price = (10 * 2.03) + (5 * 2.59) + ((consumptionM3 - 15) * 2.78)
	} else if consumptionM3 <= 50 {
		price = (10 * 2.03) + (5 * 2.59) + (5 * 2.78) + ((consumptionM3 - 20) * 4.74)
	} else {
		price = (10 * 2.03) + (5 * 2.59) + (5 * 2.78) + (30 * 4.74) + ((consumptionM3 - 50) * 8.34)
	}

	return price
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userID, err := strconv.Atoi(token)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user User
	err := db.QueryRow("SELECT id, password FROM users WHERE email = ?", creds.Email).Scan(&user.ID, &user.Password)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if user.Password != creds.Password {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": strconv.Itoa(user.ID)})
}


func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("CORS middleware processing request")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			log.Println("CORS preflight request handled")
			return
		}
		log.Println("Passing request to the next handler")
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

func measurementHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Path[len("/api/measurements/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodDelete:
		deleteMeasurement(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getUsers(w, r)
	case http.MethodPost:
		createUser(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func userHandler(w http.ResponseWriter, r *http.Request) {
	pathSegments := splitPath(r.URL.Path)
	if len(pathSegments) < 3 { // Expecting /api/users/{id}
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	idStr := pathSegments[2]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	if len(pathSegments) == 4 && pathSegments[3] == "appliances" {
		if r.Method == http.MethodPost {
			addApplianceHandler(w, r, id)
			return
		}
		http.Error(w, "Method not allowed for /appliances", http.StatusMethodNotAllowed)
		return
	}

	switch r.Method {
	case http.MethodGet:
		getUser(w, r, id)
	case http.MethodDelete:
		deleteUser(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Helper function to split URL path into segments
func splitPath(path string) []string {
	var segments []string
	for _, s := range strings.Split(path, "/") {
		if s != "" {
			segments = append(segments, s)
		}
	}
	return segments
}

func addApplianceHandler(w http.ResponseWriter, r *http.Request, userID int) {
	log.Printf("addApplianceHandler called for userID: %d", userID)

	var newAppliance struct {
		Name string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&newAppliance); err != nil {
		log.Printf("Error decoding new appliance: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if newAppliance.Name == "" {
		http.Error(w, "Appliance name cannot be empty", http.StatusBadRequest)
		return
	}

	stmt, err := db.Prepare("INSERT INTO appliances(user_id, name) VALUES(?, ?)")
	if err != nil {
		log.Printf("Error preparing appliance insert statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	res, err := stmt.Exec(userID, newAppliance.Name)
	if err != nil {
		log.Printf("Error executing appliance insert statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := res.LastInsertId()
	appliance := Appliance{
		ID:     int(id),
		UserID: userID,
		Name:   newAppliance.Name,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(appliance)
}

func getUser(w http.ResponseWriter, r *http.Request, id int) {
	log.Printf("getUser called for ID: %d", id)
	var u User
	err := db.QueryRow("SELECT id, username, email, street, district FROM users WHERE id = ?", id).Scan(&u.ID, &u.Username, &u.Email, &u.Street, &u.District)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Error querying user: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch appliances for the user
	applianceRows, err := db.Query("SELECT id, name FROM appliances WHERE user_id = ?", u.ID)
	if err != nil {
		log.Printf("Error querying appliances for user %d: %v", u.ID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer applianceRows.Close()

	userAppliances := []Appliance{}
	for applianceRows.Next() {
		var app Appliance
		app.UserID = u.ID
		if err := applianceRows.Scan(&app.ID, &app.Name); err != nil {
			log.Printf("Error scanning appliance for user %d: %v", u.ID, err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		userAppliances = append(userAppliances, app)
	}
	u.Appliances = userAppliances

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

func getUsers(w http.ResponseWriter, r *http.Request) {
	log.Println("getUsers called")
	rows, err := db.Query("SELECT id, username, email, street, district FROM users")
	if err != nil {
		log.Printf("Error querying users: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.Street, &u.District); err != nil {
			log.Printf("Error scanning user: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Fetch appliances for the current user
		applianceRows, err := db.Query("SELECT id, name FROM appliances WHERE user_id = ?", u.ID)
		if err != nil {
			log.Printf("Error querying appliances for user %d: %v", u.ID, err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer applianceRows.Close()

		userAppliances := []Appliance{}
		for applianceRows.Next() {
			var app Appliance
			app.UserID = u.ID // Set UserID for the appliance
			if err := applianceRows.Scan(&app.ID, &app.Name); err != nil {
				log.Printf("Error scanning appliance for user %d: %v", u.ID, err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			userAppliances = append(userAppliances, app)
		}
		u.Appliances = userAppliances
		users = append(users, u)
	}
	log.Printf("Retrieved %d users", len(users))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func createUser(w http.ResponseWriter, r *http.Request) {
	log.Println("createUser called")
	var u User
	// Temporarily define a struct to decode the incoming request body
	// which might contain appliances as a list of strings
	var requestBody struct {
		User
		Appliances []string `json:"appliances"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		log.Printf("Error decoding user: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	u = requestBody.User

	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	stmt, err := tx.Prepare("INSERT INTO users(username, email, password, street, district) VALUES(?, ?, ?, ?, ?)")
	if err != nil {
		tx.Rollback()
		log.Printf("Error preparing user insert statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	res, err := stmt.Exec(u.Username, u.Email, u.Password, u.Street, u.District)
	if err != nil {
		tx.Rollback()
		log.Printf("Error executing user insert statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	u.ID = int(id)

	// Insert appliances
	if len(requestBody.Appliances) > 0 {
		applianceStmt, err := tx.Prepare("INSERT INTO appliances(user_id, name) VALUES(?, ?)")
		if err != nil {
			tx.Rollback()
			log.Printf("Error preparing appliance insert statement: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		for _, appName := range requestBody.Appliances {
			_, err := applianceStmt.Exec(u.ID, appName)
			if err != nil {
				tx.Rollback()
				log.Printf("Error inserting appliance '%s': %v", appName, err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Created user with ID: %d", u.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	// For the response, we might want to include the appliances
	// that were just created. We'll fetch them in getUsers.
	// For now, just return the user details without appliances.
	json.NewEncoder(w).Encode(u)
}

func deleteUser(w http.ResponseWriter, r *http.Request, id int) {
	log.Printf("deleteUser called for ID: %d", id)
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("DELETE FROM appliances WHERE user_id = ?", id)
	if err != nil {
		tx.Rollback()
		log.Printf("Error deleting appliances for user: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("DELETE FROM measurements WHERE user_id = ?", id)
	if err != nil {
		tx.Rollback()
		log.Printf("Error deleting measurements for user: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		tx.Rollback()
		log.Printf("Error deleting user: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Deleted user with ID: %d and their measurements", id)

	w.WriteHeader(http.StatusNoContent)
}

func getMeasurements(w http.ResponseWriter, r *http.Request) {
	log.Println("getMeasurements called")
	userID := r.Context().Value(userIDKey).(int)

	rows, err := db.Query("SELECT id, user_id, meterNumber, currentReading, previousReading, consumption, price, location, notes, timestamp FROM measurements WHERE user_id = ?", userID)
	if err != nil {
		log.Printf("Error querying measurements: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	measurements := []Measurement{}
	for rows.Next() {
		var m Measurement
		if err := rows.Scan(&m.ID, &m.UserID, &m.MeterNumber, &m.CurrentReading, &m.PreviousReading, &m.Consumption, &m.Price, &m.Location, &m.Notes, &m.Timestamp); err != nil {
			log.Printf("Error scanning measurement: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		measurements = append(measurements, m)
	}
	log.Printf("Retrieved %d measurements for user %d", len(measurements), userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(measurements)
}

func createMeasurement(w http.ResponseWriter, r *http.Request) {
	log.Println("createMeasurement called")
	userID := r.Context().Value(userIDKey).(int)

	var m Measurement
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		log.Printf("Error decoding measurement: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	m.Timestamp = time.Now()
	m.UserID = userID
	m.Price = calculatePrice(m.Consumption)

	stmt, err := db.Prepare("INSERT INTO measurements(user_id, meterNumber, currentReading, previousReading, consumption, price, location, notes, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		log.Printf("Error preparing statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	res, err := stmt.Exec(m.UserID, m.MeterNumber, m.CurrentReading, m.PreviousReading, m.Consumption, m.Price, m.Location, m.Notes, m.Timestamp)
	if err != nil {
		log.Printf("Error executing statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	m.ID = int(id)
	log.Printf("Created measurement with ID: %d for user ID: %d", m.ID, m.UserID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(m)
}

func deleteMeasurement(w http.ResponseWriter, r *http.Request, id int) {
	log.Printf("deleteMeasurement called for ID: %d", id)
	stmt, err := db.Prepare("DELETE FROM measurements WHERE id = ?")
	if err != nil {
		log.Printf("Error preparing statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, err = stmt.Exec(id)
	if err != nil {
		log.Printf("Error executing statement: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("Deleted measurement with ID: %d", id)

	w.WriteHeader(http.StatusNoContent)
}

func comparisonHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	// Get current user's appliances
	rows, err := db.Query("SELECT name FROM appliances WHERE user_id = ?", userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var appliances []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		appliances = append(appliances, name)
	}

	// Find users with the same appliances
	users, err := findUsersWithSameAppliances(appliances, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Calculate average consumption
	averageConsumption, err := calculateAverageConsumption(users)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]float64{"averageConsumption": averageConsumption})
}

func findUsersWithSameAppliances(appliances []string, currentUserID int) ([]int, error) {
	// Find users who have all the specified appliances
	args := stringToInterfaceSlice(appliances)
	args = append(args, len(appliances))

	rows, err := db.Query(`
		SELECT user_id
		FROM appliances
		WHERE name IN (?`+strings.Repeat(",?", len(appliances)-1)+`)
		GROUP BY user_id
		HAVING COUNT(DISTINCT name) = ?
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		if userID != currentUserID {
			userIDs = append(userIDs, userID)
		}
	}

	return userIDs, nil
}

func calculateAverageConsumption(userIDs []int) (float64, error) {
	if len(userIDs) == 0 {
		return 0, nil
	}

	rows, err := db.Query(`
		SELECT AVG(consumption)
		FROM measurements
		WHERE user_id IN (?`+strings.Repeat(",?", len(userIDs)-1)+`)
	`, intToInterfaceSlice(userIDs)...)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var averageConsumption float64
	if rows.Next() {
		if err := rows.Scan(&averageConsumption); err != nil {
			return 0, err
		}
	}

	return averageConsumption, nil
}

func stringToInterfaceSlice(s []string) []interface{} {
	var i []interface{}
	for _, v := range s {
		i = append(i, v)
	}
	return i
}

func intToInterfaceSlice(i []int) []interface{} {
	var s []interface{}
	for _, v := range i {
		s = append(s, v)
	}
	return s
}
