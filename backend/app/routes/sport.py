from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.database import get_db
from app.models import Team, TeamMember, Tournament, TournamentTeam, Match, MatchResult, User, Event
from app.auth import get_current_user

router = APIRouter(tags=["sport"])

# ---- TEAMS ----
team_router = APIRouter(prefix="/teams")


class TeamCreate(BaseModel):
    title: str
    description: str | None = None


class TeamAddMember(BaseModel):
    user_id: str
    role: str = "member"


@team_router.get("")
async def list_teams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.status == "active"))
    teams = result.scalars().all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "captain_user_id": t.captain_user_id,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
        }
        for t in teams
    ]


@team_router.post("")
async def create_team(
    req: TeamCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team = Team(title=req.title, description=req.description, captain_user_id=user.id)
    db.add(team)
    await db.flush()

    db.add(TeamMember(team_id=team.id, user_id=user.id, role="captain"))
    await db.commit()
    await db.refresh(team)
    return {"id": team.id, "title": team.title}


@team_router.get("/{team_id}")
async def get_team(team_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    members_result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id)
    )
    members = members_result.scalars().all()

    return {
        "id": team.id,
        "title": team.title,
        "description": team.description,
        "captain_user_id": team.captain_user_id,
        "status": team.status,
        "members": [
            {"user_id": m.user_id, "role": m.role, "joined_at": m.joined_at.isoformat()}
            for m in members
        ],
    }


@team_router.post("/{team_id}/members")
async def add_member(
    team_id: str,
    req: TeamAddMember,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == req.user_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member")

    db.add(TeamMember(team_id=team_id, user_id=req.user_id, role=req.role))
    await db.commit()
    return {"team_id": team_id, "user_id": req.user_id, "role": req.role}


@team_router.delete("/{team_id}/members/{user_id}")
async def remove_member(
    team_id: str,
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id, TeamMember.user_id == user_id
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    await db.delete(member)
    await db.commit()
    return {"status": "removed"}


# ---- TOURNAMENTS ----
tournament_router = APIRouter(prefix="/tournaments")


class TournamentCreate(BaseModel):
    event_id: str
    title: str
    format: str = "single_elimination"
    min_teams: int | None = None
    max_teams: int | None = None


@tournament_router.get("")
async def list_tournaments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tournament))
    tournaments = result.scalars().all()
    return [
        {
            "id": t.id,
            "event_id": t.event_id,
            "title": t.title,
            "format": t.format,
            "status": t.status,
        }
        for t in tournaments
    ]


@tournament_router.post("")
async def create_tournament(
    req: TournamentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tournament = Tournament(
        event_id=req.event_id,
        title=req.title,
        format=req.format,
        min_teams=req.min_teams,
        max_teams=req.max_teams,
    )
    db.add(tournament)
    await db.commit()
    await db.refresh(tournament)
    return {"id": tournament.id, "title": tournament.title, "format": tournament.format}


@tournament_router.get("/{tournament_id}")
async def get_tournament(tournament_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    tournament = result.scalar_one_or_none()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    teams_result = await db.execute(
        select(TournamentTeam).where(TournamentTeam.tournament_id == tournament_id)
    )
    teams = teams_result.scalars().all()

    matches_result = await db.execute(
        select(Match).where(Match.tournament_id == tournament_id).order_by(Match.round, Match.match_number)
    )
    matches = matches_result.scalars().all()

    return {
        "id": tournament.id,
        "event_id": tournament.event_id,
        "title": tournament.title,
        "format": tournament.format,
        "status": tournament.status,
        "teams": [{"team_id": t.team_id, "seed": t.seed} for t in teams],
        "matches": [
            {
                "id": m.id,
                "round": m.round,
                "match_number": m.match_number,
                "team_a_id": m.team_a_id,
                "team_b_id": m.team_b_id,
                "score_a": m.score_a,
                "score_b": m.score_b,
                "status": m.status,
            }
            for m in matches
        ],
    }


# ---- MATCHES ----
match_router = APIRouter(prefix="/matches")


class MatchCreate(BaseModel):
    event_id: str
    tournament_id: str
    round: int = 1
    match_number: int = 1
    team_a_id: str
    team_b_id: str


class ScoreUpdate(BaseModel):
    score_a: int
    score_b: int


@match_router.get("")
async def list_matches(
    tournament_id: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Match)
    if tournament_id:
        query = query.where(Match.tournament_id == tournament_id)
    if status:
        query = query.where(Match.status == status)
    query = query.order_by(Match.round, Match.match_number)

    result = await db.execute(query)
    matches = result.scalars().all()
    return [
        {
            "id": m.id,
            "tournament_id": m.tournament_id,
            "round": m.round,
            "team_a_id": m.team_a_id,
            "team_b_id": m.team_b_id,
            "score_a": m.score_a,
            "score_b": m.score_b,
            "status": m.status,
        }
        for m in matches
    ]


@match_router.post("")
async def create_match(
    req: MatchCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    match = Match(
        event_id=req.event_id,
        tournament_id=req.tournament_id,
        round=req.round,
        match_number=req.match_number,
        team_a_id=req.team_a_id,
        team_b_id=req.team_b_id,
    )
    db.add(match)
    await db.commit()
    await db.refresh(match)
    return {"id": match.id, "status": match.status}


@match_router.get("/{match_id}")
async def get_match(match_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return {
        "id": match.id,
        "tournament_id": match.tournament_id,
        "round": match.round,
        "team_a_id": match.team_a_id,
        "team_b_id": match.team_b_id,
        "score_a": match.score_a,
        "score_b": match.score_b,
        "judge_user_id": match.judge_user_id,
        "status": match.status,
        "start_time": match.start_time.isoformat() if match.start_time else None,
        "end_time": match.end_time.isoformat() if match.end_time else None,
    }


@match_router.put("/{match_id}/score")
async def update_score(
    match_id: str,
    req: ScoreUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.score_a = req.score_a
    match.score_b = req.score_b

    if match.status == "scheduled":
        match.status = "active"

    db.add(MatchResult(
        match_id=match_id,
        recorded_by=user.id,
        team_a_score=req.score_a,
        team_b_score=req.score_b,
    ))
    await db.commit()
    return {"id": match.id, "score_a": req.score_a, "score_b": req.score_b, "status": match.status}


@match_router.put("/{match_id}/status")
async def set_match_status(
    match_id: str,
    status: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.status = status
    if status == "finished" and match.score_a != match.score_b:
        match.winner_team_id = match.team_a_id if match.score_a > match.score_b else match.team_b_id

    await db.commit()
    return {"id": match.id, "status": status}
