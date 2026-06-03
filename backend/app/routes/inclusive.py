from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import AccessibilityProfile, MedicalRestriction, EscortAssignment, User
from app.auth import get_current_user

router = APIRouter(prefix="/profiles", tags=["inclusive"])

# ---- PROFILES ----
class ProfileUpdate(BaseModel):
    disability_type: str | None = None
    mobility_level: str | None = None
    vision_impairment: bool | None = None
    hearing_impairment: bool | None = None
    cognitive_support: bool | None = None
    requires_escort: bool | None = None
    comfort_pace: str | None = None
    max_duration_min: int | None = None
    notes: str | None = None


@router.get("/accessibility/{user_id}")
async def get_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AccessibilityProfile).where(AccessibilityProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"user_id": user_id, "has_profile": False}

    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "disability_type": profile.disability_type,
        "mobility_level": profile.mobility_level,
        "vision_impairment": profile.vision_impairment,
        "hearing_impairment": profile.hearing_impairment,
        "cognitive_support": profile.cognitive_support,
        "requires_escort": profile.requires_escort,
        "comfort_pace": profile.comfort_pace,
        "max_duration_min": profile.max_duration_min,
        "notes": profile.notes,
        "has_profile": True,
    }


@router.put("/accessibility/{user_id}")
async def update_profile(
    user_id: str,
    req: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AccessibilityProfile).where(AccessibilityProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        profile = AccessibilityProfile(
            user_id=user_id,
            verified_by=current_user.id if current_user.role == "system_admin" else None,
        )
        db.add(profile)

    for field, value in req.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return {"id": profile.id, "user_id": user_id, "status": "updated"}


# ---- MEDICAL ----
class MedicalCreate(BaseModel):
    restriction: str
    severity: str = "moderate"
    valid_until: str | None = None


@router.get("/medical/{user_id}")
async def list_medical(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MedicalRestriction).where(
            MedicalRestriction.user_id == user_id, MedicalRestriction.is_active == True
        )
    )
    restrictions = result.scalars().all()
    return [
        {
            "id": r.id,
            "restriction": r.restriction,
            "severity": r.severity,
            "valid_until": str(r.valid_until) if r.valid_until else None,
        }
        for r in restrictions
    ]


@router.post("/medical/{user_id}")
async def add_medical(
    user_id: str,
    req: MedicalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mr = MedicalRestriction(
        user_id=user_id,
        restriction=req.restriction,
        severity=req.severity,
        created_by=current_user.id,
    )
    db.add(mr)
    await db.commit()
    await db.refresh(mr)
    return {"id": mr.id, "restriction": mr.restriction, "severity": mr.severity}


# ---- ESCORT ----
class EscortCreate(BaseModel):
    event_id: str
    participant_id: str
    escort_id: str
    assignment_type: str = "personal"


@router.post("/escort")
async def assign_escort(
    req: EscortCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    assignment = EscortAssignment(
        event_id=req.event_id,
        participant_id=req.participant_id,
        escort_id=req.escort_id,
        assignment_type=req.assignment_type,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return {"id": assignment.id, "event_id": req.event_id, "participant_id": req.participant_id}
