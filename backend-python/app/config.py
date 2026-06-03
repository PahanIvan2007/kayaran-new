import os
from dataclasses import dataclass


@dataclass
class Config:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgres://postgres:123@localhost:5432/kayran?sslmode=disable",
    )
    port: int = int(os.getenv("PYTHON_PORT", "8001"))
    jwt_key: str = os.getenv("JWT_KEY", "kayran-secret-key-2026")
    weather_api_key: str = os.getenv("WEATHER_API_KEY", "")


config = Config()
