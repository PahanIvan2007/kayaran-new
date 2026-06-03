-- ============================================================
-- МОДУЛЬ ФИНАНСОВ: Платежи, Тарифы
-- ============================================================

-- 2.15 ПЛАТЕЖИ (PAYMENTS)
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

    CONSTRAINT valid_payment_status CHECK (payment_status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    ))
);

CREATE INDEX idx_payments_event ON payments(event_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- ТАРИФЫ (PRICING)
CREATE TABLE pricing (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('C'),
    point_id        VARCHAR(7) REFERENCES points(id),
    entity_type     VARCHAR(20) NOT NULL,  -- 'boat', 'rental', 'event', 'membership'
    entity_id       VARCHAR(7),
    price           DECIMAL(10,2) NOT NULL,
    unit            VARCHAR(20) NOT NULL DEFAULT 'hour',
    valid_from      DATE NOT NULL,
    valid_until     DATE,

    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'boat', 'rental', 'event', 'membership', 'equipment'
    ))
);

CREATE INDEX idx_pricing_point ON pricing(point_id);
CREATE INDEX idx_pricing_entity ON pricing(entity_type, entity_id);
