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


# ---------- Simulation (upgraded: worked-example prompt + richer schema) ----------

SIMULATION_TOOL = {
    "name": "submit_simulation_spec",
    "description": "Submit an interactive medical simulation with first-principles mechanism and bedside application.",
    "input_schema": {
        "type": "object",
        "required": ["title", "short_explanation", "category", "steps",
                     "mechanism_first_principles", "clinical_application"],
        "properties": {
            "title": {"type": "string"},
            "short_explanation": {"type": "string",
                "description": "One-sentence plain-language summary."},
            "category": {"type": "string",
                "description": "physiology | pharmacology | pathology | biochemistry | anatomy | immunology"},
            "steps": {
                "type": "array",
                "minItems": 5,
                "maxItems": 10,
                "items": {
                    "type": "object",
                    "required": ["id", "title", "description"],
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "description": {"type": "string",
                            "description": "2-4 sentences. What happens AND why, mechanistically."},
                        "duration_ms": {"type": "integer"},
                        "visual": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string"},
                                "elements": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["kind"],
                                        "properties": {
                                            "kind": {"type": "string",
                                                "description": "circle | rect | arrow | line | label"},
                                            "x": {"type": "number"},
                                            "y": {"type": "number"},
                                            "w": {"type": "number"},
                                            "h": {"type": "number"},
                                            "r": {"type": "number"},
                                            "x2": {"type": "number"},
                                            "y2": {"type": "number"},
                                            "color": {"type": "string",
                                                "description": "primary|accent|success|warning|danger|muted|text"},
                                            "text": {"type": "string"},
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "mechanism_first_principles": {
                "type": "string",
                "description": "3-6 sentences explaining the core mechanism from first principles — "
                               "the physics/chemistry/biology 'why', not just 'what'.",
            },
            "clinical_application": {
                "type": "string",
                "description": "3-6 sentences: how this appears at the bedside — presentations, "
                               "diagnostics, and how understanding the mechanism changes management.",
            },
            "educational_notes": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 concise high-yield pearls.",
            },
            "reduced_motion_safe": {"type": "boolean"},
        },
    },
}


SIMULATION_SYSTEM = """You are openEBM's medical simulation architect. For ANY medical topic the user
names, produce an EBMRetrieval-grade interactive step-by-step simulation.

HARD REQUIREMENTS
- 5 to 10 steps. Each step is a discrete mechanistic moment, not filler.
- Every step.description must explain WHAT happens AND WHY (first-principles physics/chem/bio).
- Every step must include a visual.elements array laying out a meaningful SVG scene in a
  500×300 viewBox (coordinates 0-500 × 0-300). Use circle/rect/arrow/line/label.
- Use named colors only: primary, accent, success, warning, danger, muted, text.
- Labels must be short (<= 4 words) and placed so they don't overlap shapes.
- Arrows carry meaning (flow, causation, feedback) — not decoration.
- mechanism_first_principles: derive from fundamentals (gradients, charge, enzyme kinetics,
  pressure/volume, receptor biology) — not a textbook restatement.
- clinical_application: concrete bedside picture — what the clinician sees, tests, does,
  and how the mechanism you drew determines each decision.
- educational_notes: 3-5 high-yield pearls a strong resident would want on a card.

=========================================================
WORKED EXAMPLE  —  Topic: "Neuronal action potential"
=========================================================
Step 1 "Resting state" — Na+/K+ ATPase maintains -70 mV. Visual: rect membrane at y=150,
  circles labeled "Na+" outside, "K+" inside, label "-70 mV". WHY: 3 Na+ out / 2 K+ in
  per ATP creates both a chemical and electrical gradient; K+ leak channels dominate at rest.
Step 2 "Threshold reached" — Stimulus depolarizes to -55 mV. Visual: arrow pointing into
  membrane, rect color shifts to warning. WHY: voltage-gated Na+ channels have a steep
  activation curve centered near -55 mV — below this, probability of opening is negligible.
Step 3 "Rapid depolarization" — Na+ rushes in; membrane swings toward +30 mV. Visual:
  multiple arrows (kind=arrow) crossing membrane inward, color=danger. WHY: Na+
  electrochemical gradient is enormous and the channel is highly selective; current
  follows Ohm's law on a low-resistance path.
Step 4 "Peak and inactivation" — Na+ channels inactivate; K+ channels open. Visual: Na+
  arrows fade (muted), K+ arrows appear outward (accent). WHY: Na+ channel inactivation
  gate closes on a ~1 ms timescale, setting an absolute refractory period.
Step 5 "Repolarization" — K+ efflux drives membrane back toward EK. Visual: outward K+
  arrows, rect color returns to primary. WHY: driving force on K+ is maximal at +30 mV,
  producing rapid repolarization.
Step 6 "Hyperpolarization and reset" — Brief undershoot, then Na+/K+ pump restores
  gradients. Visual: small downward label "-80 mV", pump rect. WHY: K+ channels close
  slowly, transiently bringing Vm toward EK (~-90 mV) before returning to rest.

mechanism_first_principles: "Every action potential is the membrane obeying the Nernst
equation for whichever ion currently has the highest permeability. The Na+/K+ ATPase
stores energy in two ionic gradients; voltage-gated channels release that energy on a
millisecond timescale. Because Na+ channels both activate and inactivate in a
voltage-dependent way, the cell gets a self-terminating, all-or-none pulse instead of a
runaway short-circuit."

clinical_application: "Local anesthetics (lidocaine) bind the inactivated state of the
Na+ channel — why they work preferentially on firing nociceptors and why dose depends on
fiber activity. Hyperkalemia depolarizes resting Vm, leaving more Na+ channels
inactivated → wide QRS, peaked T waves, cardiac arrest. Hypocalcemia lowers the threshold
for activation → tetany. Sodium-channel-blocker toxicity (TCAs, class I antiarrhythmics)
widens QRS; sodium bicarbonate is the antidote because raising extracellular Na+ restores
the gradient."
=========================================================

Now generate the same caliber of spec for whatever topic the user names.
Respond only by calling the submit_simulation_spec tool.
"""


async def generate_simulation(topic: str, language: str = "en") -> Dict:
    client = get_client()
    user_msg = (
        f"Topic: {topic}\n"
        f"Output language for all prose fields: {language}\n"
        "Build the full interactive simulation spec now."
    )

    msg = await client.messages.create(
        model=settings.CLAUDE_MODEL,  # use the strong model — quality matters here
        max_tokens=6000,
        system=SIMULATION_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
        tools=[SIMULATION_TOOL],
        tool_choice={"type": "tool", "name": "submit_simulation_spec"},
    )

    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "submit_simulation_spec":
            return block.input

    raise ValueError("Claude did not return simulation tool_use output")
