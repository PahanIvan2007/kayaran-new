-- ============================================================
-- МОДУЛЬ ИНКЛЮЗИВНОСТИ: Профили, Ограничения, Адаптации
-- ============================================================

-- ПРОФИЛЬ ИНКЛЮЗИВНОСТИ (ACCESSIBILITY_PROFILES)
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

-- МЕДИЦИНСКИЕ ОГРАНИЧЕНИЯ (MEDICAL_RESTRICTIONS)
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

-- АДАПТИВНЫЕ МАРШРУТЫ (ADAPTIVE_ROUTES)
-- Связь маршрутов с уровнями доступности
CREATE TABLE adaptive_route_access (
    route_id        VARCHAR(7) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    accessibility_level VARCHAR(20) NOT NULL,
    min_instructors     INTEGER DEFAULT 1,
    max_participants    INTEGER,
    required_equipment  TEXT[],

    PRIMARY KEY (route_id, accessibility_level),
    CONSTRAINT valid_access_level CHECK (accessibility_level IN (
        'wheelchair', 'visual', 'hearing', 'cognitive',
        'limited_mobility', 'general'
    ))
);

-- СОПРОВОЖДЕНИЕ (ESCORT_ASSIGNMENTS)
CREATE TABLE escort_assignments (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('K'),
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id),
    participant_id  VARCHAR(7) NOT NULL REFERENCES users(id),
    escort_id       VARCHAR(7) NOT NULL REFERENCES users(id),
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'personal',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_escort_type CHECK (assignment_type IN (
        'personal', 'group', 'technical', 'medical'
    ))
);

CREATE INDEX idx_escort_event ON escort_assignments(event_id);
CREATE INDEX idx_escort_participant ON escort_assignments(participant_id);
