"""openEBM FastAPI app entrypoint."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect
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


def _auto_init_db_once():
    """One-shot DB initializer for free-tier Render (no shell access).

    On startup, checks whether any openebm_* table exists. If none exist, it runs
    the full reset+seed routine. After that it's a no-op forever because the
    tables will exist. Safe to ship to production: the check is idempotent.
    """
    try:
        insp = inspect(engine)
        existing = set(insp.get_table_names())
        has_openebm = any(t.startswith("openebm_") for t in existing)
        if has_openebm:
            print("[startup] openEBM schema already present, skipping auto-init.")
            return

        print("[startup] No openEBM schema found. Running one-time auto-init...")
        from scripts.reset_db import hard_reset, create_schema, seed_trusted_domains, seed_simulations
        hard_reset()
        create_schema()
        seed_trusted_domains()
        seed_simulations()
        print("[startup] Auto-init complete.")
    except Exception as e:
        print(f"[startup] Auto-init failed (non-fatal, app continues): {e}")


@app.on_event("startup")
def _startup():
    _auto_init_db_once()
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[startup] DB create_all warning: {e}")


app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(ask.router, prefix="/api", tags=["ask"])
app.include_router(simulations.router, prefix="/api", tags=["simulations"])


@app.get("/")
def root():
    return {"app": "openEBM", "docs": "/docs"}
