package handlers

import (
	"encoding/json"
	"net/http"

	"kayran/backend/models"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.Query(r.Context(),
		`SELECT id, first_name, last_name, phone, role, status, created_at FROM users WHERE status='active' ORDER BY created_at DESC`)
	defer rows.Close()
	var users []models.User
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Phone, &u.Role, &u.Status, &u.CreatedAt)
		users = append(users, u)
	}
	if users == nil {
		users = []models.User{}
	}
	jsonOK(w, users)
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var u models.User
	err := h.db.QueryRow(r.Context(),
		`SELECT id, first_name, last_name, phone, role, status, created_at FROM users WHERE id=$1`, id,
	).Scan(&u.ID, &u.FirstName, &u.LastName, &u.Phone, &u.Role, &u.Status, &u.CreatedAt)
	if err != nil {
		jsonErr(w, "not found", 404)
		return
	}
	jsonOK(w, u)
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	if fn, ok := body["first_name"]; ok {
		h.db.Exec(r.Context(), `UPDATE users SET first_name=$1 WHERE id=$2`, fn, id)
	}
	if ln, ok := body["last_name"]; ok {
		h.db.Exec(r.Context(), `UPDATE users SET last_name=$1 WHERE id=$2`, ln, id)
	}
	h.GetUser(w, r)
}
