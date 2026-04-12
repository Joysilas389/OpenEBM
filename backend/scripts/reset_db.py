"""Reset and initialize the openEBM database.

USAGE:
  python -m scripts.reset_db          # drop ALL tables in the database, then create openEBM schema
  python -m scripts.reset_db --soft   # only drop openebm_* tables and recreate them

This is the script to run ONCE on the Render Postgres after wiring DATABASE_URL,
to wipe the previous app's data and initialize a fresh openEBM schema.
"""
import sys
from sqlalchemy import inspect, text
from app.db.database import engine, Base
from app.models import models  # noqa: F401  -- ensure models registered
from app.models.models import TrustedDomain, SimulationTemplate
from app.services.trusted_domains import TRUSTED_DOMAINS
from app.db.database import SessionLocal


def hard_reset():
    """Drop EVERY table in the public schema. Use with care."""
    print("[reset] HARD reset: dropping all tables in current database...")
    with engine.begin() as conn:
        insp = inspect(conn)
        tables = insp.get_table_names()
        for t in tables:
            print(f"  drop {t}")
            conn.execute(text(f'DROP TABLE IF EXISTS "{t}" CASCADE'))


def soft_reset():
    """Drop only openebm_* tables."""
    print("[reset] SOFT reset: dropping openebm_* tables only...")
    with engine.begin() as conn:
        insp = inspect(conn)
        for t in insp.get_table_names():
            if t.startswith("openebm_"):
                print(f"  drop {t}")
                conn.execute(text(f'DROP TABLE IF EXISTS "{t}" CASCADE'))


def create_schema():
    print("[init] creating openEBM schema...")
    Base.metadata.create_all(bind=engine)
    print("[init] done")


def seed_trusted_domains():
    db = SessionLocal()
    try:
        existing = {d.domain for d in db.query(TrustedDomain).all()}
        added = 0
        for domain, (stype, score) in TRUSTED_DOMAINS.items():
            if domain in existing:
                continue
            db.add(TrustedDomain(domain=domain, source_type=stype, trust_score=score))
            added += 1
        db.commit()
        print(f"[seed] trusted domains added: {added}")
    finally:
        db.close()


PREBUILT_SIMS = [
    {
        "slug": "cardiac-cycle",
        "title": "Cardiac Cycle",
        "category": "physiology",
        "description": "Phases of one heartbeat: filling, contraction, ejection, relaxation.",
    },
    {
        "slug": "nephron-function",
        "title": "Nephron Function",
        "category": "physiology",
        "description": "Filtration, reabsorption, secretion along the nephron.",
    },
    {
        "slug": "raas",
        "title": "Renin–Angiotensin–Aldosterone System",
        "category": "physiology",
        "description": "How the body regulates blood pressure and volume via RAAS.",
    },
    {
        "slug": "coagulation-cascade",
        "title": "Coagulation Cascade",
        "category": "physiology",
        "description": "Intrinsic, extrinsic, and common pathways of clot formation.",
    },
    {
        "slug": "action-potential",
        "title": "Neuronal Action Potential",
        "category": "physiology",
        "description": "Resting, depolarization, repolarization, hyperpolarization.",
    },
]


def seed_simulations():
    db = SessionLocal()
    try:
        existing = {s.slug for s in db.query(SimulationTemplate).all()}
        for sim in PREBUILT_SIMS:
            if sim["slug"] in existing:
                continue
            db.add(SimulationTemplate(
                slug=sim["slug"],
                title=sim["title"],
                category=sim["category"],
                description=sim["description"],
                spec_json={"placeholder": True, "note": "Generated on demand via /api/simulations/generate"},
            ))
        db.commit()
        print(f"[seed] prebuilt simulation stubs ensured")
    finally:
        db.close()


if __name__ == "__main__":
    if "--soft" in sys.argv:
        soft_reset()
    else:
        hard_reset()
    create_schema()
    seed_trusted_domains()
    seed_simulations()
    print("[done] openEBM database is ready.")
