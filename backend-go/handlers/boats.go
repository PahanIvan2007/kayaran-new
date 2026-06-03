package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"kayran/backend/models"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListBoats(w http.ResponseWriter, r *http.Request) {
	if cached, ok := h.boatCache.Get("all"); ok {
		w.Header().Set("Content-Type", "application/json")
		w.Write(cached)
		return
	}
	rows, err := h.db.Query(r.Context(),
		`SELECT id, point_id, serial_number, COALESCE(title,''), boat_type, COALESCE(color,''), capacity, status, condition_level
		 FROM boats WHERE status!='deleted' ORDER BY created_at DESC`)
	if err != nil {
		log.Printf("ListBoats query error: %v", err)
		jsonErr(w, "internal error", 500)
		return
	}
	defer rows.Close()
	var list []models.Boat
	for rows.Next() {
		var b models.Boat
		if err := rows.Scan(&b.ID, &b.PointID, &b.SerialNumber, &b.Title, &b.BoatType, &b.Color, &b.Capacity, &b.Status, &b.ConditionLevel); err != nil {
			log.Printf("ListBoats scan error: %v", err)
			continue
		}
		list = append(list, b)
	}
	if err := rows.Err(); err != nil {
		log.Printf("ListBoats rows error: %v", err)
	}
	if list == nil {
		list = []models.Boat{}
	}
	raw, _ := json.Marshal(list)
	h.boatCache.Set("all", raw)
	w.Header().Set("Content-Type", "application/json")
	w.Write(raw)
}

func (h *Handler) AvailableBoats(w http.ResponseWriter, r *http.Request) {
	pid := r.URL.Query().Get("point_id")
	if pid == "" {
		pid = "P000001"
	}
	rows, err := h.db.Query(r.Context(),
		`SELECT id, point_id, serial_number, COALESCE(title,''), boat_type, COALESCE(color,''), capacity, status, condition_level
		 FROM boats WHERE status='available' AND point_id=$1 ORDER BY created_at`, pid)
	if err != nil {
		log.Printf("AvailableBoats query error: %v", err)
		jsonErr(w, "internal error", 500)
		return
	}
	defer rows.Close()
	var list []models.Boat
	for rows.Next() {
		var b models.Boat
		if err := rows.Scan(&b.ID, &b.PointID, &b.SerialNumber, &b.Title, &b.BoatType, &b.Color, &b.Capacity, &b.Status, &b.ConditionLevel); err != nil {
			log.Printf("AvailableBoats scan error: %v", err)
			continue
		}
		list = append(list, b)
	}
	if err := rows.Err(); err != nil {
		log.Printf("AvailableBoats rows error: %v", err)
	}
	if list == nil {
		list = []models.Boat{}
	}
	jsonOK(w, list)
}

func (h *Handler) CreateBoat(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var b struct {
		PointID      string `json:"point_id"`
		SerialNumber string `json:"serial_number"`
		Title        string `json:"title"`
		BoatType     string `json:"boat_type"`
		Color        string `json:"color"`
		Capacity     int    `json:"capacity"`
	}
	json.NewDecoder(r.Body).Decode(&b)
	if b.SerialNumber == "" {
		b.SerialNumber = "KRN-" + randomID()
	}
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO boats (point_id, serial_number, title, boat_type, color, capacity)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		b.PointID, b.SerialNumber, b.Title, b.BoatType, b.Color, b.Capacity,
	).Scan(&id)
	h.boatCache.Invalidate("all")
	jsonOK(w, map[string]string{"id": id})
}

func (h *Handler) GetBoat(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var b models.Boat
	err := h.db.QueryRow(r.Context(),
		`SELECT id, point_id, serial_number, COALESCE(title,''), boat_type, COALESCE(color,''), capacity, status, condition_level
		 FROM boats WHERE id=$1`, id,
	).Scan(&b.ID, &b.PointID, &b.SerialNumber, &b.Title, &b.BoatType, &b.Color, &b.Capacity, &b.Status, &b.ConditionLevel)
	if err != nil {
		jsonErr(w, "not found", 404)
		return
	}
	jsonOK(w, b)
}

func (h *Handler) UpdateBoat(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	if s, ok := body["status"]; ok {
		h.db.Exec(r.Context(), `UPDATE boats SET status=$1 WHERE id=$2`, s, id)
	}
	h.boatCache.Invalidate("all")
	h.GetBoat(w, r)
}
