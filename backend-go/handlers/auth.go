package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"kayran/backend/middleware"
	"kayran/backend/models"

	"github.com/golang-jwt/jwt/v5"
)

var debugLog *log.Logger

func init() {
	f, err := os.Create("C:\\Users\\NK\\AppData\\Local\\Temp\\kayran_debug.log")
	if err == nil {
		debugLog = log.New(f, "", log.LstdFlags)
	} else {
		debugLog = log.Default()
	}
}

type registerReq struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, "invalid body", 400)
		return
	}
	if req.FirstName == "" || req.LastName == "" || req.Phone == "" {
		jsonErr(w, "fields required", 400)
		return
	}

	var user models.User
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO users (first_name, last_name, phone)
		 VALUES ($1,$2,$3) RETURNING id, first_name, last_name, phone, role, status, created_at`,
		req.FirstName, req.LastName, req.Phone,
	).Scan(&user.ID, &user.FirstName, &user.LastName, &user.Phone, &user.Role, &user.Status, &user.CreatedAt)

	if err != nil {
		jsonErr(w, "phone already registered", 409)
		return
	}

	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID, "exp": time.Now().Add(72 * time.Hour).Unix(),
	}).SignedString([]byte(h.cfg.JWTKey))

	jsonOK(w, map[string]any{
		"access_token": token, "token_type": "bearer",
		"user": user,
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req struct{ Phone string `json:"phone"` }
	json.NewDecoder(r.Body).Decode(&req)
	debugLog.Printf("Login attempt phone=[%s]", req.Phone)

	var count int
	h.db.QueryRow(r.Context(), "SELECT COUNT(*) FROM users WHERE status='active'").Scan(&count)
	debugLog.Printf("Total active users: %d", count)

	var count2 int
	h.db.QueryRow(r.Context(), "SELECT COUNT(*) FROM users WHERE phone=$1 AND status='active'", req.Phone).Scan(&count2)
	debugLog.Printf("Users matching phone=%s: %d", req.Phone, count2)

	var id string
	err2 := h.db.QueryRow(r.Context(), "SELECT id FROM users WHERE phone=$1 AND status='active' LIMIT 1", req.Phone).Scan(&id)
	if err2 != nil {
		debugLog.Printf("Simple query error: %v", err2)
	} else {
		debugLog.Printf("Found user id=%s", id)
	}

	var user models.User
	err := h.db.QueryRow(r.Context(),
		`SELECT id, first_name, last_name, phone, role, status FROM users WHERE phone=$1 AND status='active'`,
		req.Phone,
	).Scan(&user.ID, &user.FirstName, &user.LastName, &user.Phone, &user.Role, &user.Status)

	if err != nil {
		debugLog.Printf("Login query error: %v for phone=%s", err, req.Phone)
		jsonErr(w, "user not found", 404)
		return
	}

	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID, "exp": time.Now().Add(72 * time.Hour).Unix(),
	}).SignedString([]byte(h.cfg.JWTKey))

	jsonOK(w, map[string]any{
		"access_token": token, "token_type": "bearer", "user": user,
	})
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserID(r)
	var u models.User
	err := h.db.QueryRow(r.Context(),
		`SELECT id, first_name, last_name, phone, role, status, created_at FROM users WHERE id=$1`, uid,
	).Scan(&u.ID, &u.FirstName, &u.LastName, &u.Phone, &u.Role, &u.Status, &u.CreatedAt)
	if err != nil {
		jsonErr(w, "not found", 404)
		return
	}
	jsonOK(w, u)
}
