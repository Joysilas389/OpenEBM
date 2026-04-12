"""Simulation endpoints — prebuilt + AI-generated specs."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.schemas import SimulationRequest, SimulationSpec
from app.services.claude_service import generate_simulation
from app.models.models import SimulationTemplate
from app.db.database import get_db

router = APIRouter()


@router.get("/simulations/prebuilt")
def list_prebuilt(db: Session = Depends(get_db)):
    rows = db.query(SimulationTemplate).all()
    return [
        {"slug": r.slug, "title": r.title, "category": r.category, "description": r.description}
        for r in rows
    ]


@router.get("/simulations/prebuilt/{slug}")
def get_prebuilt(slug: str, db: Session = Depends(get_db)):
    row = db.query(SimulationTemplate).filter_by(slug=slug).first()
    if not row:
        raise HTTPException(404, "Simulation not found")
    return row.spec_json


@router.post("/simulations/generate")
async def generate(req: SimulationRequest):
    try:
        spec = await generate_simulation(req.topic, req.language)
        return spec
    except Exception as e:
        raise HTTPException(502, f"Simulation generation failed: {e}")
