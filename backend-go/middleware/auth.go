package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const UserIDKey ctxKey = "user_id"

func (m *Middleware) Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			http.Error(w, `{"detail":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		token, err := jwt.Parse(h[7:], func(t *jwt.Token) (interface{}, error) {
			return []byte(m.cfg.JWTKey), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, `{"detail":"Invalid token"}`, http.StatusUnauthorized)
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"detail":"Invalid claims"}`, http.StatusUnauthorized)
			return
		}
		uid, _ := claims["sub"].(string)
		ctx := context.WithValue(r.Context(), UserIDKey, uid)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(r *http.Request) string {
	uid, _ := r.Context().Value(UserIDKey).(string)
	return uid
}
