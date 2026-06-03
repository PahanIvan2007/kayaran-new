package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"kayran/backend/middleware"
	"kayran/backend/models"

	"github.com/golang-jwt/jwt/v5"
)

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
	log.Printf("Login attempt phone=[%s]", req.Phone)

	var user models.User
	err := h.db.QueryRow(r.Context(),
		`SELECT id, first_name, last_name, phone, role, status FROM users WHERE phone=$1 AND status='active'`,
		req.Phone,
	).Scan(&user.ID, &user.FirstName, &user.LastName, &user.Phone, &user.Role, &user.Status)

	if err != nil {
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
