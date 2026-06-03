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
	if list == nil { list = []models.Team{} }
	jsonOK(w, list)
}

func (h *Handler) GetTeam(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var t models.Team
	err := h.db.QueryRow(r.Context(),
		`SELECT id, title, captain_user_id, status FROM teams WHERE id=$1`, id,
	).Scan(&t.ID, &t.Title, &t.CaptainUserID, &t.Status)
	if err != nil {
		jsonErr(w, "team not found", 404)
		return
	}
	jsonOK(w, t)
}

func (h *Handler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	uid := middleware.GetUserID(r)
	var req struct{ Title string `json:"title"` }
	json.NewDecoder(r.Body).Decode(&req)
	if req.Title == "" { req.Title = "Команда" }
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO teams (title, captain_user_id) VALUES ($1,$2) RETURNING id`,
		req.Title, uid,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id})
}

func (h *Handler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var req struct{ Title string `json:"title"` }
	json.NewDecoder(r.Body).Decode(&req)
	h.db.Exec(r.Context(),
		`UPDATE teams SET title=$1 WHERE id=$2 AND status!='deleted'`,
		req.Title, id,
	)
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteTeam(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.db.Exec(r.Context(),
		`UPDATE teams SET status='deleted' WHERE id=$1`, id,
	)
	jsonOK(w, map[string]string{"status": "deleted"})
}

// Tournaments
func (h *Handler) ListTournaments(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.db.Query(r.Context(),
		`SELECT id, title, format, status FROM tournaments WHERE status!='deleted'`)
	defer rows.Close()
	var list []models.Tournament
	for rows.Next() {
		var t models.Tournament
		rows.Scan(&t.ID, &t.Title, &t.Format, &t.Status)
		list = append(list, t)
	}
	if list == nil { list = []models.Tournament{} }
	jsonOK(w, list)
}

func (h *Handler) GetTournament(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var t models.Tournament
	err := h.db.QueryRow(r.Context(),
		`SELECT id, title, format, status FROM tournaments WHERE id=$1`, id,
	).Scan(&t.ID, &t.Title, &t.Format, &t.Status)
	if err != nil {
		jsonErr(w, "tournament not found", 404)
		return
	}
	jsonOK(w, t)
}

func (h *Handler) CreateTournament(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	uid := middleware.GetUserID(r)
	var req struct {
		Title   string `json:"title"`
		Format  string `json:"format"`
		EventID string `json:"event_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Format == "" { req.Format = "single_elimination" }
	eventID := req.EventID
	if eventID == "" {
		h.db.QueryRow(r.Context(),
			`INSERT INTO events (event_type, title, start_time, created_by)
			 VALUES ('tournament', $1, NOW(), $2) RETURNING id`,
			req.Title, uid,
		).Scan(&eventID)
	}
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO tournaments (event_id, title, format) VALUES ($1,$2,$3) RETURNING id`,
		eventID, req.Title, req.Format,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id, "event_id": eventID})
}

func (h *Handler) UpdateTournament(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var req struct {
		Title  string `json:"title"`
		Format string `json:"format"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	h.db.Exec(r.Context(),
		`UPDATE tournaments SET title=$1, format=$2 WHERE id=$3 AND status!='deleted'`,
		req.Title, req.Format, id,
	)
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteTournament(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.db.Exec(r.Context(),
		`UPDATE tournaments SET status='deleted' WHERE id=$1`, id,
	)
	jsonOK(w, map[string]string{"status": "deleted"})
}

// Matches
func (h *Handler) ListMatches(w http.ResponseWriter, r *http.Request) {
	tournamentID := r.URL.Query().Get("tournament_id")
	q := `SELECT id, tournament_id, team_a_id, team_b_id, score_a, score_b, status, round
		FROM matches WHERE status!='deleted'`
	if tournamentID != "" {
		q += ` AND tournament_id='` + tournamentID + `'`
	}
	q += ` ORDER BY round, match_number`
	rows, _ := h.db.Query(r.Context(), q)
	defer rows.Close()
	var list []models.Match
	for rows.Next() {
		var m models.Match
		rows.Scan(&m.ID, &m.TournamentID, &m.TeamAID, &m.TeamBID,
			&m.ScoreA, &m.ScoreB, &m.Status, &m.Round)
		list = append(list, m)
	}
	if list == nil { list = []models.Match{} }
	jsonOK(w, list)
}

func (h *Handler) CreateMatch(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	uid := middleware.GetUserID(r)
	var req struct {
		TournamentID string `json:"tournament_id"`
		TeamAID      string `json:"team_a_id"`
		TeamBID      string `json:"team_b_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	// Create an event for the match
	var eventID string
	h.db.QueryRow(r.Context(),
		`INSERT INTO events (event_type, title, start_time, created_by)
		 VALUES ('match', 'Матч турнира', NOW(), $1) RETURNING id`, uid,
	).Scan(&eventID)
	var id string
	h.db.QueryRow(r.Context(),
		`INSERT INTO matches (event_id, tournament_id, team_a_id, team_b_id)
		 VALUES ($1,$2,$3,$4) RETURNING id`,
		eventID, req.TournamentID, req.TeamAID, req.TeamBID,
	).Scan(&id)
	jsonOK(w, map[string]string{"id": id})
}

func (h *Handler) SetScore(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var req struct {
		ScoreA int `json:"score_a"`
		ScoreB int `json:"score_b"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	h.db.Exec(r.Context(),
		`UPDATE matches SET score_a=$1, score_b=$2, status='finished' WHERE id=$3`,
		req.ScoreA, req.ScoreB, id,
	)
	jsonOK(w, map[string]string{"status": "finished"})
}
