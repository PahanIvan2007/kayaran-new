# Kayran — полезные команды

## Запуск сервера
```powershell
$env:DATABASE_URL="postgres://postgres:123@localhost:5432/kayran?sslmode=disable"
Start-Process -FilePath "D:\Кайран\backend-go\kayran-server.exe" -WindowStyle Hidden
```

## Остановка сервера
```powershell
Get-Process -Name kayran-server | Stop-Process -Force
```

## Сборка и запуск
```powershell
# Полная сборка (React → embed → Go) + запуск
D:\Кайран\build.ps1; if ($?) { Get-Process -Name kayran-server -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 2; $env:DATABASE_URL="postgres://postgres:123@localhost:5432/kayran?sslmode=disable"; Start-Process -FilePath "D:\Кайран\backend-go\kayran-server.exe" -WindowStyle Hidden; echo "OK" }
```

## Сборка фронта отдельно
```powershell
cd D:\Кайран\frontend-react; npm run build
```

## Dev-сервер React (с hot-reload)
```powershell
cd D:\Кайран\frontend-react; npm run dev
# Фронт на :5173, API проксируется на :8000
```

## Проверка БД (PostgreSQL)
```powershell
$env:PGPASSWORD='123'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -d kayran -c "SELECT count(*) FROM users;"
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -d kayran -c "SELECT count(*) FROM boats;"
```

## Сброс данных и перезаливка seed
```powershell
$env:PGPASSWORD='123'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -d kayran -c "TRUNCATE matches, rentals, tournaments, teams, route_points, routes, events, boats, points, franchises, users, event_participants, gps_tracks, gps_track_points, team_members, tournament_teams, match_results, payments, pricing, logs, accessibility_profiles, medical_restrictions, adaptive_route_access, escort_assignments, inventory_items, rental_inventory, activity_zones RESTART IDENTITY CASCADE;"
```

После этого запустить сервер — seed выполнится автоматически.

## Сайт
- http://localhost:8000 — фронтенд (локально)
- http://localhost:8000/docs — Swagger API (Go не имеет встроенного Swagger)

## Тестовые пользователи (логин по телефону)
| Телефон | Имя | Роль |
|---------|-----|------|
| +79990000001 | Дмитрий Волков | system_admin |
| +79990001122 | Анна Спортсменова | participant |
| +79990000003 | Иван Петров | instructor |
| +79990000012 | Татьяна Соколова | judge |

## Python-микросервис (аналитика, погода, seed)
```powershell
cd D:\Кайран\backend-python
pip install -r requirements.txt
python run.py                              # :8001
```

### Python endpoints
- `GET /health`
- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/popular-routes`
- `GET /api/v1/analytics/boat-utilization`
- `POST /api/v1/seed/generate?users_count=50&boats_count=20`
- `GET /api/v1/weather/forecast?lat=55.75&lng=37.61`
- `GET /api/v1/weather/conditions?point_id=P000001`

## Rust → WASM (GPS-вычисления в браузере)
```powershell
cd D:\Кайран\gps-wasm
.\build.ps1  # нужен wasm-pack
```

Без wasm-pack — прямая сборка:
```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
cd D:\Кайран\gps-wasm
cargo build --target wasm32-unknown-unknown --release
Copy-Item target\wasm32-unknown-unknown\release\gps_wasm.wasm ..\frontend-angular\src\assets\wasm\gps_ops.wasm
```

## Деплой на Fly.io (бесплатно, 3×256MB, не спит)
```powershell
& "$env:USERPROFILE\.fly\bin\flyctl.exe" apps create kayran
& "$env:USERPROFILE\.fly\bin\flyctl.exe" postgres create --name kayran-db --region ams --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
# скопировать DATABASE_URL из вывода ↑
& "$env:USERPROFILE\.fly\bin\flyctl.exe" secrets set DATABASE_URL="postgres://..." JWT_SECRET="kayran-secret-key-2026"
& "$env:USERPROFILE\.fly\bin\flyctl.exe" deploy
```

## Структура проекта
- `D:\Кайран\frontend-angular\` — Angular PWA (+ Rust WASM fallback на JS)
- `D:\Кайран\backend-go\` — Go API сервер (:8000)
- `D:\Кайран\backend-python\` — Python FastAPI микросервис (:8001)
- `D:\Кайран\gps-wasm\` — Rust WASM модуль GPS-вычислений
- `D:\Кайран\db\` — SQL схемы и миграции
- `D:\Кайран\docs\` — документация
