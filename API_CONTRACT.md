# API-КОНТРАКТ ПЛАТФОРМЫ
## Версия 0.1 — REST API + WebSocket

---

## 1. ОБЩИЕ ПРАВИЛА

### Базовый URL
```
https://api.kayran.ru/v1
```

### Формат ответа
```json
{
    "success": true,
    "data": { ... },
    "error": null,
    "meta": {
        "page": 1,
        "per_page": 50,
        "total": 100
    }
}
```

### Формат ошибки
```json
{
    "success": false,
    "data": null,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Описание ошибки",
        "details": { "field": "email", "reason": "required" }
    },
    "meta": null
}
```

### Авторизация
```
Authorization: Bearer <JWT-token>
```

### Пагинация
```
GET /resource?page=1&per_page=50&sort=created_at:desc
```

---

## 2. ENDPOINTS ПО МОДУЛЯМ

### 2.1 CORE — Авторизация и пользователи

| Method | Path | Описание |
|--------|------|----------|
| POST | /auth/register | Регистрация |
| POST | /auth/login | Вход (телефон/email) |
| POST | /auth/refresh | Обновление токена |
| GET | /auth/me | Текущий пользователь |
| PUT | /auth/me | Обновить профиль |
| GET | /users | Список пользователей |
| GET | /users/{id} | Пользователь по ID |
| PUT | /users/{id} | Обновить пользователя (admin) |
| PUT | /users/{id}/block | Блокировка |

### 2.2 CORE — События

| Method | Path | Описание |
|--------|------|----------|
| POST | /events | Создать событие |
| GET | /events | Список событий (фильтры) |
| GET | /events/{id} | Детали события |
| PUT | /events/{id} | Обновить событие |
| PATCH | /events/{id}/status | Сменить статус |
| POST | /events/{id}/participants | Добавить участника |
| DELETE | /events/{id}/participants/{uid} | Удалить участника |
| PUT | /events/{id}/checkin/{uid} | Отметить прибытие |
| GET | /events/{id}/report | Отчёт события |

**Фильтры для GET /events:**
- `?event_type=rental`
- `?point_id=P000001`
- `?status=active`
- `?start_from=2026-06-01T00:00:00Z`
- `?start_to=2026-06-30T23:59:59Z`
- `?created_by=U000001`

### 2.3 GEO — Маршруты

| Method | Path | Описание |
|--------|------|----------|
| POST | /routes | Создать маршрут |
| GET | /routes | Список маршрутов |
| GET | /routes/{id} | Маршрут с точками |
| PUT | /routes/{id} | Обновить |
| POST | /routes/{id}/points | Добавить точку маршрута |
| GET | /routes/{id}/points | Точки маршрута |
| PUT | /route-points/{id} | Обновить точку |

### 2.4 GEO — GPS

| Method | Path | Описание |
|--------|------|----------|
| POST | /gps/tracks | Создать трек-сессию |
| PUT | /gps/tracks/{id}/end | Завершить трек |
| POST | /gps/tracks/{id}/points | Загрузить точки |
| GET | /gps/tracks/{id} | Получить трек |
| GET | /gps/tracks/event/{event_id} | Треки события |
| POST | /gps/sos | SOS-сигнал |

**Пакетная загрузка точек GPS:**
```json
POST /gps/tracks/{id}/points
{
    "points": [
        { "lat": 55.7558, "lng": 37.6173, "timestamp": "2026-06-01T10:00:00Z", "speed": 3.5 },
        { "lat": 55.7559, "lng": 37.6174, "timestamp": "2026-06-01T10:00:05Z", "speed": 3.7 }
    ]
}
```

### 2.5 RENTAL — Прокат

| Method | Path | Описание |
|--------|------|----------|
| GET | /boats | Список лодок |
| GET | /boats/{id} | Лодка по ID |
| POST | /boats | Добавить лодку |
| PUT | /boats/{id} | Обновить |
| PUT | /boats/{id}/status | Сменить статус |
| GET | /boats/available?point_id= | Доступные лодки точки |
| POST | /rentals | Создать аренду |
| GET | /rentals/{id} | Аренда по ID |
| PUT | /rentals/{id}/return | Возврат |
| PUT | /rentals/{id}/damage | Повреждения |
| GET | /rentals/active | Активные аренды |
| GET | /rentals/user/{user_id} | История аренд |
| GET | /inventory | Инвентарь точки |
| POST | /inventory | Добавить инвентарь |

