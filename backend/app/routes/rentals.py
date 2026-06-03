from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Rental, Boat, Event, User
from app.auth import get_current_user

router = APIRouter(prefix="/rentals", tags=["rentals"])


class RentalCreate(BaseModel):
    event_id: str
    boat_id: str
    start_time: datetime
    deposit_amount: float | None = None
    notes_before: str | None = None


@router.post("")
async def create_rental(
    req: RentalCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await db.execute(select(Event).where(Event.id == req.event_id))
    if not event.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    boat = await db.execute(select(Boat).where(Boat.id == req.boat_id))
    boat_obj = boat.scalar_one_or_none()
    if not boat_obj:
        raise HTTPException(status_code=404, detail="Boat not found")
    if boat_obj.status != "available":
        raise HTTPException(status_code=400, detail="Boat not available")

    rental = Rental(
        event_id=req.event_id,
        user_id=user.id,
        boat_id=req.boat_id,
        start_time=req.start_time,
        deposit_amount=req.deposit_amount,
        notes_before=req.notes_before,
    )
    boat_obj.status = "rented"

    db.add(rental)
    await db.commit()
    await db.refresh(rental)
    return {"id": rental.id, "event_id": rental.event_id, "boat_id": rental.boat_id, "status": rental.status}


@router.get("/active")
async def active_rentals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rental).where(Rental.status == "active"))
    rentals = result.scalars().all()
    return [
        {
            "id": r.id,
            "event_id": r.event_id,
            "user_id": r.user_id,
            "boat_id": r.boat_id,
            "start_time": r.start_time.isoformat(),
            "status": r.status,
        }
        for r in rentals
    ]


@router.get("/user/{user_id}")
async def user_rentals(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Rental).where(Rental.user_id == user_id).order_by(Rental.start_time.desc())
    )
    rentals = result.scalars().all()
    return [
        {
            "id": r.id,
            "event_id": r.event_id,
            "boat_id": r.boat_id,
            "start_time": r.start_time.isoformat(),
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "status": r.status,
        }
        for r in rentals
    ]


@router.get("/{rental_id}")
async def get_rental(rental_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    return {
        "id": rental.id,
        "event_id": rental.event_id,
        "user_id": rental.user_id,
        "boat_id": rental.boat_id,
        "start_time": rental.start_time.isoformat(),
        "end_time": rental.end_time.isoformat() if rental.end_time else None,
        "actual_end_time": rental.actual_end_time.isoformat() if rental.actual_end_time else None,
        "deposit_amount": rental.deposit_amount,
        "damage_report": rental.damage_report,
        "status": rental.status,
    }


@router.put("/{rental_id}/return")
async def return_rental(
    rental_id: str,
    notes_after: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")

    rental.actual_end_time = datetime.utcnow()
    rental.notes_after = notes_after
    rental.status = "completed"

    boat = await db.execute(select(Boat).where(Boat.id == rental.boat_id))
    boat_obj = boat.scalar_one_or_none()
    if boat_obj:
        boat_obj.status = "available"

    await db.commit()
    return {"id": rental.id, "status": "completed"}


@router.put("/{rental_id}/damage")
async def report_damage(
    rental_id: str,
    damage_report: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rental).where(Rental.id == rental_id))
    rental = result.scalar_one_or_none()
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")

    rental.damage_report = damage_report
    rental.status = "damaged"
    await db.commit()
    return {"id": rental.id, "status": "damaged"}
