package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) UpdateAccessibility(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	needs, _ := body["needs"].(string)
	h.db.Exec(r.Context(),
		`INSERT INTO accessibility_profiles (user_id, needs) VALUES ($1,$2)
		 ON CONFLICT (user_id) DO UPDATE SET needs=$2, updated_at=NOW()`,
		id, needs,
	)
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *Handler) AddMedical(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	id := chi.URLParam(r, "id")
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	cond, _ := body["condition"].(string)
	meds, _ := body["medications"].(string)
	h.db.Exec(r.Context(),
		`INSERT INTO medical_profiles (user_id, medical_condition, medications) VALUES ($1,$2,$3)
		 ON CONFLICT (user_id) DO UPDATE SET medical_condition=$2, medications=$3, updated_at=NOW()`,
		id, cond, meds,
	)
	jsonOK(w, map[string]string{"status": "saved"})
}
