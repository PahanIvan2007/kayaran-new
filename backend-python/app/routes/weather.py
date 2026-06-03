import random
import math
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, HTTPException
from app.database import pool

router = APIRouter()

CONDITIONS = ["sunny", "cloudy", "light rain", "partly cloudy", "clear"]


def generate_forecast(lat: float, lng: float, hours: int = 8):
    now = datetime.now(timezone.utc)
    base_temp = 18 + (lat - 55.7) * 10
    base_temp = max(18, min(28, base_temp))
    results = []
    for i in range(hours):
        ts = now + timedelta(hours=i)
        temp = round(base_temp + math.sin(i * math.pi / 6) * 5 + random.uniform(-2, 2), 1)
        wind = round(random.uniform(0, 5), 1)
        cond = random.choice(CONDITIONS)
        results.append({
            "time": ts.isoformat(),
            "temperature_c": temp,
            "wind_m_s": wind,
            "condition": cond,
            "humidity_pct": random.randint(40, 85),
        })
    return results


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., ge=40, le=80),
    lng: float = Query(..., ge=20, le=180),
    hours: int = Query(8, ge=1, le=48),
):
    return {
        "lat": lat,
        "lng": lng,
        "forecast": generate_forecast(lat, lng, hours),
    }


@router.get("/conditions")
async def get_conditions(point_id: str = Query(..., min_length=1)):
    async with pool.conn.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, title, lat, lng FROM points WHERE id = $1",
            point_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Point not found")
    lat = float(row["lat"])
    lng = float(row["lng"])
    forecast = generate_forecast(lat, lng, 4)
    return {
        "point_id": row["id"],
        "point_title": row["title"],
        "lat": lat,
        "lng": lng,
        "current": forecast[0] if forecast else None,
        "forecast": forecast,
    }
