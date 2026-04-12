"""openEBM database models. Fresh schema — old app data should be reset before init."""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float, Boolean, Index
from sqlalchemy.sql import func
from app.db.database import Base


class VerifiedCitation(Base):
    """Cache of verified reference metadata so we don't re-fetch the same URL repeatedly."""
    __tablename__ = "openebm_verified_citations"

    id = Column(Integer, primary_key=True)
    url = Column(String(2048), unique=True, index=True, nullable=False)
    canonical_url = Column(String(2048))
    title = Column(Text)
    domain = Column(String(512), index=True)
    source_type = Column(String(64))         # journal | guideline | society | public_health | review | reference
    publication_year = Column(Integer)
    update_year = Column(Integer)
    badges = Column(JSON, default=list)
    trust_score = Column(Float, default=0.0)
    verified_status = Column(String(32))     # verified | weak-match | rejected
    last_verified = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())


class AnswerSession(Base):
    """Optional server-side answer record (history is local-first; this supports future sync)."""
    __tablename__ = "openebm_answer_sessions"

    id = Column(Integer, primary_key=True)
    client_id = Column(String(128), index=True)  # anonymous device id
    query = Column(Text, nullable=False)
    language = Column(String(8))
    mode = Column(String(32))                # standard | teaching | compare
    answer_json = Column(JSON)
    references_json = Column(JSON)
    specialty = Column(String(64))
    created_at = Column(DateTime, server_default=func.now(), index=True)


class SimulationTemplate(Base):
    """Stored prebuilt simulation specs."""
    __tablename__ = "openebm_simulation_templates"

    id = Column(Integer, primary_key=True)
    slug = Column(String(128), unique=True, index=True)
    title = Column(String(256))
    category = Column(String(64))           # physiology | pharmacology | pathology | biochem
    spec_json = Column(JSON)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class TrustedDomain(Base):
    """Reference table of trusted medical domains and their default trust scoring."""
    __tablename__ = "openebm_trusted_domains"

    id = Column(Integer, primary_key=True)
    domain = Column(String(512), unique=True, index=True)
    source_type = Column(String(64))
    trust_score = Column(Float, default=0.5)
    notes = Column(Text)


Index("idx_sessions_client_created", AnswerSession.client_id, AnswerSession.created_at.desc())
