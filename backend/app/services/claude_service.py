"""Claude API service — the only AI engine in openEBM.

Uses Anthropic's web_search tool to gather candidate references. Backend verifies
each one before display. Tuned for Tier 1 rate limits (30k input tokens/minute).
"""
import json
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


def _freshness_clause(freshness: str) -> str:
    return {
        "1y": "Prioritize last 12 months.",
        "3y": "Prioritize last 3 years.",
        "5y": "Prioritize last 5 years; landmark older evidence allowed if foundational.",
        "include_landmark": "Prioritize last 5 years; freely include landmark evidence.",
    }.get(freshness, "Prioritize last 5 years.")


def _source_pref_clause(pref: str) -> str:
    return {
        "guidelines_first": "Lead with society guidelines and public health statements.",
        "balanced": "Balance guidelines, systematic reviews, meta-analyses, and primary studies.",
        "reviews_first": "Lead with systematic reviews and meta-analyses.",
        "latest_first": "Lead with most recent high-quality evidence.",
    }.get(pref, "")


def _build_system_prompt(s: AnswerSettings, mode: str) -> str:
    structure = {
        "standard": "Sections: 'Direct answer', 'Key evidence-based management', 'Important cautions', 'Special populations' (if relevant).",
        "teaching": "Sections: 'The problem', 'The simplest picture', 'Mechanism step by step', 'Clinical bridge', 'Investigations and why', 'Treatment logic', 'Contrast and edge cases'.",
        "compare": "Sections: 'Side-by-side comparison', 'Key differences', 'Diagnosis differences', 'Management differences', 'Pitfalls and edge cases'.",
    }[mode]

    teaching_line = "- Teaching mode: explain mechanisms clearly." if (s.teaching_mode or mode == "teaching") else ""
    specialty_line = f"- Specialty: {s.specialty}" if s.specialty else ""

    return f"""You are openEBM, an evidence-based medicine assistant.

SOURCE STRATEGY:
- Use web_search for trustworthy medical sources: major journals (NEJM, JAMA, Lancet, BMJ),
  Cochrane, society guidelines (IDSA, AHA, ESC, NICE, ACOG, AAP), public health agencies
  (WHO, CDC, NIH, FDA). Quality > quantity.
- {_freshness_clause(s.freshness)}
- {_source_pref_clause(s.source_preference)}
- NEVER fabricate URLs or citations. Only cite sources you actually retrieved.

ANSWER STRUCTURE:
- Mode: {mode}. {structure}
- Target length: ~{s.answer_length} words.
- Citation density: {s.citation_density}. Use inline [n] tokens matching references array.
- Language: {s.answer_language} (prose in this language; keep source titles original).
{teaching_line}
{specialty_line}

OUTPUT: Return ONLY valid JSON, no markdown fences:
{{
  "language": "<iso>",
  "sections": [{{"heading": "...", "content": "...[1]...", "citations": [1,2]}}],
  "references": [
    {{"n": 1, "title": "...", "url": "...", "source_type": "journal|guideline|society|public_health|review",
      "year": <int or null>, "why_cited": "...", "excerpt": "..."}}
  ],
  "related_questions": ["...", "..."],
  "warnings": ["..."],
  "insufficient_evidence": false
}}

RULES:
- Aim for 8-12 references. Backend verifies and keeps the best.
- Every URL must be real, retrieved via web_search.
- Include urgent-care warnings when clinically appropriate.
- Note pregnancy/pediatric/dosing cautions when relevant.
- Decision support only, not substitute for clinician judgment."""


def _build_user_prompt(query: str, mode: str, compare_items: Optional[List[str]]) -> str:
    if mode == "compare" and compare_items:
        items = " vs ".join(compare_items)
        return f"Compare clinically: {items}\n\nContext: {query}"
    return query


async def generate_answer(
    query: str,
    settings_obj: AnswerSettings,
    mode: str = "standard",
    compare_items: Optional[List[str]] = None,
) -> Dict:
    client = get_client()
    system = _build_system_prompt(settings_obj, mode)
    user = _build_user_prompt(query, mode, compare_items)

    msg = await client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=4000,
        system=system,
        messages=[{"role": "user", "content": user}],
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": 3,
        }],
    )

    text_parts: List[str] = []
    for block in msg.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(block.text)
    raw = "\n".join(text_parts).strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise ValueError(f"Claude did not return JSON. Raw start: {raw[:200]}")
        data = json.loads(m.group(0))

    return data


SIMULATION_SYSTEM = """You are openEBM's simulation spec generator.

Given a medical topic, output a JSON specification for an interactive simulation.
The frontend renders this with a deterministic SVG engine — never include executable code.

Output ONLY valid JSON:
{
  "title": "...",
  "short_explanation": "1-2 sentences",
  "category": "physiology|pharmacology|pathology|biochemistry|anatomy",
  "steps": [
    {
      "id": "step1",
      "title": "Phase name",
      "description": "What happens",
      "duration_ms": 1500,
      "visual": {
        "type": "diagram|curve|cycle|flow",
        "elements": [
          {"kind": "circle|rect|arrow|label", "x": 50, "y": 50, "w": 100, "h": 40, "color": "primary", "text": "..."}
        ]
      },
      "labels": [{"text": "...", "x": 10, "y": 10}]
    }
  ],
  "clinical_application": "...",
  "educational_notes": ["...", "..."],
  "reduced_motion_safe": true
}

Coordinates: 0–500 x 0–300 viewBox. Aim for 5–8 steps."""


async def generate_simulation(topic: str, language: str = "en") -> Dict:
    client = get_client()
    msg = await client.messages.create(
        model=settings.CLAUDE_FAST_MODEL,
        max_tokens=4000,
        system=SIMULATION_SYSTEM + f"\n\nUser language: {language}",
        messages=[{"role": "user", "content": f"Generate a simulation for: {topic}"}],
    )
    text_parts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
    raw = "\n".join(text_parts).strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        raise