### 2.6 SPORT — Спорт

| Method | Path | Описание |
|--------|------|----------|
| POST | /teams | Создать команду |
| GET | /teams | Список команд |
| GET | /teams/{id} | Команда с составом |
| POST | /teams/{id}/members | Добавить участника |
| DELETE | /teams/{id}/members/{uid} | Удалить участника |
| POST | /tournaments | Создать турнир |
| GET | /tournaments | Список турниров |
| GET | /tournaments/{id} | Турнир с сеткой |
| GET | /tournaments/{id}/grid | Сетка турнира |
| PUT | /tournaments/{id}/generate | Сгенерировать матчи |
| POST | /matches | Создать матч |
| GET | /matches/{id} | Матч по ID |
| PUT | /matches/{id}/score | Обновить счёт |
| PUT | /matches/{id}/status | Статус матча |

### 2.7 FINANCE

| Method | Path | Описание |
|--------|------|----------|
| POST | /payments | Создать платёж |
| GET | /payments/{id} | Статус платежа |
| POST | /payments/{id}/confirm | Подтвердить |
| POST | /payments/{id}/refund | Возврат |
| GET | /payments/event/{event_id} | Платежи события |
| GET | /pricing | Тарифы |
| POST | /pricing | Установить тариф |

### 2.8 INCLUSIVE

| Method | Path | Описание |
|--------|------|----------|
| GET | /profiles/accessibility/{userId} | Профиль |
| PUT | /profiles/accessibility/{userId} | Обновить |
| GET | /profiles/medical/{userId} | Ограничения |
| POST | /profiles/medical/{userId} | Добавить ограничение |
| DELETE | /profiles/medical/{id} | Удалить ограничение |
| GET | /routes/adaptive | Адаптивные маршруты |
| POST | /escort | Назначить сопровождение |
| GET | /escort/event/{eventId} | Сопровождение события |

### 2.9 FRANCHISE

| Method | Path | Описание |
|--------|------|----------|
| POST | /franchises | Создать франшизу |
| GET | /franchises | Список |
| GET | /franchises/{id} | Детали |
| PUT | /franchises/{id} | Обновить |
| GET | /franchises/{id}/points | Точки франшизы |
| GET | /franchises/{id}/reports | Отчёты |
| POST | /franchises/{id}/activate | Активировать точку |

---

## 3. WEBSOCKET (REALTIME)

### Подключение
```
wss://api.kayran.ru/v1/ws?token=<JWT>
```

### События (сервер → клиент)
```json
{
    "type": "gps.update",
    "data": { "track_id": "G000001", "lat": 55.7558, "lng": 37.6173 }
}
```

| Тип | Описание |
|-----|----------|
| gps.update | Новая GPS-точка |
| match.score | Обновление счёта матча |
| match.status | Смена статуса матча |
| sos.alert | SOS-сигнал |
| event.status | Смена статуса события |
| notification | Уведомление пользователю |

### Действия (клиент → сервер)
| Тип | Описание |
|-----|----------|
| gps.batch | Пакетная отправка GPS |
| match.score_update | Обновление счёта (судья) |
| sos.trigger | Отправка SOS |
| ping | Проверка соединения |

---

## 4. QR-КОДЫ

### Формат QR-контента
```
https://kayran.app/q/{entity_type}/{short_id}
```

### Типы QR
| Тип | Описание | Редирект |
|-----|----------|---------|
| boat/{id} | Лодка | Страница аренды лодки |
| point/{id} | Точка | Страница точки |
| event/{id} | Событие | Страница события |
| rental/{id} | Аренда | Журнал аренды |
| team/{id} | Команда | Профиль команды |
| checkin/{point_id} | Точка входа | Чек-ин на событии |
