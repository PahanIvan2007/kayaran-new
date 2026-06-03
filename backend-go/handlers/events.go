package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"kayran/backend/middleware"
	"kayran/backend/models"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	q := `SELECT id, event_type, title, description, status, start_time, end_time, point_id, created_by
		  FROM events WHERE status!='deleted' ORDER BY start_time DESC`
	rows, _ := h.db.Query(r.Context(), q)
	defer rows.Close()
	var list []models.Event
	for rows.Next() {
		var e models.Event
		rows.Scan(&e.ID, &e.EventType, &e.Title, &e.Description, &e.Status, &e.StartTime, &e.EndTime, &e.PointID, &e.CreatedBy)
		list = append(list, e)
	}
	if list == nil {
		list = []models.Event{}
	}
	jsonOK(w, list)
}

func (h *Handler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserID(r)
	var e struct {
		EventType string `json:"event_type"`
		Title     string `json:"title"`
		StartTime string `json:"start_time"`
		PointID   string `json:"point_id"`
	}
	json.NewDecoder(r.Body).Decode(&e)
	st, _ := time.Parse(time.RFC3339, e.StartTime)
	if st.IsZero() {
		st = time.Now()
	}
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO events (event_type, title, start_time, point_id, created_by)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		e.EventType, e.Title, st, e.PointID, uid,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id})
}

func (h *Handler) GetEvent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var e models.Event
	err := h.db.QueryRow(r.Context(),
		`SELECT id, event_type, title, description, status, start_time, end_time, point_id, created_by
		 FROM events WHERE id=$1`, id,
	).Scan(&e.ID, &e.EventType, &e.Title, &e.Description, &e.Status, &e.StartTime, &e.EndTime, &e.PointID, &e.CreatedBy)
	if err != nil {
		jsonErr(w, "not found", 404)
		return
	}
	jsonOK(w, e)
}

func (h *Handler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	if s, ok := body["status"]; ok {
		h.db.Exec(r.Context(), `UPDATE events SET status=$1 WHERE id=$2`, s, id)
	}
	h.GetEvent(w, r)
}

func (h *Handler) AddParticipant(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	uid := r.URL.Query().Get("user_id")
	if uid == "" {
		jsonErr(w, "user_id required", 400)
		return
	}
	_, err := h.db.Exec(r.Context(),
		`INSERT INTO event_participants (event_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, id, uid)
	if err != nil {
		jsonErr(w, err.Error(), 400)
		return
	}
	jsonOK(w, map[string]string{"status": "added"})
}
