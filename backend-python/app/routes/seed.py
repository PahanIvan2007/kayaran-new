import random
import asyncpg
from fastapi import APIRouter, HTTPException
from faker import Faker
from app.database import pool

router = APIRouter()
fake = Faker("ru_RU")

EVENT_TYPES = [
    "rental", "training", "route", "match",
    "tournament", "inclusive_program", "festival", "corporate",
]
BOAT_TYPES = ["kayak", "catamaran", "rowboat", "sup", "motorboat"]
BOAT_COLORS = [
    "синий", "красный", "зелёный", "жёлтый", "белый",
    "чёрный", "оранжевый", "фиолетовый",
]
DIFFICULTIES = ["easy", "medium", "hard", "adaptive"]
ROUTE_TYPES = ["water", "hiking", "mixed", "adaptive"]
POINT_TYPES = ["base", "franchise", "temporary_event", "storage"]
ROLES = ["participant", "instructor", "judge", "volunteer"]
TOURNAMENT_FORMATS = [
    "single_elimination", "double_elimination",
    "round_robin", "group_stage", "swiss",
]
MATCH_STATUSES = ["scheduled", "active", "finished", "cancelled", "disputed"]
EVENT_STATUSES = ["planned", "active", "completed", "cancelled", "emergency"]
CONDITIONS = ["excellent", "good", "fair", "poor", "damaged"]
TEAM_ROLES = ["captain", "member", "reserve", "coach"]


def generate_short_id(prefix: str) -> str:
    return prefix + fake.bothify(text="??????").lower()


async def truncate_all(conn: asyncpg.Connection):
    tables = [
        "match_results", "matches", "tournament_teams", "tournaments",
        "team_members", "teams", "event_participants", "events",
        "rental_inventory", "rentals", "inventory_items", "boats",
        "route_points", "routes", "activity_zones", "gps_track_points",
        "gps_tracks", "points", "franchises", "users",
        "payments", "pricing", "logs", "accessibility_profiles",
        "medical_restrictions", "adaptive_route_access", "escort_assignments",
    ]
    for t in tables:
        await conn.execute(f'TRUNCATE TABLE {t} RESTART IDENTITY CASCADE')


