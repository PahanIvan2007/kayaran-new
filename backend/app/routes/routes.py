from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

router = APIRouter(tags=["routes", "franchises"])


@router.get("/routes")
async def list_routes(
    difficulty: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models import Route

    query = select(Route)
    if difficulty:
        query = query.where(Route.difficulty == difficulty)
    result = await db.execute(query)
    routes = result.scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "difficulty": r.difficulty,
            "distance_km": r.distance_km,
            "estimated_duration": r.estimated_duration,
            "route_type": r.route_type,
            "status": r.status,
        }
        for r in routes
    ]


@router.get("/routes/{route_id}")
async def get_route(route_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models import Route, RoutePoint

    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Route not found")

    points_result = await db.execute(
        select(RoutePoint).where(RoutePoint.route_id == route_id).order_by(RoutePoint.order_index)
    )
    points = points_result.scalars().all()

    return {
        "id": route.id,
        "title": route.title,
        "description": route.description,
        "difficulty": route.difficulty,
        "distance_km": route.distance_km,
        "estimated_duration": route.estimated_duration,
        "route_type": route.route_type,
        "status": route.status,
        "points": [
            {
                "id": p.id,
                "order_index": p.order_index,
                "lat": p.lat,
                "lng": p.lng,
                "title": p.title,
                "checkpoint_type": p.checkpoint_type,
            }
            for p in points
        ],
    }


@router.get("/franchises")
async def list_franchises(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models import Franchise

    result = await db.execute(select(Franchise))
    franchises = result.scalars().all()
    return [
        {
            "id": f.id,
            "title": f.title,
            "owner_user_id": f.owner_user_id,
            "status": f.status,
        }
        for f in franchises
    ]


@router.get("/franchises/{franchise_id}")
async def get_franchise(franchise_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models import Franchise, Point

    result = await db.execute(select(Franchise).where(Franchise.id == franchise_id))
    franchise = result.scalar_one_or_none()
    if not franchise:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Franchise not found")

    points_result = await db.execute(
        select(Point).where(Point.franchise_id == franchise_id)
    )
    points = points_result.scalars().all()

    return {
        "id": franchise.id,
        "title": franchise.title,
        "owner_user_id": franchise.owner_user_id,
        "description": franchise.description,
        "status": franchise.status,
        "points": [
            {"id": p.id, "title": p.title, "lat": p.lat, "lng": p.lng, "type": p.type}
            for p in points
        ],
    }


@router.get("/payments")
async def list_payments(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models import Payment

    result = await db.execute(select(Payment).order_by(Payment.created_at.desc()))
    payments = result.scalars().all()
    return [
        {
            "id": p.id,
            "event_id": p.event_id,
            "user_id": p.user_id,
            "amount": p.amount,
            "currency": p.currency,
            "payment_status": p.payment_status,
            "created_at": p.created_at.isoformat(),
        }
        for p in payments
    ]


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
