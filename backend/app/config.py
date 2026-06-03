from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:123@localhost:5432/kayran"
    secret_key: str = "kayran-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    model_config = {"env_file": ".env"}


settings = Settings()