@router.post("/generate")
async def generate_seed(users_count: int = 50, boats_count: int = 20):
    async with pool.conn.acquire() as conn:
        await truncate_all(conn)

        user_ids = []
        for _ in range(users_count):
            uid = generate_short_id("U")
            role = random.choice(ROLES)
            first_name = fake.first_name()
            last_name = fake.last_name()
            phone = fake.unique.bothify(text="+79#########")
            email = fake.unique.email()
            await conn.execute(
                """INSERT INTO users (id, first_name, last_name, phone, email, role, status, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,'active',NOW())""",
                uid, first_name, last_name, phone, email, role,
            )
            user_ids.append(uid)

        admin_id = generate_short_id("U")
        await conn.execute(
            """INSERT INTO users (id, first_name, last_name, phone, email, role, status)
               VALUES ($1,'Система','Админ','+70000000000','admin@kayran.ru','system_admin','active')
               ON CONFLICT (id) DO NOTHING""",
            admin_id,
        )

        franchise_id = generate_short_id("F")
        await conn.execute(
            """INSERT INTO franchises (id, title, owner_user_id)
               VALUES ($1,$2,$3)""",
            franchise_id, fake.company(), admin_id,
        )

        point_ids = []
        for _ in range(5):
            pid = generate_short_id("P")
            ptype = random.choice(POINT_TYPES)
            lat = round(random.uniform(55.65, 55.85), 7)
            lng = round(random.uniform(37.40, 37.75), 7)
            await conn.execute(
                """INSERT INTO points (id, title, type, franchise_id, address, lat, lng, timezone, status)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,'Europe/Moscow','active')""",
                pid, fake.city(), ptype, franchise_id, fake.address(), lat, lng,
            )
            point_ids.append(pid)

        boats = []
        for i in range(boats_count):
            bid = generate_short_id("B")
            btype = random.choice(BOAT_TYPES)
            color = random.choice(BOAT_COLORS)
            capacity = 1 if btype in ("kayak", "sup") else random.choice([2, 4, 6])
            status = random.choices(
                ["available", "rented", "repair", "inactive", "reserved"],
                weights=[60, 20, 10, 5, 5],
            )[0]
            condition = random.choice(CONDITIONS)
            await conn.execute(
                """INSERT INTO boats (id, point_id, serial_number, title, color, boat_type, capacity, status, condition_level, purchase_date, last_service_date)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)""",
                bid, random.choice(point_ids),
                f"KRN-{i + 1:04d}",
                fake.word().capitalize() + " " + fake.word().capitalize(),
                color, btype, capacity, status, condition,
                fake.date_between(start_date="-3y", end_date="today"),
                fake.date_between(start_date="-6m", end_date="today"),
            )
            boats.append(bid)

        route_ids = []
        for _ in range(10):
            rid = generate_short_id("R")
            difficulty = random.choice(DIFFICULTIES)
            rtype = random.choice(ROUTE_TYPES)
            distance = round(random.uniform(1.0, 20.0), 2)
            duration = int(distance * random.randint(15, 25))
            await conn.execute(
                """INSERT INTO routes (id, title, description, difficulty, distance_km, estimated_duration, route_type, status, created_by)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8)""",
                rid,
                fake.sentence(nb_words=4),
                fake.text(max_nb_chars=120),
                difficulty, distance, duration, rtype, random.choice(user_ids),
            )
            route_ids.append(rid)

        for rid in route_ids:
            num_points = random.randint(3, 7)
            for idx in range(num_points):
                rpid = generate_short_id("P")
                lat = round(random.uniform(55.65, 55.85), 7)
                lng = round(random.uniform(37.40, 37.75), 7)
                ctype = "start" if idx == 0 else "finish" if idx == num_points - 1 else random.choice(
                    ["waypoint", "rest", "photo"]
                )
                await conn.execute(
                    """INSERT INTO route_points (id, route_id, order_index, lat, lng, title, checkpoint_type)
                       VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                    rpid, rid, idx + 1, lat, lng,
                    fake.word().capitalize(), ctype,
                )

        event_ids = []
        for _ in range(15):
            eid = generate_short_id("E")
            etype = random.choice(EVENT_TYPES)
            estatus = random.choice(EVENT_STATUSES)
            start = fake.date_time_between(start_date="-30d", end_date="+60d")
            await conn.execute(
                """INSERT INTO events (id, event_type, title, description, start_time, end_time, point_id, route_id, created_by, max_participants, status, visibility)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'public')""",
                eid, etype, fake.sentence(nb_words=5),
                fake.text(max_nb_chars=200), start,
                fake.date_time_between(start_date=start, end_date="+1d"),
                random.choice(point_ids),
                random.choice(route_ids) if random.random() > 0.3 else None,
                admin_id, random.randint(4, 50),
                estatus,
            )
            event_ids.append(eid)

        for eid in event_ids:
            participants = random.sample(user_ids, min(random.randint(2, 8), len(user_ids)))
            for uid in participants:
                await conn.execute(
                    """INSERT INTO event_participants (event_id, user_id, role, checked_in)
                       VALUES ($1,$2,$3,$4)
                       ON CONFLICT DO NOTHING""",
                    eid, uid, random.choice(["participant", "instructor", "judge", "volunteer"]),
                    random.random() > 0.4,
                )

        team_ids = []
        for _ in range(8):
            tid = generate_short_id("T")
            captain = random.choice(user_ids)
            await conn.execute(
                """INSERT INTO teams (id, title, captain_user_id, description, status)
                   VALUES ($1,$2,$3,$4,'active')""",
                tid, fake.sentence(nb_words=3), captain,
                fake.text(max_nb_chars=100),
            )
            team_ids.append(tid)

            members = random.sample(
                [u for u in user_ids if u != captain],
                min(random.randint(2, 5), len(user_ids) - 1),
            )
            for uid in members:
                await conn.execute(
                    """INSERT INTO team_members (team_id, user_id, role)
                       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING""",
                    tid, uid, random.choice(TEAM_ROLES),
                )

        tournament_ids = []
        for _ in range(4):
            mid = generate_short_id("M")
            eid = random.choice(event_ids)
            fmt = random.choice(TOURNAMENT_FORMATS)
            await conn.execute(
                """INSERT INTO tournaments (id, event_id, title, format, min_teams, max_teams, status)
                   VALUES ($1,$2,$3,$4,$5,$6,'registration')""",
                mid, eid, fake.sentence(nb_words=4), fmt,
                min(2, len(team_ids)), len(team_ids),
            )
            tournament_ids.append(mid)

            teams_for_tournament = random.sample(team_ids, min(random.randint(2, 4), len(team_ids)))
            for idx, tid in enumerate(teams_for_tournament):
                await conn.execute(
                    """INSERT INTO tournament_teams (tournament_id, team_id, seed)
                       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING""",
                    mid, tid, idx + 1,
                )

        for mid in tournament_ids:
            num_matches = random.randint(2, 4)
            for rnd in range(num_matches):
                match_id = generate_short_id("S")
                eid = random.choice(event_ids)
                teams_in_tournament = team_ids[:]
                if len(teams_in_tournament) >= 2:
                    ta, tb = random.sample(teams_in_tournament, 2)
                else:
                    continue
                score_a = random.randint(0, 10)
                score_b = random.randint(0, 10)
                winner = ta if score_a > score_b else tb if score_b > score_a else None
                await conn.execute(
                    """INSERT INTO matches (id, event_id, tournament_id, round, match_number, team_a_id, team_b_id, judge_user_id, start_time, end_time, score_a, score_b, winner_team_id, status)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
                    match_id, eid, mid, rnd + 1, rnd + 1,
                    ta, tb, random.choice(user_ids),
                    fake.date_time_between(start_date="-15d", end_date="+30d"),
                    fake.date_time_between(start_date="-15d", end_date="+30d"),
                    score_a, score_b, winner,
                    random.choice(MATCH_STATUSES),
                )

                result_id = generate_short_id("R")
                await conn.execute(
                    """INSERT INTO match_results (id, match_id, recorded_by, team_a_score, team_b_score, details, confirmed)
                       VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                    result_id, match_id, random.choice(user_ids),
                    score_a, score_b, '{"rounds": []}',
                    random.random() > 0.3,
                )

        rentals_count = 0
        for _ in range(25):
            rental_id = generate_short_id("A")
            eid = random.choice(event_ids)
            uid = random.choice(user_ids)
            if not boats:
                continue
            bid = random.choice(boats)
            start = fake.date_time_between(start_date="-30d", end_date="+30d")
            rstatus = random.choice(["active", "completed", "cancelled", "overdue"])
            if rstatus != "cancelled":
                end = fake.date_time_between(start_date=start, end_date="+5d")
            else:
                end = None
            await conn.execute(
                """INSERT INTO rentals (id, event_id, user_id, boat_id, start_time, end_time, status)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                rental_id, eid, uid, bid, start, end, rstatus,
            )
            rentals_count += 1

        return {
            "users": users_count,
            "boats": boats_count,
            "franchises": 1,
            "points": len(point_ids),
            "routes": len(route_ids),
            "route_points": sum(random.randint(3, 7) for _ in range(10)),
            "events": len(event_ids),
            "teams": len(team_ids),
            "tournaments": len(tournament_ids),
            "rentals": rentals_count,
        }
