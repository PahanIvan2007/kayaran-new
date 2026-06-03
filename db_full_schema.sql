-- ============================================================
-- ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ — KAYRAN PLATFORM
-- Версия 0.3
-- 
-- Применение: psql -U postgres -d kayran -f db_full_schema.sql
-- ============================================================

-- Вспомогательная функция генерации коротких ID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION generate_short_id(prefix TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || SUBSTR(MD5(GEN_RANDOM_UUID()::TEXT), 1, 6);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. ЯДРО: Пользователи, события, точки
-- ============================================================

-- 1.1 Пользователи
CREATE TABLE users (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('U'),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(255) UNIQUE,
    role            VARCHAR(20) NOT NULL DEFAULT 'participant',
    birth_date      DATE,
    avatar_url      TEXT,
    medical_flags   JSONB DEFAULT '{}',
    accessibility_level VARCHAR(20) DEFAULT 'none',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT valid_role CHECK (role IN ('participant','instructor','judge','volunteer','franchise_admin','system_admin')),
    CONSTRAINT valid_user_status CHECK (status IN ('active','blocked','deleted','pending'))
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- 1.2 Франшизы
CREATE TABLE franchises (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('F'),
    title           VARCHAR(255) NOT NULL,
    owner_user_id   VARCHAR(7) NOT NULL REFERENCES users(id),
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_franchise_status CHECK (status IN ('active','suspended','closed'))
);

-- 1.3 Точки
CREATE TABLE points (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('P'),
    title           VARCHAR(255) NOT NULL,
    type            VARCHAR(20) NOT NULL DEFAULT 'base',
    franchise_id    VARCHAR(7) REFERENCES franchises(id),
    address         TEXT,
    lat             DECIMAL(10,7),
    lng             DECIMAL(10,7),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    contact_phone   VARCHAR(20),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_point_type CHECK (type IN ('base','franchise','temporary_event','storage')),
    CONSTRAINT valid_point_status CHECK (status IN ('active','inactive','closed'))
);
CREATE INDEX idx_points_franchise ON points(franchise_id);

-- 1.4 События (центральная сущность)
CREATE TABLE events (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('E'),
    event_type      VARCHAR(20) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    point_id        VARCHAR(7) REFERENCES points(id),
    route_id        VARCHAR(7),
    created_by      VARCHAR(7) NOT NULL REFERENCES users(id),
    max_participants INTEGER,
    status          VARCHAR(20) NOT NULL DEFAULT 'planned',
    visibility      VARCHAR(20) NOT NULL DEFAULT 'public',
    safety_briefing_done BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_event_type CHECK (event_type IN ('rental','training','route','match','tournament','inclusive_program','festival','corporate')),
    CONSTRAINT valid_event_status CHECK (status IN ('planned','active','completed','cancelled','emergency')),
    CONSTRAINT valid_visibility CHECK (visibility IN ('public','private','franchise'))
);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_point ON events(point_id);
CREATE INDEX idx_events_time ON events(start_time, end_time);

-- 1.5 Участники событий
CREATE TABLE event_participants (
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         VARCHAR(7) NOT NULL REFERENCES users(id),
    role            VARCHAR(20) NOT NULL DEFAULT 'participant',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_in      BOOLEAN DEFAULT FALSE,
    check_in_time   TIMESTAMPTZ,
    PRIMARY KEY (event_id, user_id),
    CONSTRAINT valid_participant_role CHECK (role IN ('participant','instructor','judge','volunteer','captain'))
);
CREATE INDEX idx_ep_user ON event_participants(user_id);

-- ============================================================
-- 2. ГЕО: Маршруты, GPS
-- ============================================================

CREATE TABLE routes (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('R'),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'easy',
    distance_km     DECIMAL(8,2),
    estimated_duration INTEGER,
    route_type      VARCHAR(20) NOT NULL DEFAULT 'water',
    start_point_id  VARCHAR(7) REFERENCES points(id),
    end_point_id    VARCHAR(7) REFERENCES points(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by      VARCHAR(7) REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy','medium','hard','adaptive')),
    CONSTRAINT valid_route_type CHECK (route_type IN ('water','hiking','mixed','adaptive')),
    CONSTRAINT valid_route_status CHECK (status IN ('active','inactive','seasonal'))
);

CREATE TABLE route_points (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('P'),
    route_id        VARCHAR(7) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    order_index     INTEGER NOT NULL,
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    title           VARCHAR(255),
    description     TEXT,
    checkpoint_type VARCHAR(20) NOT NULL DEFAULT 'waypoint',
    CONSTRAINT valid_checkpoint_type CHECK (checkpoint_type IN ('start','waypoint','finish','rest','danger','photo'))
);
CREATE INDEX idx_rp_route ON route_points(route_id);
CREATE INDEX idx_rp_order ON route_points(route_id, order_index);

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
    CONSTRAINT valid_track_status CHECK (status IN ('active','completed','interrupted','error'))
);
CREATE INDEX idx_gps_tracks_event ON gps_tracks(event_id);

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

CREATE TABLE activity_zones (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('Z'),
    title           VARCHAR(255) NOT NULL,
    point_id        VARCHAR(7) REFERENCES points(id),
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    radius_m        INTEGER NOT NULL DEFAULT 100,
    zone_type       VARCHAR(20) NOT NULL DEFAULT 'safe',
    danger_level    VARCHAR(20),
    CONSTRAINT valid_zone_type CHECK (zone_type IN ('safe','danger','restricted','start','finish'))
);

-- ============================================================
-- 3. ПРОКАТ: Лодки, инвентарь, аренда
-- ============================================================

CREATE TABLE boats (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('B'),
    point_id        VARCHAR(7) NOT NULL REFERENCES points(id),
    serial_number   VARCHAR(100) UNIQUE NOT NULL,
    title           VARCHAR(255),
    color           VARCHAR(50),
    boat_type       VARCHAR(50) NOT NULL DEFAULT 'kayak',
    capacity        INTEGER NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'available',
    condition_level VARCHAR(20) NOT NULL DEFAULT 'good',
    purchase_date   DATE,
    last_service_date DATE,
    next_service_date DATE,
    photo_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_boat_status CHECK (status IN ('available','rented','repair','inactive','lost','reserved')),
    CONSTRAINT valid_condition CHECK (condition_level IN ('excellent','good','fair','poor','damaged'))
);
CREATE INDEX idx_boats_point ON boats(point_id);
CREATE INDEX idx_boats_status ON boats(status);
CREATE INDEX idx_boats_available ON boats(point_id, boat_type) WHERE status = 'available';

CREATE TABLE inventory_items (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('I'),
    point_id        VARCHAR(7) NOT NULL REFERENCES points(id),
    title           VARCHAR(255) NOT NULL,
    item_type       VARCHAR(50) NOT NULL,
    quantity_total  INTEGER NOT NULL DEFAULT 1,
    quantity_available INTEGER NOT NULL DEFAULT 1,
    condition_level VARCHAR(20) DEFAULT 'good',
    CONSTRAINT valid_inv_condition CHECK (condition_level IN ('excellent','good','fair','poor','damaged'))
);

CREATE TABLE rentals (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('A'),
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id),
    user_id         VARCHAR(7) NOT NULL REFERENCES users(id),
    boat_id         VARCHAR(7) REFERENCES boats(id),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    payment_id      VARCHAR(7),
    deposit_amount  DECIMAL(10,2),
    notes_before    TEXT,
    notes_after     TEXT,
    damage_report   JSONB DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT valid_rental_status CHECK (status IN ('active','completed','cancelled','overdue','damaged'))
);
CREATE INDEX idx_rentals_event ON rentals(event_id);
CREATE INDEX idx_rentals_user ON rentals(user_id);
CREATE INDEX idx_rentals_boat ON rentals(boat_id);
CREATE INDEX idx_rentals_status ON rentals(status);

CREATE TABLE rental_inventory (
    rental_id       VARCHAR(7) NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    item_id         VARCHAR(7) NOT NULL REFERENCES inventory_items(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    returned        BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (rental_id, item_id)
);

-- ============================================================
-- 4. СПОРТ: Команды, матчи, турниры
-- ============================================================

CREATE TABLE teams (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('T'),
    title           VARCHAR(255) NOT NULL,
    captain_user_id VARCHAR(7) NOT NULL REFERENCES users(id),
    description     TEXT,
    logo_url        TEXT,
    point_id        VARCHAR(7) REFERENCES points(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_team_status CHECK (status IN ('active','disbanded','inactive'))
);

CREATE TABLE team_members (
    team_id         VARCHAR(7) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         VARCHAR(7) NOT NULL REFERENCES users(id),
    role            VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT valid_team_role CHECK (role IN ('captain','member','reserve','coach'))
);
CREATE INDEX idx_tm_user ON team_members(user_id);

CREATE TABLE tournaments (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('M'),
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id),
    title           VARCHAR(255) NOT NULL,
    format          VARCHAR(30) NOT NULL DEFAULT 'single_elimination',
    min_teams       INTEGER,
    max_teams       INTEGER,
    status          VARCHAR(20) NOT NULL DEFAULT 'registration',
    CONSTRAINT valid_tournament_format CHECK (format IN ('single_elimination','double_elimination','round_robin','group_stage','swiss')),
    CONSTRAINT valid_tournament_status CHECK (status IN ('registration','active','completed','cancelled'))
);

CREATE TABLE tournament_teams (
    tournament_id   VARCHAR(7) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id         VARCHAR(7) NOT NULL REFERENCES teams(id),
    seed            INTEGER,
    group_name      VARCHAR(50),
    final_rank      INTEGER,
    PRIMARY KEY (tournament_id, team_id)
);

CREATE TABLE matches (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('S'),
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id),
    tournament_id   VARCHAR(7) REFERENCES tournaments(id),
    round           INTEGER,
    match_number    INTEGER,
    team_a_id       VARCHAR(7) REFERENCES teams(id),
    team_b_id       VARCHAR(7) REFERENCES teams(id),
    judge_user_id   VARCHAR(7) REFERENCES users(id),
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    score_a         INTEGER DEFAULT 0,
    score_b         INTEGER DEFAULT 0,
    winner_team_id  VARCHAR(7) REFERENCES teams(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    CONSTRAINT valid_match_status CHECK (status IN ('scheduled','active','finished','cancelled','disputed'))
);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_judge ON matches(judge_user_id);

CREATE TABLE match_results (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('R'),
    match_id        VARCHAR(7) NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    recorded_by     VARCHAR(7) NOT NULL REFERENCES users(id),
    team_a_score    INTEGER NOT NULL DEFAULT 0,
    team_b_score    INTEGER NOT NULL DEFAULT 0,
    details         JSONB DEFAULT '{}',
    confirmed       BOOLEAN DEFAULT FALSE,
    confirmed_by    VARCHAR(7) REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_match_results_match ON match_results(match_id);

-- ============================================================
-- 5. ФИНАНСЫ: Платежи, тарифы
-- ============================================================

CREATE TABLE payments (
    id                  VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('Y'),
    event_id            VARCHAR(7) REFERENCES events(id),
    user_id             VARCHAR(7) NOT NULL REFERENCES users(id),
    amount              DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'RUB',
    payment_method      VARCHAR(30),
    payment_provider    VARCHAR(50),
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    external_transaction_id VARCHAR(255),
    description         TEXT,
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending','processing','completed','failed','refunded','cancelled'))
);
CREATE INDEX idx_payments_event ON payments(event_id);
CREATE INDEX idx_payments_user ON payments(user_id);

CREATE TABLE pricing (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('C'),
    point_id        VARCHAR(7) REFERENCES points(id),
    entity_type     VARCHAR(20) NOT NULL,
    entity_id       VARCHAR(7),
    price           DECIMAL(10,2) NOT NULL,
    unit            VARCHAR(20) NOT NULL DEFAULT 'hour',
    valid_from      DATE NOT NULL,
    valid_until     DATE,
    CONSTRAINT valid_entity_type CHECK (entity_type IN ('boat','rental','event','membership','equipment'))
);

-- ============================================================
-- 6. ЛОГИ
-- ============================================================

CREATE TABLE logs (
    id              BIGSERIAL,
    event_id        VARCHAR(7) REFERENCES events(id),
    user_id         VARCHAR(7) REFERENCES users(id),
    action_type     VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(7),
    severity        VARCHAR(10) NOT NULL DEFAULT 'info',
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload         JSONB DEFAULT '{}',
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);
CREATE INDEX idx_logs_event ON logs(event_id);
CREATE INDEX idx_logs_user ON logs(user_id);
CREATE INDEX idx_logs_action ON logs(action_type);

-- ============================================================
-- 7. ИНКЛЮЗИВНОСТЬ
-- ============================================================

CREATE TABLE accessibility_profiles (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('L'),
    user_id         VARCHAR(7) NOT NULL UNIQUE REFERENCES users(id),
    disability_type VARCHAR(50),
    mobility_level  VARCHAR(20),
    vision_impairment   BOOLEAN DEFAULT FALSE,
    hearing_impairment  BOOLEAN DEFAULT FALSE,
    cognitive_support   BOOLEAN DEFAULT FALSE,
    requires_escort     BOOLEAN DEFAULT FALSE,
    comfort_pace        VARCHAR(20) DEFAULT 'moderate',
    max_duration_min    INTEGER,
    notes               TEXT,
    verified_by         VARCHAR(7) REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medical_restrictions (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('M'),
    user_id         VARCHAR(7) NOT NULL REFERENCES users(id),
    restriction     VARCHAR(255) NOT NULL,
    severity        VARCHAR(20) NOT NULL DEFAULT 'moderate',
    is_active       BOOLEAN DEFAULT TRUE,
    valid_until     DATE,
    created_by      VARCHAR(7) REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_medical_user ON medical_restrictions(user_id);

CREATE TABLE adaptive_route_access (
    route_id            VARCHAR(7) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    accessibility_level VARCHAR(20) NOT NULL,
    min_instructors     INTEGER DEFAULT 1,
    max_participants    INTEGER,
    required_equipment  TEXT[],
    PRIMARY KEY (route_id, accessibility_level),
    CONSTRAINT valid_access_level CHECK (accessibility_level IN ('wheelchair','visual','hearing','cognitive','limited_mobility','general'))
);

CREATE TABLE escort_assignments (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('K'),
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id),
    participant_id  VARCHAR(7) NOT NULL REFERENCES users(id),
    escort_id       VARCHAR(7) NOT NULL REFERENCES users(id),
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'personal',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_escort_type CHECK (assignment_type IN ('personal','group','technical','medical'))
);
CREATE INDEX idx_escort_event ON escort_assignments(event_id);

-- ============================================================
-- 8. ИНДЕКСЫ
-- ============================================================

CREATE INDEX idx_events_user_time ON events(created_by, start_time DESC);
CREATE INDEX idx_events_point_active ON events(point_id, status) WHERE status IN ('planned', 'active');
CREATE INDEX idx_gps_tracks_active ON gps_tracks(event_id, status) WHERE status = 'active';
CREATE INDEX idx_matches_tournament_round ON matches(tournament_id, round, match_number);

ALTER TABLE events ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (
        to_tsvector('russian', COALESCE(title, '') || ' ' || COALESCE(description, ''))
    ) STORED;
CREATE INDEX idx_events_search ON events USING GIN(search_vector);

-- ============================================================
-- 9. НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================================

INSERT INTO users (id, first_name, last_name, phone, email, role, status)
VALUES ('U000001', 'Система', 'Админ', '+70000000000', 'admin@kayran.ru', 'system_admin', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO franchises (id, title, owner_user_id)
VALUES ('F000001', 'Главная база', 'U000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone)
VALUES ('P000001', 'Центральная база', 'base', 'F000001', 'г. Москва, ул. Водная, 1', 55.7558, 37.6173, 'Europe/Moscow')
ON CONFLICT (id) DO NOTHING;

INSERT INTO boats (id, point_id, serial_number, title, color, boat_type, capacity, status, condition_level)
VALUES
    ('B000001', 'P000001', 'KRN-001', 'Байдарка "Норд"', 'синий', 'kayak', 1, 'available', 'excellent'),
    ('B000002', 'P000001', 'KRN-002', 'Катамаран "Юг"', 'красный', 'catamaran', 2, 'available', 'good'),
    ('B000003', 'P000001', 'KRN-003', 'Лодка "Восток"', 'зелёный', 'rowboat', 4, 'available', 'good'),
    ('B000004', 'P000001', 'KRN-004', 'Байдарка "Запад"', 'жёлтый', 'kayak', 1, 'available', 'excellent'),
    ('B000005', 'P000001', 'KRN-005', 'SUP "Стандарт"', 'белый', 'sup', 1, 'available', 'good')
ON CONFLICT (id) DO NOTHING;

INSERT INTO routes (id, title, description, difficulty, distance_km, estimated_duration, route_type, status)
VALUES
    ('R000001', 'Озёрная петля', 'Лёгкий маршрут по озеру', 'easy', 3.5, 60, 'water', 'active'),
    ('R000002', 'Речной поток', 'Средней сложности по реке', 'medium', 8.0, 120, 'water', 'active'),
    ('R000003', 'Спортивный спринт', 'Интенсивный маршрут', 'hard', 2.0, 30, 'water', 'active'),
    ('R000004', 'Адаптивный маршрут', 'Для инклюзивных программ', 'adaptive', 1.5, 45, 'adaptive', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO route_points (id, route_id, order_index, lat, lng, title, checkpoint_type)
VALUES
    ('P000010', 'R000001', 1, 55.7600, 37.6200, 'Старт', 'start'),
    ('P000011', 'R000001', 2, 55.7610, 37.6250, 'Поворот 1', 'waypoint'),
    ('P000012', 'R000001', 3, 55.7590, 37.6300, 'Смотровая', 'waypoint'),
    ('P000013', 'R000001', 4, 55.7580, 37.6180, 'Финиш', 'finish')
ON CONFLICT (id) DO NOTHING;
