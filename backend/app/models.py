import uuid
import hashlib
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, Text, DateTime, Date, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


def short_id(prefix: str) -> str:
    return prefix + hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:6]


# --- ENUMS ---
class UserRole(str, enum.Enum):
    participant = "participant"
    instructor = "instructor"
    judge = "judge"
    volunteer = "volunteer"
    franchise_admin = "franchise_admin"
    system_admin = "system_admin"


class UserStatus(str, enum.Enum):
    active = "active"
    blocked = "blocked"
    deleted = "deleted"
    pending = "pending"


class EventType(str, enum.Enum):
    rental = "rental"
    training = "training"
    route = "route"
    match = "match"
    tournament = "tournament"
    inclusive_program = "inclusive_program"
    festival = "festival"
    corporate = "corporate"


class EventStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
    emergency = "emergency"


class PointType(str, enum.Enum):
    base = "base"
    franchise = "franchise"
    temporary_event = "temporary_event"
    storage = "storage"


class BoatStatus(str, enum.Enum):
    available = "available"
    rented = "rented"
    repair = "repair"
    inactive = "inactive"
    lost = "lost"
    reserved = "reserved"


class RentalStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
    overdue = "overdue"
    damaged = "damaged"


class MatchStatus(str, enum.Enum):
    scheduled = "scheduled"
    active = "active"
    finished = "finished"
    cancelled = "cancelled"
    disputed = "disputed"


class TournamentStatus(str, enum.Enum):
    registration = "registration"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


# --- MODELS ---
class User(Base):
    __tablename__ = "users"

    id = Column(String(7), primary_key=True, default=lambda: short_id("U"))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(255), unique=True)
    role = Column(String(20), default="participant")
    birth_date = Column(Date)
    avatar_url = Column(Text)
    medical_flags = Column(JSON, default=dict)
    accessibility_level = Column(String(20), default="none")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String(20), default="active")


class Event(Base):
    __tablename__ = "events"

    id = Column(String(7), primary_key=True, default=lambda: short_id("E"))
    event_type = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    point_id = Column(String(7), ForeignKey("points.id"))
    route_id = Column(String(7))
    created_by = Column(String(7), ForeignKey("users.id"), nullable=False)
    max_participants = Column(Integer)
    status = Column(String(20), default="planned")
    visibility = Column(String(20), default="public")
    safety_briefing_done = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])


