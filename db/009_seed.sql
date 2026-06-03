-- ============================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ ДЛЯ РАЗРАБОТКИ
-- ============================================================

-- Администратор системы
INSERT INTO users (id, first_name, last_name, phone, email, role, status)
VALUES ('U000001', 'Система', 'Админ', '+70000000000', 'admin@kayran.ru', 'system_admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- Тестовая франшиза
INSERT INTO franchises (id, title, owner_user_id)
VALUES ('F000001', 'Главная база', 'U000001')
ON CONFLICT (id) DO NOTHING;

-- Тестовая точка
INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone)
VALUES ('P000001', 'Центральная база', 'base', 'F000001', 'г. Москва, ул. Водная, 1', 55.7558, 37.6173, 'Europe/Moscow')
ON CONFLICT (id) DO NOTHING;

-- Типы лодок
INSERT INTO boats (id, point_id, serial_number, title, color, boat_type, capacity, status, condition_level)
VALUES
    ('B000001', 'P000001', 'KRN-001', 'Байдарка "Норд"', 'синий', 'kayak', 1, 'available', 'excellent'),
    ('B000002', 'P000001', 'KRN-002', 'Катамаран "Юг"', 'красный', 'catamaran', 2, 'available', 'good'),
    ('B000003', 'P000001', 'KRN-003', 'Лодка "Восток"', 'зелёный', 'rowboat', 4, 'available', 'good'),
    ('B000004', 'P000001', 'KRN-004', 'Байдарка "Запад"', 'жёлтый', 'kayak', 1, 'available', 'excellent'),
    ('B000005', 'P000001', 'KRN-005', 'SUP "Стандарт"', 'белый', 'sup', 1, 'available', 'good')
ON CONFLICT (id) DO NOTHING;

-- Тестовые маршруты
INSERT INTO routes (id, title, description, difficulty, distance_km, estimated_duration, route_type, status)
VALUES
    ('R000001', 'Озёрная петля', 'Лёгкий маршрут по озеру, без течений', 'easy', 3.5, 60, 'water', 'active'),
    ('R000002', 'Речной поток', 'Маршрут средней сложности по реке', 'medium', 8.0, 120, 'water', 'active'),
    ('R000003', 'Спортивный спринт', 'Короткий интенсивный маршрут', 'hard', 2.0, 30, 'water', 'active'),
    ('R000004', 'Адаптивный маршрут', 'Безопасный маршрут для инклюзивных программ', 'adaptive', 1.5, 45, 'adaptive', 'active')
ON CONFLICT (id) DO NOTHING;

-- Контрольные точки для маршрутов
INSERT INTO route_points (id, route_id, order_index, lat, lng, title, checkpoint_type)
VALUES
    ('P000010', 'R000001', 1, 55.7600, 37.6200, 'Старт', 'start'),
    ('P000011', 'R000001', 2, 55.7610, 37.6250, 'Поворот 1', 'waypoint'),
    ('P000012', 'R000001', 3, 55.7590, 37.6300, 'Смотровая', 'waypoint'),
    ('P000013', 'R000001', 4, 55.7580, 37.6180, 'Финиш', 'finish')
ON CONFLICT (id) DO NOTHING;
