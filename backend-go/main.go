package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"kayran/backend/config"
	"kayran/backend/db"
	"kayran/backend/handlers"
	"kayran/backend/middleware"
	"kayran/backend/seed"

	"github.com/go-chi/chi/v5"
)

//go:embed frontend-dist
var embeddedFS embed.FS

func getFrontendFS() http.FileSystem {
	sub, err := fs.Sub(embeddedFS, "frontend-dist")
	if err == nil {
		f, err := sub.Open("index.html")
		if err == nil {
			f.Close()
			return http.FS(sub)
		}
	}
	angularDir := findAngularDir()
	if angularDir != "" {
		return http.Dir(angularDir)
	}
	return nil
}

func spaHandler(fsys http.FileSystem) http.HandlerFunc {
	fileServer := http.FileServer(fsys)
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		f, err := fsys.Open(path)
		if err != nil {
			f, err = fsys.Open("index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
			defer f.Close()
			s, _ := f.Stat()
			http.ServeContent(w, r, "index.html", s.ModTime(), f)
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	}
}

func main() {
	cfg := config.Load()
	ctx := context.Background()

	conn, err := db.Connect(ctx, cfg.DBUrl)
	if err != nil {
		log.Fatal("db connect:", err)
	}
	defer conn.Close()
	log.Println("✅ PostgreSQL connected")

	if err := seed.Run(ctx, conn); err != nil {
		log.Println("seed:", err)
	}

	h := handlers.New(conn, cfg)
	mw := middleware.New(cfg)

	r := chi.NewRouter()
	r.Use(mw.CORS)

	// API routes
	r.Route("/auth", func(r chi.Router) {
		r.Post("/register", h.Register)
		r.Post("/login", h.Login)
		r.With(mw.Auth).Get("/me", h.GetMe)
	})

	r.Route("/users", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Get("/", h.ListUsers)
		r.Get("/{id}", h.GetUser)
		r.Put("/{id}", h.UpdateUser)
	})

	r.Route("/events", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Get("/", h.ListEvents)
		r.Post("/", h.CreateEvent)
		r.Get("/{id}", h.GetEvent)
		r.Put("/{id}", h.UpdateEvent)
		r.Post("/{id}/participants", h.AddParticipant)
	})

	r.Route("/boats", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Get("/", h.ListBoats)
		r.Get("/available", h.AvailableBoats)
		r.Post("/", h.CreateBoat)
		r.Get("/{id}", h.GetBoat)
		r.Put("/{id}", h.UpdateBoat)
	})

	r.Route("/rentals", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Post("/", h.CreateRental)
		r.Put("/{id}/return", h.ReturnRental)
		r.Put("/{id}/damage", h.ReportDamage)
	})

	r.Route("/gps", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Post("/tracks", h.StartTrack)
		r.Put("/tracks/{id}/stop", h.StopTrack)
		r.Post("/tracks/{id}/points", h.AddPoints)
	})

	r.Route("/teams", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Get("/", h.ListTeams)
		r.Post("/", h.CreateTeam)
		r.Get("/{id}", h.GetTeam)
		r.Put("/{id}", h.UpdateTeam)
		r.Delete("/{id}", h.DeleteTeam)
	})

	r.Route("/tournaments", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Get("/", h.ListTournaments)
		r.Post("/", h.CreateTournament)
		r.Get("/{id}", h.GetTournament)
		r.Put("/{id}", h.UpdateTournament)
		r.Delete("/{id}", h.DeleteTournament)
	})

	r.Route("/matches", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Get("/", h.ListMatches)
		r.Post("/", h.CreateMatch)
		r.Put("/{id}/score", h.SetScore)
	})

	r.Route("/profiles", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Put("/accessibility/{id}", h.UpdateAccessibility)
		r.Post("/medical/{id}", h.AddMedical)
	})

	r.Route("/routes", func(r chi.Router) {
		r.Use(mw.Auth)
		r.Get("/", h.ListRoutes)
		r.Get("/{id}", h.GetRoute)
		r.Post("/", h.CreateRoute)
	})

	r.Get("/franchises", h.ListFranchises)
	r.Get("/franchises/{id}", h.GetFranchise)

	// Frontend SPA — only for non-API paths
	frontendFS := getFrontendFS()
	if frontendFS != nil {
		r.NotFound(spaHandler(frontendFS))
		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			for _, p := range []string{"/auth", "/users", "/events", "/boats", "/rentals", "/gps", "/teams", "/tournaments", "/matches", "/profiles", "/routes", "/franchises"} {
				if path == p || strings.HasPrefix(path, p+"/") {
					http.NotFound(w, r)
					return
				}
			}
			spaHandler(frontendFS).ServeHTTP(w, r)
		})
	}

	log.Printf("🚀 Kayran Go API on :%s", cfg.Port)
	log.Printf("📖 Frontend: http://localhost:%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}

func findAngularDir() string {
	exe, _ := os.Executable()
	base := filepath.Dir(exe)
	candidates := []string{
		filepath.Join(base, "..", "frontend-angular", "dist", "frontend-angular", "browser"),
		filepath.Join(base, "..", "frontend"),
		filepath.Join(base, "frontend-dist"),
	}
	for _, p := range candidates {
		abs, err := filepath.Abs(p)
		if err != nil {
			continue
		}
		if fi, err := filepath.Glob(filepath.Join(abs, "index.html")); err == nil && len(fi) > 0 {
			return abs
		}
	}
	return ""
}
