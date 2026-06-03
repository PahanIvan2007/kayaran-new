-- ============================================================
-- МОДУЛЬ СПОРТА: Команды, Матчи, Турниры
-- ============================================================

-- 2.9 КОМАНДЫ (TEAMS)
CREATE TABLE teams (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('T'),
    title           VARCHAR(255) NOT NULL,
    captain_user_id VARCHAR(7) NOT NULL REFERENCES users(id),
    description     TEXT,
    logo_url        TEXT,
    point_id        VARCHAR(7) REFERENCES points(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_team_status CHECK (status IN (
        'active', 'disbanded', 'inactive'
    ))
);

CREATE INDEX idx_teams_captain ON teams(captain_user_id);

-- 2.10 УЧАСТНИКИ КОМАНД (TEAM_MEMBERS)
CREATE TABLE team_members (
    team_id         VARCHAR(7) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         VARCHAR(7) NOT NULL REFERENCES users(id),
    role            VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (team_id, user_id),
    CONSTRAINT valid_team_role CHECK (role IN (
        'captain', 'member', 'reserve', 'coach'
    ))
);

CREATE INDEX idx_tm_user ON team_members(user_id);

-- 2.12 ТУРНИРЫ (TOURNAMENTS)
CREATE TABLE tournaments (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('M'),
    event_id        VARCHAR(7) NOT NULL REFERENCES events(id),
    title           VARCHAR(255) NOT NULL,
    format          VARCHAR(30) NOT NULL DEFAULT 'single_elimination',
    min_teams       INTEGER,
    max_teams       INTEGER,
    status          VARCHAR(20) NOT NULL DEFAULT 'registration',

    CONSTRAINT valid_tournament_format CHECK (format IN (
        'single_elimination', 'double_elimination', 'round_robin',
        'group_stage', 'swiss'
    )),
    CONSTRAINT valid_tournament_status CHECK (status IN (
        'registration', 'active', 'completed', 'cancelled'
    ))
);

CREATE INDEX idx_tournaments_event ON tournaments(event_id);

-- УЧАСТНИКИ ТУРНИРА (TOURNAMENT_TEAMS)
CREATE TABLE tournament_teams (
    tournament_id   VARCHAR(7) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id         VARCHAR(7) NOT NULL REFERENCES teams(id),
    seed            INTEGER,
    group_name      VARCHAR(50),
    final_rank      INTEGER,

    PRIMARY KEY (tournament_id, team_id)
);

-- 2.11 МАТЧИ (MATCHES)
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

    CONSTRAINT valid_match_status CHECK (status IN (
        'scheduled', 'active', 'finished', 'cancelled', 'disputed'
    ))
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_judge ON matches(judge_user_id);
CREATE INDEX idx_matches_status ON matches(status);

-- РЕЗУЛЬТАТЫ МАТЧА (MATCH_RESULTS)
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
