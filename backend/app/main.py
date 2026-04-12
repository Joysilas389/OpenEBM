"""openEBM FastAPI app entrypoint."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import ask, simulations, health
from app.db.database import Base, engine

app = FastAPI(title="openEBM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create tables on startup (idempotent). Use Alembic for production migrations.
@app.on_event("startup")
def _startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[startup] DB init warning: {e}")


app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(ask.router, prefix="/api", tags=["ask"])
app.include_router(simulations.router, prefix="/api", tags=["simulations"])


@app.get("/")
def root():
    return {"app": "openEBM", "docs": "/docs"}
