from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    phone: str
    role: str
    status: str
    created_at: Optional[datetime] = None


class AnalyticsSummary(BaseModel):
    total_users: int
    total_boats: int
    total_rentals: int
    total_events: int
    total_routes: int
    active_rentals: int
    available_boats: int