class EventParticipant(Base):
    __tablename__ = "event_participants"

    event_id = Column(String(7), ForeignKey("events.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(7), ForeignKey("users.id"), primary_key=True)
    role = Column(String(20), default="participant")
    joined_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    checked_in = Column(Boolean, default=False)
    check_in_time = Column(DateTime(timezone=True))


class Point(Base):
    __tablename__ = "points"

    id = Column(String(7), primary_key=True, default=lambda: short_id("P"))
    title = Column(String(255), nullable=False)
    type = Column(String(20), default="base")
    franchise_id = Column(String(7), ForeignKey("franchises.id"))
    address = Column(Text)
    lat = Column(Float)
    lng = Column(Float)
    timezone = Column(String(50), default="UTC")
    contact_phone = Column(String(20))
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Franchise(Base):
    __tablename__ = "franchises"

    id = Column(String(7), primary_key=True, default=lambda: short_id("F"))
    title = Column(String(255), nullable=False)
    owner_user_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Route(Base):
    __tablename__ = "routes"

    id = Column(String(7), primary_key=True, default=lambda: short_id("R"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    difficulty = Column(String(20), default="easy")
    distance_km = Column(Float)
    estimated_duration = Column(Integer)
    route_type = Column(String(20), default="water")
    start_point_id = Column(String(7), ForeignKey("points.id"))
    end_point_id = Column(String(7), ForeignKey("points.id"))
    status = Column(String(20), default="active")
    created_by = Column(String(7), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class RoutePoint(Base):
    __tablename__ = "route_points"

    id = Column(String(7), primary_key=True, default=lambda: short_id("P"))
    route_id = Column(String(7), ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    title = Column(String(255))
    description = Column(Text)
    checkpoint_type = Column(String(20), default="waypoint")


class GpsTrack(Base):
    __tablename__ = "gps_tracks"

    id = Column(String(7), primary_key=True, default=lambda: short_id("G"))
    event_id = Column(String(7), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    device_id = Column(String(100))
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True))
    status = Column(String(20), default="active")
    distance_km = Column(Float)
    avg_speed_kmh = Column(Float)
    max_speed_kmh = Column(Float)


class GpsTrackPoint(Base):
    __tablename__ = "gps_track_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    track_id = Column(String(7), ForeignKey("gps_tracks.id", ondelete="CASCADE"), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    altitude_m = Column(Float)
    speed_kmh = Column(Float)
    accuracy_m = Column(Float)
    battery_level = Column(Float)


class Boat(Base):
    __tablename__ = "boats"

    id = Column(String(7), primary_key=True, default=lambda: short_id("B"))
    point_id = Column(String(7), ForeignKey("points.id"), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=False)
    title = Column(String(255))
    color = Column(String(50))
    boat_type = Column(String(50), default="kayak")
    capacity = Column(Integer, default=1)
    status = Column(String(20), default="available")
    condition_level = Column(String(20), default="good")
    purchase_date = Column(Date)
    last_service_date = Column(Date)
    next_service_date = Column(Date)
    photo_url = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Rental(Base):
    __tablename__ = "rentals"

    id = Column(String(7), primary_key=True, default=lambda: short_id("A"))
    event_id = Column(String(7), ForeignKey("events.id"), nullable=False)
    user_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    boat_id = Column(String(7), ForeignKey("boats.id"))
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    actual_end_time = Column(DateTime(timezone=True))
    payment_id = Column(String(7))
    deposit_amount = Column(Float)
    notes_before = Column(Text)
    notes_after = Column(Text)
    damage_report = Column(JSON, default=dict)
    status = Column(String(20), default="active")


class Team(Base):
    __tablename__ = "teams"

    id = Column(String(7), primary_key=True, default=lambda: short_id("T"))
    title = Column(String(255), nullable=False)
    captain_user_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    description = Column(Text)
    logo_url = Column(Text)
    point_id = Column(String(7), ForeignKey("points.id"))
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id = Column(String(7), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(7), ForeignKey("users.id"), primary_key=True)
    role = Column(String(20), default="member")
    joined_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class TournamentTeam(Base):
    __tablename__ = "tournament_teams"

    tournament_id = Column(String(7), ForeignKey("tournaments.id", ondelete="CASCADE"), primary_key=True)
    team_id = Column(String(7), ForeignKey("teams.id"), primary_key=True)
    seed = Column(Integer)
    group_name = Column(String(50))
    final_rank = Column(Integer)


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(String(7), primary_key=True, default=lambda: short_id("M"))
    event_id = Column(String(7), ForeignKey("events.id"), nullable=False)
    title = Column(String(255), nullable=False)
    format = Column(String(30), default="single_elimination")
    min_teams = Column(Integer)
    max_teams = Column(Integer)
    status = Column(String(20), default="registration")


class Match(Base):
    __tablename__ = "matches"

    id = Column(String(7), primary_key=True, default=lambda: short_id("S"))
    event_id = Column(String(7), ForeignKey("events.id"), nullable=False)
    tournament_id = Column(String(7), ForeignKey("tournaments.id"))
    round = Column(Integer)
    match_number = Column(Integer)
    team_a_id = Column(String(7), ForeignKey("teams.id"))
    team_b_id = Column(String(7), ForeignKey("teams.id"))
    judge_user_id = Column(String(7), ForeignKey("users.id"))
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    score_a = Column(Integer, default=0)
    score_b = Column(Integer, default=0)
    winner_team_id = Column(String(7), ForeignKey("teams.id"))
    status = Column(String(20), default="scheduled")


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(String(7), primary_key=True, default=lambda: short_id("R"))
    match_id = Column(String(7), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    recorded_by = Column(String(7), ForeignKey("users.id"), nullable=False)
    team_a_score = Column(Integer, default=0)
    team_b_score = Column(Integer, default=0)
    details = Column(JSON, default=dict)
    confirmed = Column(Boolean, default=False)
    confirmed_by = Column(String(7), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(7), primary_key=True, default=lambda: short_id("Y"))
    event_id = Column(String(7), ForeignKey("events.id"))
    user_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="RUB")
    payment_method = Column(String(30))
    payment_provider = Column(String(50))
    payment_status = Column(String(20), default="pending")
    external_transaction_id = Column(String(255))
    description = Column(Text)
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class AccessibilityProfile(Base):
    __tablename__ = "accessibility_profiles"

    id = Column(String(7), primary_key=True, default=lambda: short_id("L"))
    user_id = Column(String(7), ForeignKey("users.id"), unique=True, nullable=False)
    disability_type = Column(String(50))
    mobility_level = Column(String(20))
    vision_impairment = Column(Boolean, default=False)
    hearing_impairment = Column(Boolean, default=False)
    cognitive_support = Column(Boolean, default=False)
    requires_escort = Column(Boolean, default=False)
    comfort_pace = Column(String(20), default="moderate")
    max_duration_min = Column(Integer)
    notes = Column(Text)
    verified_by = Column(String(7), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class MedicalRestriction(Base):
    __tablename__ = "medical_restrictions"

    id = Column(String(7), primary_key=True, default=lambda: short_id("M"))
    user_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    restriction = Column(String(255), nullable=False)
    severity = Column(String(20), default="moderate")
    is_active = Column(Boolean, default=True)
    valid_until = Column(Date)
    created_by = Column(String(7), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class EscortAssignment(Base):
    __tablename__ = "escort_assignments"

    id = Column(String(7), primary_key=True, default=lambda: short_id("K"))
    event_id = Column(String(7), ForeignKey("events.id"), nullable=False)
    participant_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    escort_id = Column(String(7), ForeignKey("users.id"), nullable=False)
    assignment_type = Column(String(20), default="personal")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
