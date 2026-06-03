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

## Сборка фронтенда (Angular)
```powershell
cd D:\Кайран\frontend-angular; ng build
```

## Сборка Go-бекенда
```powershell
cd D:\Кайран\backend-go; go build -ldflags="-s -w" -o kayran-server.exe .
```

## Полный рестарт (сборка + запуск)
```powershell
cd D:\Кайран\frontend-angular; ng build; if ($?) { cd D:\Кайран\backend-go; go build -ldflags="-s -w" -o kayran-server.exe .; if ($?) { Get-Process -Name kayran-server -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 2; $env:DATABASE_URL="postgres://postgres:123@localhost:5432/kayran?sslmode=disable"; Start-Process -FilePath "D:\Кайран\backend-go\kayran-server.exe" -WindowStyle Hidden; echo "OK" } }
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
- http://localhost:8000 — фронтенд
- http://localhost:8000/docs — Swagger API (Go не имеет встроенного Swagger)

## Тестовые пользователи (логин по телефону)
| Телефон | Имя | Роль |
|---------|-----|------|
| +79990000001 | Дмитрий Волков | system_admin |
| +79990001122 | Анна Спортсменова | participant |
| +79990000003 | Иван Петров | instructor |
| +79990000012 | Татьяна Соколова | judge |

## Структура проекта
- `D:\Кайран\frontend-angular\` — Angular PWA
- `D:\Кайран\backend-go\` — Go API сервер
- `D:\Кайран\db\` — SQL схемы и миграции
- `D:\Кайран\docs\` — документация
