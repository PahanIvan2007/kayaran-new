package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"kayran/backend/middleware"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) StartTrack(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	uid := middleware.GetUserID(r)
	var req struct {
		EventID  string `json:"event_id"`
		DeviceID string `json:"device_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO gps_tracks (event_id, device_id, user_id) VALUES ($1,$2,$3) RETURNING id`,
		req.EventID, req.DeviceID, uid,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id, "status": "active"})
}

func (h *Handler) StopTrack(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now()
	h.db.Exec(r.Context(),
		`UPDATE gps_tracks SET stopped_at=$1, status='completed' WHERE id=$2 AND status='active'`, now, id)
	jsonOK(w, map[string]string{"status": "completed"})
}

func (h *Handler) AddPoints(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var req struct {
		Points []struct {
			Lat       float64 `json:"lat"`
			Lng       float64 `json:"lng"`
			Timestamp string  `json:"timestamp"`
			Speed     float64 `json:"speed"`
			Altitude  float64 `json:"altitude"`
		} `json:"points"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	for _, p := range req.Points {
		ts, _ := time.Parse(time.RFC3339, p.Timestamp)
		h.db.Exec(r.Context(),
			`INSERT INTO gps_track_points (track_id, lat, lng, speed, altitude, recorded_at)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
			id, p.Lat, p.Lng, p.Speed, p.Altitude, ts,
		)
	}
	jsonOK(w, map[string]string{"status": "ok", "count": itoa(len(req.Points))})
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [12]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
