package seed

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Run(ctx context.Context, db *pgxpool.Pool) error {
	var count int
	db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count)
	if count > 0 {
		return nil
	}

	fmt.Println("🌱 seeding real data...")
	exec := func(sql string, args ...any) {
		_, err := db.Exec(ctx, sql, args...)
		if err != nil {
			fmt.Println("seed err:", err)
		}
	}

	// ===== USERS (12) =====
	users := []struct{ id, fn, ln, ph, role, status string }{
		{"U000001", "Дмитрий", "Волков", "+79990000001", "system_admin", "active"},
		{"U000002", "Анна", "Спортсменова", "+79990001122", "participant", "active"},
		{"U000003", "Иван", "Петров", "+79990000003", "instructor", "active"},
		{"U000004", "Мария", "Иванова", "+79990000004", "participant", "active"},
		{"U000005", "Алексей", "Сидоров", "+79990000005", "instructor", "active"},
		{"U000006", "Елена", "Козлова", "+79990000006", "participant", "active"},
		{"U000007", "Сергей", "Морозов", "+79990000007", "participant", "active"},
		{"U000008", "Ольга", "Новикова", "+79990000008", "participant", "active"},
		{"U000009", "Павел", "Зайцев", "+79990000009", "instructor", "active"},
		{"U00000A", "Наталья", "Белова", "+79990000010", "participant", "active"},
		{"U00000B", "Константин", "Громов", "+79990000011", "participant", "active"},
		{"U00000C", "Татьяна", "Соколова", "+79990000012", "judge", "active"},
	}
	for _, u := range users {
		exec(`INSERT INTO users (id, first_name, last_name, phone, role, status) VALUES ($1,$2,$3,$4,$5,$6)`,
			u.id, u.fn, u.ln, u.ph, u.role, u.status)
	}

	// ===== FRANCHISES (3) =====
	exec(`INSERT INTO franchises (id, title, owner_user_id, description, status) VALUES ($1,$2,$3,$4,$5)`,
		"F000001", "Kayran Центр", "U000001", "Главный водный центр на Москве-реке", "active")
	exec(`INSERT INTO franchises (id, title, owner_user_id, description, status) VALUES ($1,$2,$3,$4,$5)`,
		"F000002", "Kayran Север", "U000001", "Северный филиал в Химках", "active")
	exec(`INSERT INTO franchises (id, title, owner_user_id, description, status) VALUES ($1,$2,$3,$4,$5)`,
		"F000003", "Kayran Юг", "U000001", "Южный филиал в Битцевском парке", "active")

	// ===== POINTS (5) =====
	exec(`INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone, contact_phone, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		"P000001", "Основной причал", "base", "F000001", "Москва, Водный стадион, ул. Береговая 4", 55.76, 37.62, "Europe/Moscow", "+74950000001", "active")
	exec(`INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone, contact_phone, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		"P000002", "Южный пирс", "base", "F000001", "Москва, Набережная 12", 55.755, 37.625, "Europe/Moscow", "+74950000002", "active")
	exec(`INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone, contact_phone, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		"P000003", "Северная станция", "base", "F000002", "Москва, Химки, ул. Речная 12", 55.89, 37.45, "Europe/Moscow", "+74950000003", "active")
	exec(`INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone, contact_phone, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		"P000004", "Южный причал", "base", "F000003", "Москва, Битцевский парк, пруд 2", 55.57, 37.57, "Europe/Moscow", "+74950000004", "active")
	exec(`INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone, contact_phone, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		"P000005", "Тренировочная база", "base", "F000001", "Москва, ул. Лодочная 7", 55.765, 37.61, "Europe/Moscow", "+74950000005", "active")

	// ===== BOATS (24) =====
	boats := []struct{ id, sn, bt, color string; cap int; cond string }{
		// Kayaks (8)
		{"B000001", "KRN-1001", "kayak", "red", 1, "excellent"},
		{"B000002", "KRN-1002", "kayak", "blue", 1, "excellent"},
		{"B000003", "KRN-1003", "kayak", "yellow", 1, "good"},
		{"B000004", "KRN-1004", "kayak", "green", 1, "good"},
		{"B000005", "KRN-1005", "kayak", "orange", 1, "good"},
		{"B000006", "KRN-1006", "kayak", "white", 2, "fair"},
		{"B000007", "KRN-1007", "kayak", "black", 2, "fair"},
		{"B000008", "KRN-1008", "kayak", "purple", 2, "fair"},
		// Catamarans (6)
		{"B000009", "KRN-2001", "catamaran", "yellow", 4, "good"},
		{"B00000A", "KRN-2002", "catamaran", "red", 4, "good"},
		{"B00000B", "KRN-2003", "catamaran", "blue", 6, "good"},
		{"B00000C", "KRN-2004", "catamaran", "green", 6, "excellent"},
		{"B00000D", "KRN-2005", "catamaran", "white", 8, "excellent"},
		{"B00000E", "KRN-2006", "catamaran", "orange", 8, "good"},
		// SUP boards (6)
		{"B00000F", "KRN-3001", "sup", "white", 1, "good"},
		{"B000010", "KRN-3002", "sup", "blue", 1, "excellent"},
		{"B000011", "KRN-3003", "sup", "pink", 1, "good"},
		{"B000012", "KRN-3004", "sup", "green", 1, "good"},
		{"B000013", "KRN-3005", "sup", "yellow", 1, "fair"},
		{"B000014", "KRN-3006", "sup", "red", 1, "fair"},
		// Rowboats (4)
		{"B000015", "KRN-4001", "rowboat", "green", 3, "good"},
		{"B000016", "KRN-4002", "rowboat", "brown", 4, "good"},
		{"B000017", "KRN-4003", "rowboat", "white", 4, "fair"},
		{"B000018", "KRN-4004", "rowboat", "blue", 6, "fair"},
	}
	for i, b := range boats {
		pid := "P000001"
		if i >= 8 && i < 14 { pid = "P000002" }
		if i >= 14 && i < 20 { pid = "P000003" }
		if i >= 20 { pid = "P000004" }
		exec(`INSERT INTO boats (id, point_id, serial_number, boat_type, color, capacity, condition_level, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			b.id, pid, b.sn, b.bt, b.color, b.cap, b.cond, "available")
	}

	// ===== ROUTES (10) =====
	routes := []struct{ id, title, diff, rtype string; km float64; dur int }{
		{"R000001", "Озёрный круг", "easy", "water", 3.5, 60},
		{"R000002", "Речной маршрут", "medium", "water", 8.2, 120},
		{"R000003", "Спортивный спринт", "hard", "water", 2.0, 30},
		{"R000004", "Адаптивный маршрут", "adaptive", "adaptive", 1.5, 45},
		{"R000005", "Закатная прогулка", "easy", "water", 5.0, 90},
		{"R000006", "Канальный маршрут", "easy", "water", 4.0, 75},
		{"R000007", "Экстрим-сплав", "hard", "water", 12.0, 180},
		{"R000008", "Семейная прогулка", "easy", "water", 3.0, 60},
		{"R000009", "Ночной заплыв", "hard", "water", 6.0, 90},
		{"R00000A", "Тренировочный круг", "medium", "water", 10.0, 150},
	}
	for _, r := range routes {
		exec(`INSERT INTO routes (id, title, difficulty, distance_km, estimated_duration, route_type, created_by, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			r.id, r.title, r.diff, r.km, r.dur, r.rtype, "U000001", "active")
	}

	// ===== ROUTE POINTS =====
	rpIdx := 1
	for _, r := range routes[:5] {
		rpId := fmt.Sprintf("P0000%02d", rpIdx+5)
		exec(`INSERT INTO route_points (id, route_id, order_index, lat, lng, title, checkpoint_type) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			rpId, r.id, 1, 55.76+float64(rpIdx)*0.001, 37.62+float64(rpIdx)*0.001, "Старт", "start")
		rpIdx++
		rpId = fmt.Sprintf("P0000%02d", rpIdx+5)
		exec(`INSERT INTO route_points (id, route_id, order_index, lat, lng, title, checkpoint_type) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			rpId, r.id, 2, 55.77+float64(rpIdx)*0.001, 37.63+float64(rpIdx)*0.001, "Финиш", "finish")
		rpIdx++
	}

	// ===== EVENTS (8) =====
	events := []struct{ id, etype, title, status, pid, uid string; hours int }{
		{"E000001", "training", "Утренняя тренировка", "active", "P000001", "U000003", 48},
		{"E000002", "rental", "Аренда байдарки", "active", "P000001", "U000004", 72},
		{"E000003", "route", "Групповой маршрут", "planned", "P000002", "U000005", 96},
		{"E000004", "match", "Чемпионат Kayran 2026", "active", "P000001", "U000001", 120},
		{"E000005", "festival", "Фестиваль водных видов", "planned", "P000002", "U000001", 144},
		{"E000006", "training", "Вечерняя тренировка", "completed", "P000003", "U000009", 168},
		{"E000007", "rental", "Корпоративная аренда", "active", "P000001", "U000005", 192},
		{"E000008", "route", "Экскурсия по каналам", "planned", "P000004", "U000003", 216},
	}
	for _, e := range events {
		exec(`INSERT INTO events (id, event_type, title, status, point_id, created_by, start_time) VALUES ($1,$2,$3,$4,$5,$6,NOW()-$7::interval)`,
			e.id, e.etype, e.title, e.status, e.pid, e.uid, fmt.Sprintf("%d hours", e.hours))
	}

	// ===== TEAMS (5) =====
	teams := []struct{ id, title, cap string }{
		{"T000001", "Водные Волки", "U000001"},
		{"T000002", "Речные Драконы", "U000003"},
		{"T000003", "Байдарочники", "U000005"},
		{"T000004", "Катамаран Крю", "U000004"},
		{"T000005", "SUP-Команда", "U000006"},
	}
	for _, t := range teams {
		exec(`INSERT INTO teams (id, title, captain_user_id, point_id, status) VALUES ($1,$2,$3,$4,$5)`,
			t.id, t.title, t.cap, "P000001", "active")
	}

	// ===== TOURNAMENTS (3) =====
	tournaments := []struct{ id, title, format, status, eid string }{
		{"V000001", "Чемпионат Kayran 2026", "single_elimination", "active", "E000004"},
		{"V000002", "Кубок Москвы-реки", "round_robin", "registration", "E000005"},
		{"V000003", "Любительский турнир", "group_stage", "active", "E000006"},
	}
	for _, v := range tournaments {
		exec(`INSERT INTO tournaments (id, title, format, status, event_id) VALUES ($1,$2,$3,$4,$5)`,
			v.id, v.title, v.format, v.status, v.eid)
	}

	// ===== RENTALS (4 active) =====
	rentals := []struct{ eid, bid, uid string; hours int }{
		{"E000002", "B000001", "U000002", 2},
		{"E000007", "B000003", "U000004", 3},
		{"E000001", "B000005", "U000006", 4},
		{"E000004", "B00000F", "U000007", 5},
	}
	for _, r := range rentals {
		exec(`INSERT INTO rentals (event_id, boat_id, user_id, start_time, status) VALUES ($1,$2,$3,NOW()-$4::interval,$5)`,
			r.eid, r.bid, r.uid, fmt.Sprintf("%d hours", r.hours), "active")
		exec(`UPDATE boats SET status=$1 WHERE id=$2`, "rented", r.bid)
	}

	// ===== MATCHES (6) =====
	matches := []struct{ vid, t1, t2 string; r, pos, s1, s2 int }{
		{"V000001", "T000001", "T000002", 1, 1, 3, 2},
		{"V000001", "T000003", "T000004", 1, 2, 1, 4},
		{"V000001", "T000002", "T000003", 2, 1, 0, 0},
		{"V000003", "T000001", "T000005", 1, 1, 2, 1},
		{"V000003", "T000004", "T000002", 1, 2, 3, 3},
		{"V000003", "T000005", "T000001", 2, 1, 0, 0},
	}
	matchNum := 1
	for _, m := range matches {
		eid := "E000004"
		if m.vid == "V000003" { eid = "E000006" }
		mid := fmt.Sprintf("S0000%02d", matchNum)
		status := "finished"
		if m.s1 == 0 && m.s2 == 0 { status = "scheduled" }
		exec(`INSERT INTO matches (id, event_id, tournament_id, team_a_id, team_b_id, round, match_number, start_time, score_a, score_b, status) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()-$8::interval,$9,$10,$11)`,
			mid, eid, m.vid, m.t1, m.t2, m.r, m.pos, fmt.Sprintf("%d hours", 50+matchNum*10), m.s1, m.s2, status)
		matchNum++
	}

	fmt.Println("✅ seed complete — 12 users, 24 boats, 10 routes, 8 events, 5 teams, 3 tournaments, 4 rentals, 6 matches")
	return nil
}
