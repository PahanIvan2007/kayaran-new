-- ============================================================
-- МОДУЛЬ ГЕО: Маршруты, GPS-точки, Треки
-- ============================================================

-- 2.5 МАРШРУТЫ (ROUTES)
CREATE TABLE routes (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('R'),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'easy',
    distance_km     DECIMAL(8,2),
    estimated_duration INTEGER,  -- minutes
    route_type      VARCHAR(20) NOT NULL DEFAULT 'water',
    start_point_id  VARCHAR(7) REFERENCES points(id),
    end_point_id    VARCHAR(7) REFERENCES points(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by      VARCHAR(7) REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_difficulty CHECK (difficulty IN (
        'easy', 'medium', 'hard', 'adaptive'
    )),
    CONSTRAINT valid_route_type CHECK (route_type IN (
        'water', 'hiking', 'mixed', 'adaptive'
    )),
    CONSTRAINT valid_route_status CHECK (status IN (
        'active', 'inactive', 'seasonal'
    ))
);

CREATE INDEX idx_routes_difficulty ON routes(difficulty);
CREATE INDEX idx_routes_status ON routes(status);

-- 2.6 КОНТРОЛЬНЫЕ ТОЧКИ МАРШРУТОВ (ROUTE_POINTS)
CREATE TABLE route_points (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('P'),
    route_id        VARCHAR(7) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    order_index     INTEGER NOT NULL,
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    title           VARCHAR(255),
    description     TEXT,
    checkpoint_type VARCHAR(20) NOT NULL DEFAULT 'waypoint',

    CONSTRAINT valid_checkpoint_type CHECK (checkpoint_type IN (
        'start', 'waypoint', 'finish', 'rest', 'danger', 'photo'
    ))
);

CREATE INDEX idx_rp_route ON route_points(route_id);
CREATE INDEX idx_rp_order ON route_points(route_id, order_index);

-- 2.13 GPS-ТРЕКИ (GPS_TRACKS)
CREATE TABLE gps_tracks (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('G'),
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         VARCHAR(7) NOT NULL REFERENCES users(id),
    device_id       VARCHAR(100),
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    distance_km     DECIMAL(10,2),
    avg_speed_kmh   DECIMAL(5,1),
    max_speed_kmh   DECIMAL(5,1),

    CONSTRAINT valid_track_status CHECK (status IN (
        'active', 'completed', 'interrupted', 'error'
    ))
);

CREATE INDEX idx_gps_tracks_event ON gps_tracks(event_id);
CREATE INDEX idx_gps_tracks_user ON gps_tracks(user_id);
CREATE INDEX idx_gps_tracks_time ON gps_tracks(started_at, ended_at);

-- 2.14 ТОЧКИ GPS-ТРЕКОВ (GPS_TRACK_POINTS)
-- ВНИМАНИЕ: огромный объём данных, обязательное партиционирование
CREATE TABLE gps_track_points (
    id              BIGSERIAL,
    track_id        VARCHAR(7) NOT NULL REFERENCES gps_tracks(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL,
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    altitude_m      DECIMAL(7,1),
    speed_kmh       DECIMAL(5,1),
    accuracy_m      DECIMAL(5,1),
    battery_level   DECIMAL(3,1),
    heading_deg     INTEGER,

    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE INDEX idx_gtp_track ON gps_track_points(track_id, recorded_at);
CREATE INDEX idx_gtp_time ON gps_track_points(recorded_at);

-- ============================================================
-- ЗОНЫ АКТИВНОСТИ (ACTIVITY_ZONES)
-- ============================================================
CREATE TABLE activity_zones (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('Z'),
    title           VARCHAR(255) NOT NULL,
    point_id        VARCHAR(7) REFERENCES points(id),
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    radius_m        INTEGER NOT NULL DEFAULT 100,
    zone_type       VARCHAR(20) NOT NULL DEFAULT 'safe',
    danger_level    VARCHAR(20),

    CONSTRAINT valid_zone_type CHECK (zone_type IN (
        'safe', 'danger', 'restricted', 'start', 'finish'
    ))
);

CREATE INDEX idx_zones_point ON activity_zones(point_id);
