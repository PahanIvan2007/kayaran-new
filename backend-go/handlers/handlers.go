package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"kayran/backend/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound    = errors.New("resource not found")
	ErrConflict    = errors.New("conflict")
	ErrBadRequest  = errors.New("bad request")
	ErrUnauthorized = errors.New("unauthorized")
	ErrOffline     = errors.New("service unavailable")
)

func randomID() string {
	b := make([]byte, 3)
	rand.Read(b)
	return hex.EncodeToString(b)
}

type Handler struct {
	db       *pgxpool.Pool
	cfg      *config.Config
	boatCache *Cache[[]byte]
}

func New(db *pgxpool.Pool, cfg *config.Config) *Handler {
	return &Handler{db: db, cfg: cfg, boatCache: NewCache[[]byte](30 * time.Second)}
}

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"detail": msg})
}
