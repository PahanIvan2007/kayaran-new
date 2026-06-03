package handlers

import (
	"encoding/json"
	"net/http"

	"kayran/backend/middleware"
	"kayran/backend/models"

	"github.com/go-chi/chi/v5"
)

// Teams
func (h *Handler) ListTeams(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.Query(r.Context(),
		`SELECT id, title, captain_user_id, status FROM teams WHERE status!='deleted'`)
	defer rows.Close()
	var list []models.Team
	for rows.Next() {
		var t models.Team
		rows.Scan(&t.ID, &t.Title, &t.CaptainUserID, &t.Status)
		list = append(list, t)
	}
	if list == nil {
		list = []models.Team{}
	}
	jsonOK(w, list)
}

func (h *Handler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	uid := middleware.GetUserID(r)
	var req struct{ Title string `json:"title"` }
	json.NewDecoder(r.Body).Decode(&req)
	if req.Title == "" {
		req.Title = "Команда"
	}
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO teams (title, captain_user_id) VALUES ($1,$2) RETURNING id`,
		req.Title, uid,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id})
}

// Tournaments
func (h *Handler) ListTournaments(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.Query(r.Context(),
		`SELECT id, title, format, status, start_time, end_time FROM tournaments WHERE status!='deleted'`)
	defer rows.Close()
	var list []models.Tournament
	for rows.Next() {
		var t models.Tournament
		rows.Scan(&t.ID, &t.Title, &t.Format, &t.Status, &t.StartTime, &t.EndTime)
		list = append(list, t)
	}
	if list == nil {
		list = []models.Tournament{}
	}
	jsonOK(w, list)
}

func (h *Handler) CreateTournament(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req struct {
		Title  string `json:"title"`
		Format string `json:"format"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Format == "" {
		req.Format = "single_elimination"
	}
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO tournaments (title, format) VALUES ($1,$2) RETURNING id`,
		req.Title, req.Format,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id})
}

// Matches
func (h *Handler) CreateMatch(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req struct {
		TournamentID string `json:"tournament_id"`
		Team1ID      string `json:"team1_id"`
		Team2ID      string `json:"team2_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO matches (tournament_id, team1_id, team2_id) VALUES ($1,$2,$3) RETURNING id`,
		req.TournamentID, req.Team1ID, req.Team2ID,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id})
}

func (h *Handler) SetScore(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var req struct {
		Score1 int `json:"score1"`
		Score2 int `json:"score2"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	h.db.Exec(r.Context(),
		`UPDATE matches SET score1=$1, score2=$2, status='completed' WHERE id=$3`,
		req.Score1, req.Score2, id,
	)
	jsonOK(w, map[string]string{"status": "completed"})
}
