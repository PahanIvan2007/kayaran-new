# СТРУКТУРА МОДУЛЕЙ ПЛАТФОРМЫ

## Независимые домены системы

```
┌─────────────────────────────────────────────────────────────┐
│                        API GATEWAY                           │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  CORE    │   GEO    │  RENTAL  │  SPORT   │  FRANCHISE      │
│ (ядро)   │(геоданные)│ (прокат) │(спорт)   │ (франшизы)      │
├──────────┼──────────┼──────────┼──────────┼─────────────────┤
│  USERS   │  ROUTES  │  BOATS   │  TEAMS   │  POINTS         │
│  EVENTS  │  GPS     │  RENTALS │  MATCHES │  FRANCHISES     │
│  AUTH    │  ZONES   │  INVENT. │  TOURN.  │  REPORTS        │
│  LOGS    │  OFFLINE │  PAYMENT │  JUDGE   │                 │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                    INCLUSIVE (сквозной)                       │
│          профили │ ограничения │ адаптации │ сопровождение     │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. CORE — Ядро платформы

**Таблицы-владельцы:** users, events, event_participants, logs

**Отвечает за:**
- Регистрация и авторизация пользователей
- Управление ролями
- Жизненный цикл событий (CRUD)
- Типизация событий
- Системное логирование

**API:**
- `POST /auth/` — регистрация, логин
- `GET/POST/PUT /users/` — управление пользователями
- `GET/POST/PUT /events/` — управление событиями
- `GET /events/{id}/participants/` — участники события

**Команда 1:** Пользователи и роли

---

## 2. GEO — Маршруты и GPS

**Таблицы-владельцы:** routes, route_points, gps_tracks, gps_track_points, activity_zones

**Отвечает за:**
- Маршруты и контрольные точки
- GPS-трекинг
- Офлайн-карты
- Зоны безопасности
- Геоаналитика

**API:**
- `GET/POST/PUT /routes/` — маршруты
- `GET/POST /routes/{id}/points/` — контрольные точки
- `POST /gps/points/` — пакетная загрузка GPS-точек
- `GET /gps/tracks/{id}/` — получение трека
- `GET /zones/` — зоны активности

**Команда 2:** Маршруты и GPS

---

## 3. RENTAL — Прокат

**Таблицы-владельцы:** boats, inventory_items, rentals, rental_inventory

**Отвечает за:**
- Инвентаризация лодок и оборудования
- Цифровой журнал аренды
- QR-идентификация
- Выдача/возврат
- Фиксация повреждений

**API:**
- `GET/POST/PUT /boats/` — управление лодками
- `POST /rentals/` — создание аренды (через событие)
- `PUT /rentals/{id}/return/` — возврат
- `PUT /rentals/{id}/damage/` — фиксация повреждений
- `GET /inventory/` — инвентарь точки

**Команда 3:** Прокат

---

## 4. SPORT — Соревнования

**Таблицы-владельцы:** teams, team_members, tournaments, tournament_teams, matches, match_results

**Отвечает за:**
- Команды и состав
- Турнирные сетки
- Расписание матчей
- Судейство в реальном времени
- Автоматический подсчёт результатов
- Рейтинги

**API:**
- `GET/POST/PUT /teams/` — команды
- `GET/POST/PUT /tournaments/` — турниры
- `GET/POST/PUT /matches/` — матчи
- `PUT /matches/{id}/score/` — обновление счёта
- `GET /tournaments/{id}/grid/` — турнирная сетка
- `GET /rankings/` — рейтинги

**Команда 4:** Чемпионаты

---

## 5. INCLUSIVE — Инклюзивность

**Таблицы-владельцы:** accessibility_profiles, medical_restrictions, adaptive_route_access, escort_assignments

**Отвечает за:**
- Профили ограничений здоровья
- Адаптивные маршруты и нагрузки
- Назначение сопровождения
- Безопасность инклюзивных программ
- Уровни подготовки

**API:**
- `GET/POST/PUT /profiles/accessibility/` — профили
- `GET/POST /profiles/medical/` — медицинские ограничения
- `GET /routes/adaptive/` — адаптивные маршруты
- `POST /escort/` — назначение сопровождения
- `GET /events/inclusive/` — инклюзивные события

**Команда 5:** Инклюзивность (research-level)

---

## 6. FRANCHISE — Франшизы

**Таблицы-владельцы:** franchises, points (совместно с Core)

**Отвечает за:**
- Управление точками
- Локальные администраторы
- Стандарты работы
- Отчётность
- Подключение новых баз

**API:**
- `GET/POST/PUT /franchises/` — управление
- `GET/POST/PUT /franchises/{id}/points/` — точки
- `GET /franchises/{id}/reports/` — отчёты
- `POST /franchises/{id}/activate/` — активация точки

---

## 7. FINANCE — Финансы и платежи

**Таблицы-владельцы:** payments, pricing

**Отвечает за:**
- Приём платежей
- Привязка платежа к событию
- Тарифы и ценообразование
- Чековая история

**API:**
- `POST /payments/` — создание платежа
- `GET /payments/{id}/` — статус
- `GET /payments/user/{id}/` — история
- `GET/POST /pricing/` — тарифы
- `POST /payments/{id}/refund/` — возврат

---

## 8. PWA — Интерфейс (входная точка)

**Отвечает за:**
- QR-страницы (без авторизации)
- Офлайн-доступ
- Карты маршрутов
- Журнал участника
- Интерфейс судьи
- Интерфейс проката
- Уведомления

**Технологии:** PWA (Service Worker + IndexedDB + WebSocket)
**Связь:** HTTPS + WebSocket API Gateway
