from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Event, EventParticipant, User, EventType, EventStatus
from app.auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


class EventCreate(BaseModel):
    event_type: str
    title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    point_id: str | None = None
    route_id: str | None = None
    max_participants: int | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str | None = None


@router.get("")
async def list_events(
    event_type: str | None = None,
    status: str | None = None,
    point_id: str | None = None,
    start_from: datetime | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Event)
    if event_type:
        query = query.where(Event.event_type == event_type)
    if status:
        query = query.where(Event.status == status)
    if point_id:
        query = query.where(Event.point_id == point_id)
    if start_from:
        query = query.where(Event.start_time >= start_from)
    query = query.order_by(Event.start_time.desc())

    result = await db.execute(query)
    events = result.scalars().all()
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "title": e.title,
            "start_time": e.start_time.isoformat(),
            "end_time": e.end_time.isoformat() if e.end_time else None,
            "point_id": e.point_id,
            "status": e.status,
            "created_by": e.created_by,
        }
        for e in events
    ]


@router.post("")
async def create_event(
    req: EventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = Event(
        event_type=req.event_type,
        title=req.title,
        description=req.description,
        start_time=req.start_time,
        end_time=req.end_time,
        point_id=req.point_id,
        route_id=req.route_id,
        max_participants=req.max_participants,
        created_by=user.id,
        status=EventStatus.planned.value,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return {"id": event.id, "title": event.title, "event_type": event.event_type, "status": event.status}


@router.get("/{event_id}")
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {
        "id": event.id,
        "event_type": event.event_type,
        "title": event.title,
        "description": event.description,
        "start_time": event.start_time.isoformat(),
        "end_time": event.end_time.isoformat() if event.end_time else None,
        "point_id": event.point_id,
        "route_id": event.route_id,
        "status": event.status,
        "max_participants": event.max_participants,
        "created_by": event.created_by,
        "created_at": event.created_at.isoformat(),
    }


@router.put("/{event_id}")
async def update_event(
    event_id: str,
    req: EventUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for field, value in req.model_dump(exclude_none=True).items():
        setattr(event, field, value)
    await db.commit()
    return {"id": event.id, "status": event.status}


@router.patch("/{event_id}/status")
async def set_event_status(
    event_id: str,
    status: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = status
    await db.commit()
    return {"id": event.id, "status": event.status}


@router.post("/{event_id}/participants")
async def add_participant(
    event_id: str,
    user_id: str,
    role: str = "participant",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ep = EventParticipant(event_id=event_id, user_id=user_id, role=role)
    db.add(ep)
    await db.commit()
    return {"event_id": event_id, "user_id": user_id, "role": role}


@router.get("/{event_id}/participants")
async def list_participants(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    )
    participants = result.scalars().all()
    return [
        {"user_id": p.user_id, "role": p.role, "checked_in": p.checked_in, "joined_at": p.joined_at.isoformat()}
        for p in participants
    ]
