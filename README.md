# KAYRAN — Платформа водных активностей

Распределённая цифровая платформа для управления водными, береговыми и спортивно-туристическими активностями. Прокат, маршруты, соревнования, инклюзивные программы — в единой экосистеме.

## Стек

| Компонент | Язык | Порт | Назначение |
|-----------|------|------|------------|
| `backend-go/` | Go + chi + pgx | `:8000` | Основное API (аренда, события, маршруты, спорт) |
| `backend-python/` | Python FastAPI | `:8001` | Микросервис (аналитика, погода, seed) |
| `frontend-angular/` | Angular 21 PWA | — | SPA (через Go) + WASM GPS + QR |
| `gps-wasm/` | Rust → WASM | — | Вычисление дистанции, треков (30 KB) |
| `db/` | PostgreSQL 18 + PostGIS | `:5432` | Основная БД (`kayran`) |

## Быстрый старт

### 1. PostgreSQL

```powershell
# Создать БД (если нет)
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -c "CREATE DATABASE kayran;"
```

### 2. Go — основное API

```powershell
$env:DATABASE_URL="postgres://postgres:123@localhost:5432/kayran?sslmode=disable"
cd D:\Кайран\backend-go
go build -ldflags="-s -w" -o kayran-server.exe .
Start-Process -FilePath "D:\Кайран\backend-go\kayran-server.exe" -WindowStyle Hidden
```

Схемы БД и тестовые данные применяются **автоматически** при запуске (`seed.Run()`).

### 3. Frontend (Angular)

```powershell
cd D:\Кайран\frontend-angular
ng build
```

Результат в `dist/frontend-angular/browser/` — раздаётся Go-сервером на `localhost:8000`.

Для разработки:

```powershell
ng serve --proxy-config proxy.conf.json  # localhost:4200
```

### 4. Python — аналитика и погода

```powershell
cd D:\Кайран\backend-python
pip install -r requirements.txt
python run.py  # localhost:8001
```

### 5. Rust WASM — GPS-вычисления в браузере

```powershell
cd D:\Кайран\gps-wasm
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
cargo build --target wasm32-unknown-unknown --release
Copy-Item target\wasm32-unknown-unknown\release\gps_wasm.wasm ..\frontend-angular\src\assets\wasm\gps_ops.wasm
```

## Полный перезапуск

```powershell
cd D:\Кайран\frontend-angular; ng build; if ($?) {
  cd D:\Кайран\backend-go; go build -ldflags="-s -w" -o kayran-server.exe .; if ($?) {
    Get-Process -Name kayran-server -ErrorAction SilentlyContinue | Stop-Process -Force;
    Start-Sleep -Seconds 2;
    $env:DATABASE_URL="postgres://postgres:123@localhost:5432/kayran?sslmode=disable";
    Start-Process -FilePath "D:\Кайран\backend-go\kayran-server.exe" -WindowStyle Hidden;
    Write-Host "OK"
  }
}
```

## Тестовые пользователи

| Телефон | Имя | Роль |
|---------|-----|------|
| +79990000001 | Дмитрий Волков | admin (`system_admin`) |
| +79990001122 | Анна Спортсменова | участник |
| +79990000003 | Иван Петров | инструктор |
| +79990000012 | Татьяна Соколова | судья |

Вход: `POST /auth/login { "phone": "+79990000001" }`

## API

Go (порт 8000): `/auth/*`, `/boats/*`, `/events/*`, `/rentals/*`, `/gps/*`, `/routes/*`, `/teams/*`, `/tournaments/*`, `/matches/*`, `/profiles/*`, `/users/*`, `/franchises/*`

Python (порт 8001): `/health`, `/api/v1/analytics/*`, `/api/v1/weather/*`, `/api/v1/seed/generate`

## Документация

| Файл | Описание |
|------|----------|
| `MANIFEST.md` | Манифест и философия |
| `ARCHITECTURE.md` | Архитектурная карта |
| `DEVELOPMENT_RULES.md` | Правила разработки |
| `ER_DIAGRAM.md` | ER-диаграммы |
| `EVENT_FLOWS.md` | Сценарии использования |
| `MODULES.md` | Структура модулей |
| `API_CONTRACT.md` | API-контракт |
| `docs/GLOSSARY.md` | Словарь сущностей |
| `docs/STUDENT_GUIDE.md` | Руководство студента |
| `docs/ROADMAP.md` | Дорожная карта |

## Модули

- **Core** — пользователи, события, авторизация (JWT 72h)
- **Geo** — маршруты, GPS-трекинг, зоны (PostGIS)
- **Rental** — прокат лодок и инвентаря
- **Sport** — команды, матчи, турниры
- **Inclusive** — инклюзивные программы
- **Franchise** — управление точками
- **Finance** — платежи и тарифы
