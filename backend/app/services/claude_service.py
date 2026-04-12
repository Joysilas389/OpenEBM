"""Claude API service — uses structured tool output (no JSON parsing of free text).

This eliminates the 'Expecting , delimiter' class of errors entirely. Claude must
fill in a typed schema; the SDK handles encoding. We get a Python dict back.
"""
import re
from typing import Dict, List, Optional
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.schemas.schemas import AnswerSettings


_client: Optional[AsyncAnthropic] = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY env var is required")
        _client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


# ---------- Structured output schema ----------

ANSWER_TOOL = {
    "name": "submit_evidence_answer",
    "description": "Submit a structured evidence-based medical answer with verified citations.",
    "input_schema": {
        "type": "object",
        "required": ["language", "sections", "references"],
        "properties": {
            "language": {"type": "string", "description": "ISO language code"},
            "sections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["heading", "content"],
                    "properties": {
                        "heading": {"type": "string"},
                        "content": {"type": "string", "description": "Prose with inline [n] citations"},
                        "citations": {"type": "array", "items": {"type": "integer"}},
                    },
                },
            },
            "references": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["n", "title", "url"],
                    "properties": {
                        "n": {"type": "integer"},
                        "title": {"type": "string"},
                        "url": {"type": "string"},
                        "source_type": {"type": "string"},
                        "year": {"type": ["integer", "null"]},
                        "why_cited": {"type": "string"},
                        "excerpt": {"type": "string"},
                    },
                },
            },
            "related_questions": {"type": "array", "items": {"type": "string"}},
            "warnings": {"type": "array", "items": {"type": "string"}},
            "insufficient_evidence": {"type": "boolean"},
        },
    },
}


def _freshness(f): return {
    "1y": "last 12 months", "3y": "last 3 years", "5y": "last 5 years",
    "include_landmark": "last 5 years plus landmark evidence",
}.get(f, "last 5 years")


def _source_pref(p): return {
    "guidelines_first": "society guidelines first",
    "balanced": "balanced mix of guidelines, reviews, primary studies",
    "reviews_first": "systematic reviews first",
    "latest_first": "most recent evidence first",
}.get(p, "balanced mix")


def _build_system(s: AnswerSettings, mode: str) -> str:
    structure = {
        "standard": "Sections: Direct answer; Key evidence-based management; Important cautions; Special populations (if relevant).",
        "teaching": "Sections: The problem; Simplest picture; Mechanism step by step; Clinical bridge; Investigations and why; Treatment logic; Edge cases.",
        "compare": "Sections: Side-by-side comparison; Key differences; Diagnosis differences; Management differences; Pitfalls.",
    }[mode]

    teach = "Explain mechanisms clearly." if (s.teaching_mode or mode == "teaching") else ""
    spec = f"Specialty: {s.specialty}." if s.specialty else ""

    return f"""You are openEBM, an evidence-based medicine assistant.

Use web_search to find trustworthy sources: major journals (NEJM, JAMA, Lancet, BMJ),
Cochrane, society guidelines (IDSA, AHA, ESC, NICE, ACOG, AAP), public health agencies
(WHO, CDC, NIH, FDA). Prefer {_freshness(s.freshness)}. {_source_pref(s.source_preference)}.

NEVER fabricate URLs or citations. Only cite sources you actually retrieved.

Mode: {mode}. {structure}
Target length: ~{s.answer_length} words. Language: {s.answer_language}.
{teach} {spec}

Use inline [n] tokens in content strings matching the references array.
Aim for 8-12 references. Include urgent-care warnings when clinically appropriate.

When done, call the submit_evidence_answer tool with the structured result."""


async def generate_answer(
    query: str,
    settings_obj: AnswerSettings,
    mode: str = "standard",
    compare_items: Optional[List[str]] = None,
) -> Dict:
    client = get_client()
    system = _build_system(settings_obj, mode)
    if mode == "compare" and compare_items:
        user = f"Compare clinically: {' vs '.join(compare_items)}\n\nContext: {query}"
    else:
        user = query

    msg = await client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=6000,
        system=system,
        messages=[{"role": "user", "content": user}],
        tools=[
            {"type": "web_search_20250305", "name": "web_search", "max_uses": 3},
            ANSWER_TOOL,
        ],
        tool_choice={"type": "auto"},
    )

    # Find the tool_use block with our structured answer
    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "submit_evidence_answer":
            return block.input  # already a Python dict, no JSON parsing needed

    # Fallback: if Claude replied with text only (shouldn't happen with tool_choice=auto but safety net)
    text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
    raise ValueError(f"Claude did not call submit_evidence_answer tool. Text reply: {text[:300]}")


# ---------- Simulation (tool_use for reliability) ----------

SIMULATION_TOOL = {
    "name": "submit_simulation_spec",
    "description": "Submit a structured interactive simulation specification.",
    "input_schema": {
        "type": "object",
        "required": ["title", "short_explanation", "category", "steps"],
        "properties": {
            "title": {"type": "string"},
            "short_explanation": {"type": "string"},
            "category": {"type": "string"},
            "steps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["id", "title", "description"],
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "duration_ms": {"type": "integer"},
                        "visual": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string"},
                                "elements": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "kind": {"type": "string"},
                                            "x": {"type": "number"},
                                            "y": {"type": "number"},
                                            "w": {"type": "number"},
                                            "h": {"type": "number"},
                                            "r": {"type": "number"},
                                            "x2": {"type": "number"},
                                            "y2": {"type": "number"},
                                            "color": {"type": "string"},
                                            "text": {"type": "string"},
                                        },
                                    },
                                },
                            },
                        },
                        "labels": {"type": "array", "items": {"type": "object"}},
                    },
                },
            },
            "clinical_application": {"type": "string"},
            "educational_notes": {"type": "array", "items": {"type": "string"}},
            "reduced_motion_safe": {"type": "boolean"},
        },
    },
}


async def generate_simulation(topic: str, language: str = "en") -> Dict:
    client = get_client()
    system = f"""You are openEBM's simulation spec generator.
Generate a step-by-step interactive simulation for a medical topic.
Coordinates: 0-500 x 0-300 viewBox. Aim for 5-8 steps.
Element kinds: circle, rect, arrow, line, label.
Colors: primary, accent, success, warning, danger, muted, text.
User language: {language}
When done, call submit_simulation_spec with the structured result."""

    msg = await client.messages.create(
        model=settings.CLAUDE_FAST_MODEL,
        max_tokens=4000,
        system=system,
        messages=[{"role": "user", "content": f"Generate a simulation for: {topic}"}],
        tools=[SIMULATION_TOOL],
        tool_choice={"type": "tool", "name": "submit_simulation_spec"},
    )

    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "submit_simulation_spec":
            return block.input

    raise ValueError("Claude did not return simulation tool_use output")
