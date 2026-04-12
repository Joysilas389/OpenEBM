"""Claude API service — the only AI engine in openEBM.

Uses Anthropic's web_search tool to allow Claude to browse the web and gather candidate
references. The backend then verifies each one independently before display.

Claude is NOT limited to a fixed source pool. It is instructed to consider broadly across
the medical evidence universe and propose many more candidates than the final display count.
"""
import json
import re
from typing import Dict, List, Optional, AsyncIterator
from anthropic import Anthropic, AsyncAnthropic
from app.core.config import settings
from app.schemas.schemas import AnswerSettings, AnswerResponse, AnswerSection, SimulationSpec


_client: Optional[AsyncAnthropic] = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY env var is required")
        _client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


# ---------- Prompt construction ----------

def _freshness_clause(freshness: str) -> str:
    return {
        "1y": "Strongly prioritize sources from the last 12 months.",
        "3y": "Strongly prioritize sources from the last 3 years.",
        "5y": "Prioritize sources from the last 5 years. Older landmark evidence is allowed only if foundational.",
        "include_landmark": "Prioritize last 5 years but freely include landmark/classic evidence when relevant.",
    }.get(freshness, "Prioritize sources from the last 5 years.")


def _source_pref_clause(pref: str) -> str:
    return {
        "guidelines_first": "Lead with major society guidelines and public health agency statements.",
        "balanced": "Balance guidelines, systematic reviews, meta-analyses and high-quality primary studies.",
        "reviews_first": "Lead with systematic reviews and meta-analyses.",
        "latest_first": "Lead with the most recent high-quality evidence first.",
    }.get(pref, "")


def _build_system_prompt(s: AnswerSettings, mode: str) -> str:
    structure = {
        "standard": (
            "Return JSON with sections in this order: "
            "1) 'Direct answer', 2) 'Key evidence-based management', 3) 'Important cautions', "
            "4) 'Special populations' (only if relevant)."
        ),
        "teaching": (
            "Return JSON with these sections in order: "
            "'The problem', 'The simplest picture', 'Mechanism step by step', "
            "'Clinical bridge', 'Investigations and why', 'Treatment logic', 'Contrast and edge cases'."
        ),
        "compare": (
            "Return JSON with sections: 'Side-by-side comparison', 'Key differences', "
            "'Diagnosis differences', 'Management differences', 'Pitfalls and edge cases'."
        ),
    }[mode]

    length_hint = (
        f"Target answer length: roughly {s.answer_length} words across all sections combined. "
        "Be substantive but never pad."
    )

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
- Citation density: {s.citation_density}. Use inline [n] citations matching references array.
- Language: {s.answer_language} (prose in this language; keep source titles original).
{"- Teaching mode: explain mechanisms clearly." if s.teaching_mode or mode == "teaching" else ""}
{"- Specialty: " + s.specialty if s.specialty else ""}

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
        return f"Compare the following clinically: {items}\n\nUser context: {query}"
    return query


# ---------- Answer generation ----------

async def generate_answer(
    query: str,
    settings_obj: AnswerSettings,
    mode: str = "standard",
    compare_items: Optional[List[str]] = None,
) -> Dict:
    """Call Claude with web_search enabled and parse the JSON answer envelope."""
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
            "max_uses": 3,  # Claude can do multiple searches; each returns many results
        }],
    )

    # Collect text blocks
    text_parts: List[str] = []
    for block in msg.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(block.text)
    raw = "\n".join(text_parts).strip()

    # Strip accidental fences
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()

    # Best-effort: find the first { ... } block
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise ValueError(f"Claude did not return JSON. Raw start: {raw[:200]}")
        data = json.loads(m.group(0))

    return data


# ---------- Simulation generation ----------

SIMULATION_SYSTEM = """You are openEBM's simulation spec generator.

Given a medical/physiology topic, output a JSON specification for an interactive simulation.
The frontend renders this with a SAFE deterministic engine — never include executable code.

Output ONLY valid JSON in this exact shape:
{
  "title": "...",
  "short_explanation": "1-2 sentence summary",
  "category": "physiology|pharmacology|pathology|biochemistry|anatomy",
  "steps": [
    {
      "id": "step1",
      "title": "Phase name",
      "description": "What happens in this phase",
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

Use coordinates in a 0–500 by 0–300 viewBox. Aim for 5–8 steps."""


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
