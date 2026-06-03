-- ============================================================
-- МОДУЛЬ ЛОГИРОВАНИЯ: Системный журнал
-- ============================================================

-- 2.16 СИСТЕМНЫЙ ЖУРНАЛ (LOGS)
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
CREATE INDEX idx_logs_entity ON logs(entity_type, entity_id);
CREATE INDEX idx_logs_severity ON logs(severity);

-- ОГРАНИЧЕНИЕ: хранить не более 90 дней
-- Настроить через pg_cron или внешний scheduler
