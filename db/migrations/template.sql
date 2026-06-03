-- ============================================================
-- Migration: {description}
-- Date: {YYYY-MM-DD}
-- Author: {team_name}
-- ============================================================
-- Изменения:
--   1. ...
--   2. ...
-- ============================================================

BEGIN;

-- Пример: добавление поля
-- ALTER TABLE events ADD COLUMN weather_conditions JSONB DEFAULT '{}';

-- Пример: создание индекса
-- CREATE INDEX idx_events_weather ON events USING GIN(weather_conditions);

-- Пример: новый ENUM
-- ALTER TYPE event_type ADD VALUE 'festival';

COMMIT;
