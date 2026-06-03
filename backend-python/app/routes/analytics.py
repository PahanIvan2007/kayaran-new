from fastapi import APIRouter
from app.database import pool

router = APIRouter()


@router.get("/summary")
async def get_summary():
    async with pool.conn.acquire() as conn:
        users = await conn.fetchval("SELECT count(*) FROM users")
        boats = await conn.fetchval("SELECT count(*) FROM boats")
        rentals = await conn.fetchval("SELECT count(*) FROM rentals")
        events = await conn.fetchval("SELECT count(*) FROM events")
        routes = await conn.fetchval("SELECT count(*) FROM routes")
        active_rentals = await conn.fetchval(
            "SELECT count(*) FROM rentals WHERE status = 'active'"
        )
        available_boats = await conn.fetchval(
            "SELECT count(*) FROM boats WHERE status = 'available'"
        )
    return {
        "total_users": users,
        "total_boats": boats,
        "total_rentals": rentals,
        "total_events": events,
        "total_routes": routes,
        "active_rentals": active_rentals,
        "available_boats": available_boats,
    }


@router.get("/popular-routes")
async def get_popular_routes():
    async with pool.conn.acquire() as conn:
        rows = await conn.fetch(
            """SELECT r.id, r.title, r.difficulty, r.distance_km,
                      count(e.id)::int as event_count
               FROM routes r
               LEFT JOIN events e ON e.route_id = r.id
               GROUP BY r.id, r.title, r.difficulty, r.distance_km
               ORDER BY event_count DESC
               LIMIT 5"""
        )
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "difficulty": r["difficulty"],
            "distance_km": float(r["distance_km"]) if r["distance_km"] else 0,
            "event_count": r["event_count"],
        }
        for r in rows
    ]


@router.get("/boat-utilization")
async def get_boat_utilization():
    async with pool.conn.acquire() as conn:
        rows = await conn.fetch(
            """SELECT b.id, b.title, b.boat_type, b.status, b.condition_level,
                      count(r.id)::int as rental_count
               FROM boats b
               LEFT JOIN rentals r ON r.boat_id = b.id
               GROUP BY b.id, b.title, b.boat_type, b.status, b.condition_level
               ORDER BY rental_count DESC"""
        )
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "boat_type": r["boat_type"],
            "status": r["status"],
            "condition_level": r["condition_level"],
            "rental_count": r["rental_count"],
        }
        for r in rows
    ]
