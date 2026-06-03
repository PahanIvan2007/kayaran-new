-- ============================================================
-- ДОПОЛНИТЕЛЬНЫЕ ИНДЕКСЫ И ОГРАНИЧЕНИЯ
-- ============================================================

-- Составной индекс для поиска событий пользователя
CREATE INDEX idx_events_user_time
    ON events(created_by, start_time DESC);

-- Индекс для поиска активных событий на точке
CREATE INDEX idx_events_point_active
    ON events(point_id, status)
    WHERE status IN ('planned', 'active');

-- Индекс для поиска доступных лодок
CREATE INDEX idx_boats_available
    ON boats(point_id, boat_type)
    WHERE status = 'available';

-- Индекс для GPS-треков по времени (частый запрос)
CREATE INDEX idx_gps_tracks_active
    ON gps_tracks(event_id, status)
    WHERE status = 'active';

-- Индекс для быстрого поиска матчей турнира
CREATE INDEX idx_matches_tournament_round
    ON matches(tournament_id, round, match_number);

-- Полнотекстовый поиск
ALTER TABLE events ADD COLUMN search_vector TSVECTOR
    GENERATED ALWAYS AS (
        to_tsvector('russian', COALESCE(title, '') || ' ' || COALESCE(description, ''))
    ) STORED;

CREATE INDEX idx_events_search ON events USING GIN(search_vector);
