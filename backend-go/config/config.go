package config

import "os"

type Config struct {
	DBUrl  string
	Port   string
	JWTKey string
}

func Load() *Config {
	db := os.Getenv("DATABASE_URL")
	if db == "" {
		db = "postgres://postgres:123@localhost:5432/kayran"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	jwt := os.Getenv("JWT_SECRET")
	if jwt == "" {
		jwt = "kayran-secret-key-2026"
	}
	return &Config{DBUrl: db, Port: port, JWTKey: jwt}
}
