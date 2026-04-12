"""Ask endpoint — orchestrates Claude → verification → response assembly."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.schemas import AskRequest, AnswerResponse, AnswerSection, Reference
from app.services.claude_service import generate_answer
from app.services.citation_verifier import verify_candidates
from app.services.language_service import detect_language
from app.db.database import get_db
from app.models.models import AnswerSession
from app.core.config import settings

router = APIRouter()


@router.post("/ask", response_model=AnswerResponse)
async def ask(req: AskRequest, db: Session = Depends(get_db)):
    if not req.query or len(req.query.strip()) < 2:
        raise HTTPException(400, "Query is too short")

    # 1) Detect language if user didn't pin it
    detected = detect_language(req.query, fallback=req.settings.answer_language)
    if not req.settings.answer_language:
        req.settings.answer_language = detected

    # 2) Call Claude
    try:
        data = await generate_answer(
            query=req.query,
            settings_obj=req.settings,
            mode=req.mode,
            compare_items=req.compare_items,
        )
    except Exception as e:
        raise HTTPException(502, f"Claude generation failed: {e}")

    candidates = data.get("references", []) or []
    candidate_count = len(candidates)

    # 3) Verify candidates
    verified_refs = await verify_candidates(candidates, max_keep=req.settings.max_references)
    verified_count = len(verified_refs)

    # 4) Remap inline citation numbers — keep only refs that survived verification.
    # Build mapping from old n -> new n
    old_to_new = {}
    surviving_old_ns = set()
    for new_idx, ref in enumerate(verified_refs, start=1):
        # find this ref in original candidates by URL match (best effort)
        for c in candidates:
            if c.get("url") and (c["url"] in ref.url or ref.url in c["url"]):
                old_n = c.get("n")
                if old_n is not None:
                    old_to_new[old_n] = new_idx
                    surviving_old_ns.add(old_n)
                break
        ref.n = new_idx

    sections = []
    for s in data.get("sections", []):
        content = s.get("content", "")
        # remap [n] tokens
        import re
        def repl(m):
            try:
                old = int(m.group(1))
                if old in old_to_new:
                    return f"[{old_to_new[old]}]"
                return ""  # drop unverified citation marker
            except Exception:
                return m.group(0)
        content = re.sub(r"\[(\d+)\]", repl, content)
        new_citations = [old_to_new[c] for c in s.get("citations", []) if c in old_to_new]
        sections.append(AnswerSection(
            heading=s.get("heading", ""),
            content=content,
            citations=new_citations,
        ))

    insufficient = verified_count < settings.MIN_REFERENCES or bool(data.get("insufficient_evidence"))

    warnings = list(data.get("warnings", []))
    if insufficient:
        warnings.append(
            f"Only {verified_count} verified high-confidence references could be confirmed for this query. "
            f"Interpret with caution."
        )

    response = AnswerResponse(
        query=req.query,
        language=data.get("language", req.settings.answer_language),
        mode=req.mode,
        sections=sections,
        references=verified_refs,
        related_questions=data.get("related_questions", [])[:6],
        warnings=warnings,
        insufficient_evidence=insufficient,
        candidate_count=candidate_count,
        verified_count=verified_count,
    )

    # 5) Optional: persist session for future sync
    try:
        rec = AnswerSession(
            client_id=req.client_id,
            query=req.query,
            language=response.language,
            mode=req.mode,
            answer_json=[s.model_dump() for s in response.sections],
            references_json=[r.model_dump() for r in response.references],
            specialty=req.settings.specialty,
        )
        db.add(rec)
        db.commit()
    except Exception:
        db.rollback()  # never block on persistence failure

    return response
