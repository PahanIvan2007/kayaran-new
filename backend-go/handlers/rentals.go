package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"kayran/backend/middleware"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) CreateRental(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	uid := middleware.GetUserID(r)
	var req struct {
		EventID   string  `json:"event_id"`
		BoatID    string  `json:"boat_id"`
		StartTime string  `json:"start_time"`
		Amount    float64 `json:"amount"`
		TariffID  string  `json:"tariff_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	st, _ := time.Parse(time.RFC3339, req.StartTime)
	if st.IsZero() {
		st = time.Now()
	}
	var id string
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO rentals (event_id, boat_id, user_id, start_time) VALUES ($1,$2,$3,$4) RETURNING id`,
		req.EventID, req.BoatID, uid, st,
	).Scan(&id)
	if err != nil {
		jsonErr(w, "rental creation failed", 400)
		return
	}
	h.db.Exec(r.Context(), `UPDATE boats SET status='rented' WHERE id=$1`, req.BoatID)
	// Create payment record
	paymentID := ""
	if req.Amount > 0 {
		h.db.QueryRow(r.Context(),
			`INSERT INTO payments (event_id, user_id, amount, payment_status)
			 VALUES ($1,$2,$3,'completed') RETURNING id`,
			req.EventID, uid, req.Amount,
		).Scan(&paymentID)
	}
	jsonOK(w, map[string]any{
		"id": id, "status": "active",
		"amount": req.Amount, "payment_id": paymentID,
	})
}

func (h *Handler) ReturnRental(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now()
	h.db.Exec(r.Context(),
		`UPDATE rentals SET end_time=$1, status='completed' WHERE id=$2 AND status='active'`, now, id)
	var boatID string
	h.db.QueryRow(r.Context(), `SELECT boat_id FROM rentals WHERE id=$1`, id).Scan(&boatID)
	if boatID != "" {
		h.db.Exec(r.Context(), `UPDATE boats SET status='available' WHERE id=$1`, boatID)
	}
	jsonOK(w, map[string]string{"status": "completed"})
}

func (h *Handler) ReportDamage(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var req struct {
		ConditionLevel string `json:"condition_level"`
		Notes          string `json:"notes"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	var boatID string
	h.db.QueryRow(r.Context(), `SELECT boat_id FROM rentals WHERE id=$1`, id).Scan(&boatID)
	if boatID != "" {
		h.db.Exec(r.Context(), `UPDATE boats SET condition_level=$1 WHERE id=$2`, req.ConditionLevel, boatID)
	}
	jsonOK(w, map[string]string{"status": "reported"})
}
