package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) ListRoutes(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.Query(r.Context(),
		`SELECT id, title, description, difficulty, distance_km, estimated_minutes, status
		 FROM routes WHERE status!='deleted' ORDER BY title`)
	defer rows.Close()
	type Route struct {
		ID               string  `json:"id"`
		Title            string  `json:"title"`
		Description      *string `json:"description,omitempty"`
		Difficulty       string  `json:"difficulty"`
		DistanceKm       float64 `json:"distance_km"`
		EstimatedMinutes int     `json:"estimated_minutes"`
		Status           string  `json:"status"`
	}
	var list []Route
	for rows.Next() {
		var r Route
		rows.Scan(&r.ID, &r.Title, &r.Description, &r.Difficulty, &r.DistanceKm, &r.EstimatedMinutes, &r.Status)
		list = append(list, r)
	}
	if list == nil {
		list = []Route{}
	}
	jsonOK(w, list)
}

func (h *Handler) GetRoute(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var rt struct {
		ID               string  `json:"id"`
		Title            string  `json:"title"`
		Description      *string `json:"description,omitempty"`
		Difficulty       string  `json:"difficulty"`
		DistanceKm       float64 `json:"distance_km"`
		EstimatedMinutes int     `json:"estimated_minutes"`
		Status           string  `json:"status"`
	}
	err := h.db.QueryRow(r.Context(),
		`SELECT id, title, description, difficulty, distance_km, estimated_minutes, status FROM routes WHERE id=$1`, id,
	).Scan(&rt.ID, &rt.Title, &rt.Description, &rt.Difficulty, &rt.DistanceKm, &rt.EstimatedMinutes, &rt.Status)
	if err != nil {
		jsonErr(w, "not found", 404)
		return
	}
	type Point struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
		Seq int     `json:"seq"`
	}
	rows, _ := h.db.Query(r.Context(),
		`SELECT lat, lng, seq FROM route_points WHERE route_id=$1 ORDER BY seq`, id)
	defer rows.Close()
	var pts []Point
	for rows.Next() {
		var p Point
		rows.Scan(&p.Lat, &p.Lng, &p.Seq)
		pts = append(pts, p)
	}
	if pts == nil {
		pts = []Point{}
	}
	jsonOK(w, map[string]any{"route": rt, "points": pts})
}

func (h *Handler) CreateRoute(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title       string  `json:"title"`
		Difficulty  string  `json:"difficulty"`
		DistanceKm  float64 `json:"distance_km"`
		Minutes     int     `json:"estimated_minutes"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.Difficulty == "" {
		body.Difficulty = "easy"
	}
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO routes (title, difficulty, distance_km, estimated_minutes) VALUES ($1,$2,$3,$4) RETURNING id`,
		body.Title, body.Difficulty, body.DistanceKm, body.Minutes,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id})
}

func (h *Handler) ListFranchises(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.Query(r.Context(),
		`SELECT f.id, p.title, p.address, p.lat, p.lng, f.status
		 FROM franchises f
		 JOIN points p ON p.franchise_id = f.id
		 WHERE f.status='active'`)
	defer rows.Close()
	type F struct {
		ID      string  `json:"id"`
		Name    string  `json:"name"`
		Address string  `json:"address"`
		Lat     float64 `json:"lat"`
		Lng     float64 `json:"lng"`
		Status  string  `json:"status"`
	}
	var list []F
	for rows.Next() {
		var f F
		rows.Scan(&f.ID, &f.Name, &f.Address, &f.Lat, &f.Lng, &f.Status)
		list = append(list, f)
	}
	if list == nil {
		list = []F{}
	}
	jsonOK(w, list)
}

func (h *Handler) GetFranchise(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var f struct {
		ID      string  `json:"id"`
		Name    string  `json:"name"`
		Address string  `json:"address"`
		Lat     float64 `json:"lat"`
		Lng     float64 `json:"lng"`
		Status  string  `json:"status"`
	}
	err := h.db.QueryRow(r.Context(),
		`SELECT f.id, p.title, p.address, p.lat, p.lng, f.status
		 FROM franchises f
		 JOIN points p ON p.franchise_id = f.id
		 WHERE f.id=$1`, id,
	).Scan(&f.ID, &f.Name, &f.Address, &f.Lat, &f.Lng, &f.Status)
	if err != nil {
		jsonErr(w, "not found", 404)
		return
	}
	jsonOK(w, f)
}
