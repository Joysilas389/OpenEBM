"""Pydantic request/response schemas."""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any


class AnswerSettings(BaseModel):
    answer_style: Literal["concise", "standard", "deep"] = "standard"
    teaching_mode: bool = False
    citation_density: Literal["standard", "high", "very_high"] = "standard"
    answer_length: int = Field(default=1500, ge=100, le=16000)
    max_references: int = Field(default=12, ge=5, le=20)
    source_preference: Literal["guidelines_first", "balanced", "reviews_first", "latest_first"] = "balanced"
    freshness: Literal["1y", "3y", "5y", "include_landmark"] = "5y"
    include_basic_sciences: bool = False
    specialty: Optional[str] = None
    answer_language: str = "en"


class AskRequest(BaseModel):
    query: str
    mode: Literal["standard", "teaching", "compare"] = "standard"
    settings: AnswerSettings = AnswerSettings()
    client_id: Optional[str] = None
    compare_items: Optional[List[str]] = None  # for compare mode


class Reference(BaseModel):
    n: int
    title: str
    url: str
    canonical_url: Optional[str] = None
    domain: Optional[str] = None
    source_type: Optional[str] = None
    publication_year: Optional[int] = None
    update_year: Optional[int] = None
    badges: List[str] = []
    why_cited: Optional[str] = None
    excerpt: Optional[str] = None
    verified_status: str = "verified"
    authors: Optional[str] = None
    journal: Optional[str] = None


class AnswerSection(BaseModel):
    heading: str
    content: str
    citations: List[int] = []  # reference numbers


class AnswerResponse(BaseModel):
    query: str
    language: str
    mode: str
    sections: List[AnswerSection]
    references: List[Reference]
    related_questions: List[str] = []
    warnings: List[str] = []
    insufficient_evidence: bool = False
    candidate_count: int = 0
    verified_count: int = 0


class SimulationRequest(BaseModel):
    topic: str
    language: str = "en"


class SimulationStep(BaseModel):
    id: str
    title: str
    description: str
    duration_ms: int = 1500
    visual: Dict[str, Any] = {}  # spec for renderer
    labels: List[Dict[str, Any]] = []


class SimulationSpec(BaseModel):
    title: str
    short_explanation: str
    category: str
    steps: List[SimulationStep]
    clinical_application: str
    educational_notes: List[str] = []
    reduced_motion_safe: bool = True
