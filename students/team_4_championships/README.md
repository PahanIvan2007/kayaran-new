# Команда 4: Чемпионаты

## Домен
Команды, матчи, турнирные сетки, судейство, результаты, рейтинги.

## Таблицы-владельцы
- `teams` — команды
- `team_members` — состав
- `tournaments` — турниры
- `tournament_teams` — участники турниров
- `matches` — матчи
- `match_results` — результаты

## API
- `GET/POST /teams` — команды
- `POST /teams/{id}/members` — состав
- `GET/POST /tournaments` — турниры
- `GET /tournaments/{id}/grid` — сетка
- `GET/POST /matches` — матчи
- `PUT /matches/{id}/score` — счёт
- `GET /rankings` — рейтинги

## Задачи
- [ ] CRUD команд и состава
- [ ] Генерация турнирной сетки (single elimination)
- [ ] Расписание матчей
- [ ] Судейство: обновление счёта в реальном времени
- [ ] Автоматический подсчёт победителя
- [ ] Обновление сетки после матча
- [ ] Realtime через WebSocket

## Алгоритмы
- Single elimination (1/4, 1/2, финал)
- Double elimination (сетка с выбыванием через нижнюю сетку)
- Round-robin (каждый с каждым)
- Group stage → playoffs

## Связанные модули
- Core (events — матчи/турниры как событие)
- Users (игроки, судьи)
