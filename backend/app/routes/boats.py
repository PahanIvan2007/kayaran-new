from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Boat, User
from app.auth import get_current_user

router = APIRouter(prefix="/boats", tags=["boats"])


class BoatCreate(BaseModel):
    point_id: str
    serial_number: str
    title: str | None = None
    color: str | None = None
    boat_type: str = "kayak"
    capacity: int = 1


class BoatUpdate(BaseModel):
    title: str | None = None
    color: str | None = None
    status: str | None = None
    condition_level: str | None = None


@router.get("")
async def list_boats(
    point_id: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Boat)
    if point_id:
        query = query.where(Boat.point_id == point_id)
    if status:
        query = query.where(Boat.status == status)

    result = await db.execute(query)
    boats = result.scalars().all()
    return [
        {
            "id": b.id,
            "point_id": b.point_id,
            "serial_number": b.serial_number,
            "title": b.title,
            "color": b.color,
            "boat_type": b.boat_type,
            "capacity": b.capacity,
            "status": b.status,
            "condition_level": b.condition_level,
        }
        for b in boats
    ]


@router.get("/available")
async def available_boats(point_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Boat).where(Boat.point_id == point_id, Boat.status == "available")
    )
    boats = result.scalars().all()
    return [
        {"id": b.id, "title": b.title, "boat_type": b.boat_type, "capacity": b.capacity, "color": b.color}
        for b in boats
    ]


@router.post("")
async def create_boat(
    req: BoatCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    boat = Boat(
        point_id=req.point_id,
        serial_number=req.serial_number,
        title=req.title or req.serial_number,
        color=req.color,
        boat_type=req.boat_type,
        capacity=req.capacity,
    )
    db.add(boat)
    await db.commit()
    await db.refresh(boat)
    return {"id": boat.id, "serial_number": boat.serial_number, "status": boat.status}


@router.get("/{boat_id}")
async def get_boat(boat_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Boat).where(Boat.id == boat_id))
    boat = result.scalar_one_or_none()
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    return {
        "id": boat.id,
        "point_id": boat.point_id,
        "serial_number": boat.serial_number,
        "title": boat.title,
        "color": boat.color,
        "boat_type": boat.boat_type,
        "capacity": boat.capacity,
        "status": boat.status,
        "condition_level": boat.condition_level,
        "last_service_date": str(boat.last_service_date) if boat.last_service_date else None,
    }


@router.put("/{boat_id}")
async def update_boat(
    boat_id: str,
    req: BoatUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Boat).where(Boat.id == boat_id))
    boat = result.scalar_one_or_none()
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")

    for field, value in req.model_dump(exclude_none=True).items():
        setattr(boat, field, value)
    await db.commit()
    return {"id": boat.id, "status": boat.status}


@router.put("/{boat_id}/status")
async def set_boat_status(
    boat_id: str,
    status: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Boat).where(Boat.id == boat_id))
    boat = result.scalar_one_or_none()
    if not boat:
        raise HTTPException(status_code=404, detail="Boat not found")
    boat.status = status
    await db.commit()
    return {"id": boat.id, "status": boat.status}
