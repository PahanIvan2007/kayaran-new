-- ============================================================
-- МОДУЛЬ ПРОКАТА: Лодки, Инвентарь, Аренда
-- ============================================================

-- 2.7 ЛОДКИ (BOATS)
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

    CONSTRAINT valid_boat_status CHECK (status IN (
        'available', 'rented', 'repair', 'inactive', 'lost', 'reserved'
    )),
    CONSTRAINT valid_condition CHECK (condition_level IN (
        'excellent', 'good', 'fair', 'poor', 'damaged'
    ))
);

CREATE INDEX idx_boats_point ON boats(point_id);
CREATE INDEX idx_boats_status ON boats(status);
CREATE INDEX idx_boats_type ON boats(boat_type);

-- ИНВЕНТАРЬ (INVENTORY_ITEMS)
CREATE TABLE inventory_items (
    id              VARCHAR(7) PRIMARY KEY DEFAULT generate_short_id('I'),
    point_id        VARCHAR(7) NOT NULL REFERENCES points(id),
    title           VARCHAR(255) NOT NULL,
    item_type       VARCHAR(50) NOT NULL,
    quantity_total  INTEGER NOT NULL DEFAULT 1,
    quantity_available INTEGER NOT NULL DEFAULT 1,
    condition_level VARCHAR(20) DEFAULT 'good',

    CONSTRAINT valid_inv_condition CHECK (condition_level IN (
        'excellent', 'good', 'fair', 'poor', 'damaged'
    ))
);

CREATE INDEX idx_inventory_point ON inventory_items(point_id);

-- 2.8 АРЕНДА (RENTALS)
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

    CONSTRAINT valid_rental_status CHECK (status IN (
        'active', 'completed', 'cancelled', 'overdue', 'damaged'
    ))
);

CREATE INDEX idx_rentals_event ON rentals(event_id);
CREATE INDEX idx_rentals_user ON rentals(user_id);
CREATE INDEX idx_rentals_boat ON rentals(boat_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_time ON rentals(start_time, end_time);

-- ИНВЕНТАРЬ В АРЕНДЕ (RENTAL_INVENTORY)
CREATE TABLE rental_inventory (
    rental_id       VARCHAR(7) NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    item_id         VARCHAR(7) NOT NULL REFERENCES inventory_items(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    returned        BOOLEAN DEFAULT FALSE,

    PRIMARY KEY (rental_id, item_id)
);
