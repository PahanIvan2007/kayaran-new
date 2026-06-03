from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import pool
from app.routes import seed, analytics, weather


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.open()
    yield
    await pool.close()


app = FastAPI(
    title="Kayran Python Microservice", version="1.0.0", lifespan=lifespan
)
app.include_router(seed.router, prefix="/api/v1/seed", tags=["seed"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(weather.router, prefix="/api/v1/weather", tags=["weather"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "python"}
