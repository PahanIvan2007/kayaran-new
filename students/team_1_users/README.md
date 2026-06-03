# Команда 1: Пользователи и роли

## Домен
Аутентификация, авторизация, профили пользователей, управление ролями.

## Таблицы-владельцы
- `users` — профили, роли, статусы
- `event_participants` — участие в событиях (совместно с Core)

## API
- `POST /auth/register` — регистрация
- `POST /auth/login` — вход
- `GET /auth/me` — профиль
- `PUT /users/{id}` — редактирование
- `GET /users` — список (admin)

## Задачи
- [ ] Регистрация по телефону
- [ ] JWT-авторизация
- [ ] CRUD пользователей
- [ ] Ролевая модель (participant, instructor, judge, volunteer, admin)
- [ ] Блокировка/удаление пользователей

## Связанные модули
- Core (events)
- Inclusive (profiles)
- Sport (teams, captains)
