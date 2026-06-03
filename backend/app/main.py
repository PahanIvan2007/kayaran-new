from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.events import router as events_router
from app.routes.boats import router as boats_router
from app.routes.rentals import router as rentals_router
from app.routes.gps import router as gps_router
from app.routes.sport import team_router, tournament_router, match_router
from app.routes.inclusive import router as inclusive_router
from app.routes.routes import router as routes_router

app = FastAPI(
    title="Kayran Platform API",
    description="Платформа водных активностей, проката, спорта и инклюзивных программ",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
angular_dir = Path(__file__).resolve().parent.parent.parent / "frontend-angular" / "dist" / "frontend-angular" / "browser"
if angular_dir.exists():
    app.mount("/frontend", StaticFiles(directory=str(angular_dir)), name="frontend")
    app.mount("/static", StaticFiles(directory=str(angular_dir)), name="frontend_legacy")
elif frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="frontend")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(events_router)
app.include_router(boats_router)
app.include_router(rentals_router)
app.include_router(gps_router)
app.include_router(team_router)
app.include_router(tournament_router)
app.include_router(match_router)
app.include_router(inclusive_router)
app.include_router(routes_router)


@app.get("/")
async def root():
    from fastapi.responses import HTMLResponse
    if angular_dir and angular_dir.exists():
        html_path = angular_dir / "index.html"
        if html_path.exists():
            return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    if frontend_dir.exists():
        html_path = frontend_dir / "index.html"
        if html_path.exists():
            return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    return {"name": "Kayran Platform API", "version": "0.1.0", "docs": "/docs"}
