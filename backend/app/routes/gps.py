from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import GpsTrack, GpsTrackPoint, User
from app.auth import get_current_user

router = APIRouter(prefix="/gps", tags=["gps"])


class TrackCreate(BaseModel):
    event_id: str
    device_id: str | None = None


class TrackPoint(BaseModel):
    lat: float
    lng: float
    timestamp: datetime
    speed: float | None = None
    accuracy: float | None = None
    altitude_m: float | None = None
    battery_level: float | None = None


class PointsBatch(BaseModel):
    points: list[TrackPoint]


@router.post("/tracks")
async def start_track(
    req: TrackCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    track = GpsTrack(
        event_id=req.event_id,
        user_id=user.id,
        device_id=req.device_id,
        started_at=datetime.utcnow(),
        status="active",
    )
    db.add(track)
    await db.commit()
    await db.refresh(track)
    return {"id": track.id, "status": track.status, "started_at": track.started_at.isoformat()}


@router.put("/tracks/{track_id}/end")
async def end_track(
    track_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GpsTrack).where(GpsTrack.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    track.ended_at = datetime.utcnow()
    track.status = "completed"

    point_count = await db.execute(
        select(GpsTrackPoint).where(GpsTrackPoint.track_id == track_id)
    )
    points = point_count.scalars().all()

    if len(points) > 1:
        total_dist = 0
        for i in range(1, len(points)):
            from math import radians, sin, cos, sqrt, atan2
            p1, p2 = points[i - 1], points[i]
            R = 6371
            dlat = radians(p2.lat - p1.lat)
            dlon = radians(p2.lng - p1.lng)
            a = sin(dlat / 2) ** 2 + cos(radians(p1.lat)) * cos(radians(p2.lat)) * sin(dlon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            total_dist += R * c
        track.distance_km = round(total_dist, 2)

    await db.commit()
    return {"id": track.id, "status": "completed", "distance_km": track.distance_km}


@router.post("/tracks/{track_id}/points")
async def add_points(
    track_id: str,
    batch: PointsBatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for pt in batch.points:
        db.add(GpsTrackPoint(
            track_id=track_id,
            recorded_at=pt.timestamp,
            lat=pt.lat,
            lng=pt.lng,
            speed_kmh=pt.speed,
            accuracy_m=pt.accuracy,
            altitude_m=pt.altitude_m,
            battery_level=pt.battery_level,
        ))
    await db.commit()
    return {"count": len(batch.points)}


@router.get("/tracks/{track_id}")
async def get_track(track_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GpsTrack).where(GpsTrack.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    points_result = await db.execute(
        select(GpsTrackPoint).where(GpsTrackPoint.track_id == track_id).order_by(GpsTrackPoint.recorded_at)
    )
    points = points_result.scalars().all()

    return {
        "id": track.id,
        "event_id": track.event_id,
        "user_id": track.user_id,
        "started_at": track.started_at.isoformat(),
        "ended_at": track.ended_at.isoformat() if track.ended_at else None,
        "status": track.status,
        "distance_km": track.distance_km,
        "points": [
            {
                "lat": p.lat,
                "lng": p.lng,
                "timestamp": p.recorded_at.isoformat(),
                "speed": p.speed_kmh,
                "altitude": p.altitude_m,
            }
            for p in points
        ],
    }


@router.get("/tracks/event/{event_id}")
async def event_tracks(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GpsTrack).where(GpsTrack.event_id == event_id)
    )
    tracks = result.scalars().all()
    return [
        {
            "id": t.id,
            "user_id": t.user_id,
            "started_at": t.started_at.isoformat(),
            "ended_at": t.ended_at.isoformat() if t.ended_at else None,
            "status": t.status,
            "distance_km": t.distance_km,
        }
        for t in tracks
    ]
