package models

import "time"

type User struct {
	ID        string    `json:"id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Phone     string    `json:"phone"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type Event struct {
	ID          string     `json:"id"`
	EventType   string     `json:"event_type"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Status      string     `json:"status"`
	StartTime   time.Time  `json:"start_time"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	PointID     *string    `json:"point_id,omitempty"`
	CreatedBy   string     `json:"created_by"`
}

type Boat struct {
	ID             string `json:"id"`
	PointID        string `json:"point_id"`
	SerialNumber   string `json:"serial_number"`
	Title          string `json:"title,omitempty"`
	BoatType       string `json:"boat_type"`
	Color          string `json:"color,omitempty"`
	Capacity       int    `json:"capacity"`
	Status         string `json:"status"`
	ConditionLevel string `json:"condition_level"`
}

type Rental struct {
	ID        string     `json:"id"`
	EventID   string     `json:"event_id"`
	BoatID    string     `json:"boat_id"`
	UserID    string     `json:"user_id"`
	StartTime time.Time  `json:"start_time"`
	EndTime   *time.Time `json:"end_time,omitempty"`
	Status    string     `json:"status"`
}

type Team struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	CaptainUserID string `json:"captain_user_id"`
	Status        string `json:"status"`
}

type Tournament struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Format string `json:"format"`
	Status string `json:"status"`
}

type Match struct {
	ID           string `json:"id"`
	TournamentID string `json:"tournament_id"`
	TeamAID      string `json:"team_a_id"`
	TeamBID      string `json:"team_b_id"`
	ScoreA       int    `json:"score_a"`
	ScoreB       int    `json:"score_b"`
	Status       string `json:"status"`
	Round       int    `json:"round"`
}

type GpsTrack struct {
	ID        string     `json:"id"`
	EventID   string     `json:"event_id"`
	DeviceID  string     `json:"device_id"`
	Status    string     `json:"status"`
	StartedAt time.Time  `json:"started_at"`
	StoppedAt *time.Time `json:"stopped_at,omitempty"`
}

type GpsPoint struct {
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	Timestamp time.Time `json:"timestamp"`
	Speed     float64   `json:"speed"`
	Altitude  float64   `json:"altitude,omitempty"`
}
