-- ============================================================
-- КОНТРАКТ ДАННЫХ (DATA MODEL LEVEL 2) — ЯДРО ПЛАТФОРМЫ
-- Версия 0.2
-- ============================================================
-- Правила:
--   1. Все ID — короткие строки (префикс типа + 6 hex) для QR
--   2. Время только UTC ISO 8601
--   3. Координаты только WGS84 (lat/lng)
--   4. Любая активность ссылается на event_id
--   5. Пользователи не удаляются физически (status = 'deleted')
-- ============================================================

-- Вспомогательная функция для генерации коротких ID
-- Формат: префикс (1 буква) + 6 шестнадцатеричных символов = 7 символов
-- Пример: U3a7f9c (User), Eb1d2e3 (Event)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION generate_short_id(prefix TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || SUBSTR(MD5(GEN_RANDOM_UUID()::TEXT), 1, 6);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. ПОЛЬЗОВАТЕЛИ (USERS)
-- ============================================================
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

    CONSTRAINT valid_role CHECK (role IN (
        'participant', 'instructor', 'judge', 'volunteer',
        'franchise_admin', 'system_admin'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'active', 'blocked', 'deleted', 'pending'
    ))
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================================
-- 2. ФРАНШИЗЫ (FRANCHISES)
-- ============================================================
CREATE TABLE franchises (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('F'),
    title           VARCHAR(255) NOT NULL,
    owner_user_id   VARCHAR(7) NOT NULL REFERENCES users(id),
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_franchise_status CHECK (status IN (
        'active', 'suspended', 'closed'
    ))
);

CREATE INDEX idx_franchises_owner ON franchises(owner_user_id);

-- ============================================================
-- 3. ТОЧКИ (POINTS)
-- ============================================================
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

    CONSTRAINT valid_point_type CHECK (type IN (
        'base', 'franchise', 'temporary_event', 'storage'
    )),
    CONSTRAINT valid_point_status CHECK (status IN (
        'active', 'inactive', 'closed'
    ))
);

CREATE INDEX idx_points_franchise ON points(franchise_id);
CREATE INDEX idx_points_status ON points(status);
CREATE INDEX idx_points_location ON points(lat, lng);

-- ============================================================
-- 4. СОБЫТИЯ (EVENTS) — ЦЕНТРАЛЬНАЯ СУЩНОСТЬ
-- ============================================================
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

    CONSTRAINT valid_event_type CHECK (event_type IN (
        'rental', 'training', 'route', 'match',
        'tournament', 'inclusive_program', 'festival', 'corporate'
    )),
    CONSTRAINT valid_event_status CHECK (status IN (
        'planned', 'active', 'completed', 'cancelled', 'emergency'
    )),
    CONSTRAINT valid_visibility CHECK (visibility IN (
        'public', 'private', 'franchise'
    ))
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_point ON events(point_id);
CREATE INDEX idx_events_time ON events(start_time, end_time);
CREATE INDEX idx_events_creator ON events(created_by);

-- ============================================================
-- 5. УЧАСТНИКИ СОБЫТИЙ (EVENT_PARTICIPANTS)
-- ============================================================
CREATE TABLE event_participants (
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id         VARCHAR(7) NOT NULL REFERENCES users(id),
    role            VARCHAR(20) NOT NULL DEFAULT 'participant',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_in      BOOLEAN DEFAULT FALSE,
    check_in_time   TIMESTAMPTZ,

    PRIMARY KEY (event_id, user_id),
    CONSTRAINT valid_participant_role CHECK (role IN (
        'participant', 'instructor', 'judge', 'volunteer', 'captain'
    ))
);

CREATE INDEX idx_ep_user ON event_participants(user_id);
CREATE INDEX idx_ep_role ON event_participants(role);
