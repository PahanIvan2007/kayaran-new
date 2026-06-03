# РУКОВОДСТВО ДЛЯ СТУДЕНТОВ
## Как работать с платформой Kayran

---

## 1. СТРУКТУРА ПРОЕКТА

```
D:\Кайран\
├── MANIFEST.md           — Манифест и философия платформы
├── ARCHITECTURE.md       — Архитектурная карта
├── DEVELOPMENT_RULES.md  — Правила разработки (читать первом!)
├── ER_DIAGRAM.md         — ER-диаграммы всех уровней
├── EVENT_FLOWS.md        — Сценарии использования
├── MODULES.md            — Структура модулей и доменов
├── API_CONTRACT.md       — API-контракт (REST + WebSocket)
├── db/                   — Схема базы данных (PostgreSQL)
│   ├── 001_core.sql      — Ядро: пользователи, события, точки
│   ├── 002_geo.sql       — Гео: маршруты, GPS, зоны
│   ├── 003_rental.sql    — Прокат: лодки, аренда
│   ├── 004_sport.sql     — Спорт: команды, матчи, турниры
│   ├── 005_finance.sql   — Финансы: платежи, тарифы
│   ├── 006_logs.sql      — Логирование
│   ├── 007_inclusive.sql — Инклюзивность
│   ├── 008_indexes.sql   — Индексы
│   └── 009_seed.sql      — Начальные данные
├── docs/
│   ├── GLOSSARY.md       — Словарь сущностей
│   ├── ROADMAP.md        — Дорожная карта
│   └── STUDENT_GUIDE.md  — Этот файл
└── students/             — Рабочие пространства команд
    ├── team_1_users/     — Команда 1: Пользователи и роли
    ├── team_2_routes/    — Команда 2: Маршруты и GPS
    ├── team_3_rental/    — Команда 3: Прокат
    ├── team_4_championships/ — Команда 4: Чемпионаты
    └── team_5_inclusive/ — Команда 5: Инклюзивность
```

---

## 2. НАЧАЛО РАБОТЫ

### 2.1 Прочитать обязательные документы
1. `DEVELOPMENT_RULES.md` — правила, которые нельзя нарушать
2. `MODULES.md` — понять, за что отвечает ваша команда
3. `API_CONTRACT.md` — как общаться с системой

### 2.2 Настроить базу данных
```bash
# Создать БД
psql -U postgres -c "CREATE DATABASE kayran;"

# Применить миграции (по порядку)
psql -U postgres -d kayran -f db/001_core.sql
psql -U postgres -d kayran -f db/002_geo.sql
psql -U postgres -d kayran -f db/003_rental.sql
# ... и так далее
```

### 2.3 Рабочий процесс
1. Каждая команда работает в своей папке `students/team_N_*/`
2. Все изменения схемы БД — только через миграции в `db/migrations/`
3. Код модуля — в `modules/{module_name}/`
4. Pull Request на изменение `DEVELOPMENT_RULES.md` или схемы — в общий чат

---

## 3. ЗАДАЧИ ПО УРОВНЯМ

### Начальный уровень (подходит всем)
| Задача | Сущности | SQL |
|--------|----------|-----|
| CRUD пользователей | users | INSERT, SELECT, UPDATE |
| CRUD событий | events | + JOIN с users |
| Список лодок на точке | boats, points | + WHERE, фильтры |
| История аренд пользователя | rentals, boats | + JOIN нескольких таблиц |
| Импорт CSV участников | users | COPY / INSERT FROM CSV |
| Статистика по событиям | events | COUNT, GROUP BY, даты |

### Продвинутый уровень
| Задача | Технологии |
|--------|------------|
| Работа с геоданными (PostGIS) | ST_Distance, ST_Within |
| Realtime-обновление счёта матча | WebSocket |
| Поиск событий (полнотекстовый) | GIN index, to_tsvector |
| Офлайн-синхронизация | IndexedDB, Service Worker |
| Турнирная сетка (алгоритмы) | Рекурсивные SQL, бизнес-логика |
| Аналитика: загрузка лодок по часам | Оконные функции |
| Работа с ролями и правами | Row-Level Security |
| Генерация QR-кодов | Библиотека qrcode |

### Research-level (команда инклюзивности)
| Задача | Описание |
|--------|----------|
| Классификация ограничений здоровья | Медицинская терминология |
| Алгоритм подбора адаптивного маршрута | Параметры: нагрузка, тип ограничения |
| Система уровней подготовки | Грейдирование участников |
| Безопасные зоны и мониторинг состояния | Тревожные кнопки, геозоны |

---

## 4. ПРИМЕР: СДЕЛАТЬ CRUD ДЛЯ ЛОДОК

```sql
-- CREATE
INSERT INTO boats (point_id, serial_number, title, boat_type, capacity, color)
VALUES ('P000001', 'KRN-006', 'Новая лодка', 'kayak', 1, 'оранжевый');

-- READ
SELECT * FROM boats WHERE point_id = 'P000001' AND status = 'available';

-- UPDATE
UPDATE boats SET status = 'rented' WHERE id = 'B000001';

-- DELETE (soft)
UPDATE boats SET status = 'inactive' WHERE id = 'B000001';
```

```javascript
// API-вызов (JavaScript)
const response = await fetch('/v1/boats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <token>' },
    body: JSON.stringify({
        point_id: 'P000001',
        serial_number: 'KRN-006',
        title: 'Новая лодка',
        boat_type: 'kayak',
        capacity: 1,
        color: 'оранжевый'
    })
});
const result = await response.json();
```

---

## 5. ПРАВИЛА КОМАНДНОЙ РАБОТЫ

1. **Не трогать** таблицы других модулей без согласования
2. **Писать миграции** для изменений схемы (в `db/migrations/`)
3. **Тестировать** на seed-данных (в `db/009_seed.sql`)
4. **Документировать** новые endpoint'ы в `API_CONTRACT.md`
5. **Синхронизироваться** с core-командой при изменении `events`
6. **Фиксировать** все офлайн-сценарии в документации модуля

---

## 6. КРИТЕРИИ MVP ДЛЯ МОДУЛЯ

- [ ] CRUD для всех таблиц модуля
- [ ] Минимум 3 API-endpoint'а
- [ ] Связь с events (через event_id)
- [ ] Обработка статусов (жизненный цикл)
- [ ] Базовая обработка ошибок
- [ ] README модуля с примерами запросов
- [ ] Seed-данные для тестирования

---

## 7. ПОЛЕЗНЫЕ ССЫЛКИ В ПРОЕКТЕ

| Что нужно | Где искать |
|-----------|------------|
| Общие правила | `DEVELOPMENT_RULES.md` |
| ER-диаграмма | `ER_DIAGRAM.md` |
| API эндпоинты | `API_CONTRACT.md` |
| Структура модуля | `MODULES.md` |
| Словарь терминов | `docs/GLOSSARY.md` |
| Схема БД | `db/*.sql` |
| Примеры данных | `db/009_seed.sql` |
