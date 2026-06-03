# СЦЕНАРИЙ ДЕМОНСТРАЦИИ
## Платформа Kayran — 25 минут

---

### 1. ВИДЕНИЕ (3 мин)

> «Мы создаём распределённую цифровую платформу для управления водными, береговыми и спортивно-туристическими активами. Объединяет прокат, маршруты, соревнования, обучение и инклюзивные программы в единую экосистему. Это не приложение — это операционная система для активностей на воде.»

**Показать:** `MANIFEST.md`

Ключевые принципы:
- Event-driven — всё вокруг события
- Offline-first — работа без интернета
- QR-доступ — без установки приложений
- Модульность — независимые команды

---

### 2. АРХИТЕКТУРА (5 мин)

**Показать:** `ARCHITECTURE.md` + `ER_DIAGRAM.md`

**Три слоя:**
```
Сущности (данные) → Связи (отношения) → Модули (функции)
```

**Центральная сущность — СОБЫТИЕ:**
- Аренда лодки = событие
- Тренировка = событие
- Матч = событие
- Чемпионат = событие
- Инклюзивная программа = событие

**Показать структуру БД:** 27 таблиц
```powershell
# в терминале
$env:PGPASSWORD="123"; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d kayran -c "\dt"
```

---

### 3. ДЕМО API В SWAGGER (10 мин)

**Открыть:** http://localhost:8000/docs

**Шаг 1 — Регистрация пользователя**
```
POST /auth/register
{
  "first_name": "Анна",
  "last_name": "Спортсменова",
  "phone": "+79990001122"
}
```
✅ Ответ: токен + user_id

**Шаг 2 — Создать событие (тренировка)**
```
POST /events
{
  "event_type": "training",
  "title": "Вечерняя тренировка на байдарках",
  "start_time": "2026-06-01T18:00:00Z",
  "point_id": "P000001"
}
```
✅ Ответ: event_id = E...

**Шаг 3 — Добавить участника**
```
POST /events/{event_id}/participants?user_id={user_id}
```

**Шаг 4 — Посмотреть доступные лодки**
```
GET /boats/available?point_id=P000001
```
✅ Покажет 5 лодок

**Шаг 5 — Создать аренду (выдать лодку)**
```
POST /rentals
{
  "event_id": "E...",
  "boat_id": "B000001",
  "start_time": "2026-06-01T18:00:00Z"
}
```
✅ Лодка перешла в статус "rented"

**Шаг 6 — Старт GPS-трекинга**
```
POST /gps/tracks
{
  "event_id": "E...",
  "device_id": "phone-01"
}
```
✅ Трек создан, статус active

**Шаг 7 — Загрузить точки GPS**
```
POST /gps/tracks/{track_id}/points
{
  "points": [
    {"lat": 55.76, "lng": 37.62, "timestamp": "2026-06-01T18:05:00Z", "speed": 4.2},
    {"lat": 55.77, "lng": 37.63, "timestamp": "2026-06-01T18:10:00Z", "speed": 5.1}
  ]
}
```

**Шаг 8 — Завершить аренду**
```
PUT /rentals/{rental_id}/return
```
✅ Лодка снова "available", трек завершён, дистанция посчитана

---

### 3.5. ДЕМО ANGULAR PWA (5 мин)

**Открыть:** http://localhost:8000 → открывается Angular SPA

**Что показать:**

**Шаг 1 — Табы как маршруты**
```
http://localhost:8000/ → редирект на /scan
http://localhost:8000/boats → список лодок
http://localhost:8000/profile → вход/профиль
```
✅ Lazy loading: каждый таб — отдельный JS-чанк (показать в Network tab)

**Шаг 2 — Темы
- Тёмная тема (CSS custom properties)
- Анимация fadeIn при смене табов
- Скелетоны при загрузке

**Шаг 3 — Reactive Forms**
- Создание лодки (ReactiveFormsModule + валидация)
- Создание события
- Вход через форму

**Шаг 4 — Offline-first**
- Отключить Wi-Fi → показать баннер "Офлайн"
- Данные из localStorage
- Service Worker: cache-first для статики

**Шаг 5 — PWA**
- Chrome DevTools → Application → Manifest
- Lighthouse → PWA audit
- Add to Home Screen

**Показать код в IDE:**
```
frontend-angular/src/
  app/
    app.ts              ← корневой компонент с router-outlet
    app.routes.ts       ← ленивые маршруты
    services/           ← DI-сервисы (ApiService, AuthService...)
    pages/
      scanner/          ← QR-сканер (jsQR + камера)
      boats/            ← список + форма создания
      events/           ← список + форма
      sport/            ← команды + турниры
      profile/          ← Reactive Form (login)
  src/styles.css        ← вся тёмная тема
  public/sw.js          ← Service Worker
  public/manifest.json  ← PWA манифест
```

---

### 4. МОДУЛИ И КОМАНДЫ (5 мин)

**Показать:** `MODULES.md` + `students/`

| Команда | Модуль | Таблицы |
|---------|--------|---------|
| Команда 1 | Пользователи и роли | users, auth |
| Команда 2 | Маршруты и GPS | routes, gps_tracks |
| Команда 3 | Прокат | boats, rentals |
| Команда 4 | Чемпионаты | teams, matches, tournaments |
| Команда 5 | Инклюзивность | accessibility_profiles, medical |

**Важно:** Все модули ссылаются на `events`. Нельзя сломать систему друг другу.

---

### 5. ПЛАН РАЗВИТИЯ (2 мин)

**Показать:** `docs/ROADMAP.md`

| Дата | Веха |
|------|------|
| **1 июня** | Утверждение архитектуры |
| **13 июня** | MVP каждого модуля |
| Сентябрь | Альфа — 3 реальные точки |
| Ноябрь | Бета — 50+ пользователей |
| Январь 2027 | Релиз 1.0 |

---

### БОНУС: Что показать, если есть время

**Спорт — турнирная сетка:**
```
POST /tournaments
POST /matches → PUT /matches/{id}/score
GET /tournaments/{id}  ← видна сетка с результатами
```

**Инклюзивность — профиль:**
```
PUT /profiles/accessibility/{user_id}
POST /profiles/medical/{user_id}
```

**QR-логика:**
```
https://kayran.app/q/boat/B000001  ← открывает страницу лодки
https://kayran.app/q/event/E000001 ← открывает событие
```

---

## ЧЕК-ЛИСТ ПЕРЕД ДЕМО

- [ ] Angular собран: `cd frontend-angular && npm run build`
- [ ] Сервер запущен: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`
- [ ] Открывается http://localhost:8000 (Angular SPA)
- [ ] Swagger открывается: http://localhost:8000/docs
- [ ] Chrome DevTools открыт, вкладка Network (показать lazy chunks)
- [ ] Проводник открыт на `D:\Кайран\frontend-angular\src\`
- [ ] Залиты seed-данные (admin, лодки, маршруты) — `db_full_schema.sql`
- [ ] Проектор/экран захватывает браузер и терминал
- [ ] **Быстрый старт:** `powershell -File start.ps1`
