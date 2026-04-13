"""Claude API service — openEBM v2 simulation engine (VisualEngine artifacts)."""
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


# ---------- Ask / Compare / Teaching (UNCHANGED from v1 — byte-for-byte) ----------

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

    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "submit_evidence_answer":
            return block.input

    text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
    raise ValueError(f"Claude did not call submit_evidence_answer tool. Text reply: {text[:300]}")


# ============================================================
# SIMULATION v2 — VisualEngine HTML artifact generator
# ============================================================

SIMULATION_TOOL = {
    "name": "submit_visual_artifact",
    "description": "Submit a complete self-contained HTML artifact plus educational prose for a medical topic.",
    "input_schema": {
        "type": "object",
        "required": [
            "title", "archetype", "artifact_html",
            "mechanism_first_principles", "clinical_application",
            "pearls", "self_check"
        ],
        "properties": {
            "title": {"type": "string", "description": "Topic title, 2-6 words."},
            "archetype": {
                "type": "string",
                "description": "Visual archetype chosen: cyclic_process | flow_pathway | membrane_dynamics | anatomical_cross_section | feedback_loop | comparison_curve | phase_timeline | reaction_mechanism"
            },
            "artifact_html": {
                "type": "string",
                "description": "Complete self-contained HTML document. Starts with <!DOCTYPE html>. Includes inline CSS, inline JS, inline SVG. Must render in a sandboxed iframe with only allow-scripts. Reads ?theme=light|dark from URL for theming. Responsive down to 340px. Contains its own play/pause/reset/step controls. At least 3000 characters."
            },
            "mechanism_first_principles": {
                "type": "string",
                "description": "4-7 sentences. First-principles mechanism (physics/chemistry/biology WHY, not textbook WHAT). Plain prose, no markdown."
            },
            "clinical_application": {
                "type": "string",
                "description": "4-7 sentences. Concrete bedside picture: presentations, tests, decisions, and how the mechanism drives each. Plain prose."
            },
            "pearls": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-5 high-yield clinical pearls. One sentence each."
            },
            "self_check": {
                "type": "object",
                "required": [
                    "archetype_matches_topic",
                    "elements_all_purposeful",
                    "labels_do_not_overlap_shapes",
                    "has_play_pause_reset",
                    "dark_mode_supported",
                    "responsive_below_400px",
                    "no_external_dependencies",
                    "no_fake_precise_numbers",
                    "no_localStorage_used",
                    "viewbox_and_svg_valid"
                ],
                "properties": {
                    "archetype_matches_topic": {"type": "boolean"},
                    "elements_all_purposeful": {"type": "boolean"},
                    "labels_do_not_overlap_shapes": {"type": "boolean"},
                    "has_play_pause_reset": {"type": "boolean"},
                    "dark_mode_supported": {"type": "boolean"},
                    "responsive_below_400px": {"type": "boolean"},
                    "no_external_dependencies": {"type": "boolean"},
                    "no_fake_precise_numbers": {"type": "boolean"},
                    "no_localStorage_used": {"type": "boolean"},
                    "viewbox_and_svg_valid": {"type": "boolean"}
                }
            }
        }
    }
}


# Worked example is embedded as a STRING, not parsed as real HTML, so Python sees it as data.
_WORKED_EXAMPLE_CARDIAC = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{--bg:#ffffff;--fg:#0f172a;--muted:#64748b;--border:#e2e8f0;--card:#f8fafc;
    --primary:#2563eb;--accent:#0891b2;--danger:#dc2626;--success:#059669;--warning:#d97706;}
  [data-theme=dark]{--bg:#0b0f17;--fg:#e5e9f0;--muted:#94a3b8;--border:#1f2937;--card:#131927;
    --primary:#60a5fa;--accent:#22d3ee;--danger:#f87171;--success:#34d399;--warning:#fbbf24;}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--fg);
    font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;font-size:14px}
  .wrap{max-width:560px;margin:0 auto;padding:12px}
  .phase{font-weight:700;font-size:15px;color:var(--primary);margin:4px 0 2px;text-align:center}
  .desc{color:var(--muted);font-size:12.5px;text-align:center;min-height:2.6em;margin-bottom:8px}
  svg{width:100%;height:auto;max-height:320px;display:block}
  .controls{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px}
  button{background:var(--card);color:var(--fg);border:1px solid var(--border);
    border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;
    min-width:44px;min-height:40px}
  button.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
  button:active{transform:scale(.96)}
  .dots{display:flex;gap:6px;justify-content:center;margin-top:8px;flex-wrap:wrap}
  .dot{width:28px;height:28px;border-radius:50%;border:1px solid var(--border);
    background:var(--card);color:var(--fg);font-size:11px;font-weight:700;
    display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
  .dot.active{background:var(--primary);color:#fff;border-color:var(--primary)}
</style>
</head>
<body>
<div class="wrap">
  <div class="phase" id="phaseTitle">Phase 1 / 5</div>
  <div class="desc" id="phaseDesc">Loading...</div>
  <svg viewBox="0 0 340 260" xmlns="http://www.w3.org/2000/svg" aria-label="Cardiac cycle diagram">
    <defs>
      <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)"/>
      </marker>
    </defs>
    <!-- LA / RA ovale atria -->
    <ellipse id="la" cx="110" cy="70" rx="48" ry="28" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
    <ellipse id="ra" cx="230" cy="70" rx="48" ry="28" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
    <text x="110" y="74" text-anchor="middle" font-size="11" font-weight="700" fill="var(--fg)">LA</text>
    <text x="230" y="74" text-anchor="middle" font-size="11" font-weight="700" fill="var(--fg)">RA</text>
    <!-- AV valves -->
    <line id="mv" x1="78" y1="100" x2="142" y2="100" stroke="var(--success)" stroke-width="3"/>
    <line id="tv" x1="198" y1="100" x2="262" y2="100" stroke="var(--success)" stroke-width="3"/>
    <!-- Ventricles: rounded rects -->
    <rect id="lv" x="60" y="110" width="105" height="120" rx="18" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
    <rect id="rv" x="175" y="110" width="105" height="120" rx="18" fill="var(--card)" stroke="var(--border)" stroke-width="1.5"/>
    <text x="112" y="175" text-anchor="middle" font-size="12" font-weight="700" fill="var(--fg)">LV</text>
    <text x="227" y="175" text-anchor="middle" font-size="12" font-weight="700" fill="var(--fg)">RV</text>
    <!-- Pressure gauge right side -->
    <rect x="300" y="50" width="22" height="180" rx="6" fill="var(--card)" stroke="var(--border)"/>
    <rect id="pGauge" x="302" y="210" width="18" height="18" rx="4" fill="var(--primary)"/>
    <text x="311" y="44" text-anchor="middle" font-size="9" fill="var(--muted)">LV P</text>
  </svg>
  <div class="controls">
    <button id="back" aria-label="Back">&#9664;</button>
    <button id="play" class="primary" aria-label="Play">&#9654; Play</button>
    <button id="next" aria-label="Next">&#9654;</button>
    <button id="reset" aria-label="Reset">&#8634;</button>
  </div>
  <div class="dots" id="dots"></div>
</div>
<script>
  const theme=(new URLSearchParams(location.search)).get("theme")||"light";
  document.documentElement.setAttribute("data-theme",theme);
  const phases=[
    {name:"Ventricular filling",desc:"AV valves open. Blood flows passively from atria into ventricles down a pressure gradient.",
     lv:"var(--card)",rv:"var(--card)",mv:"var(--success)",tv:"var(--success)",p:25},
    {name:"Atrial systole",desc:"Atrial contraction adds the final ~20% of filling ('atrial kick').",
     lv:"var(--card)",rv:"var(--card)",mv:"var(--success)",tv:"var(--success)",p:35,la:"var(--primary)"},
    {name:"Isovolumetric contraction",desc:"All valves closed. LV pressure rises sharply without volume change. S1 heart sound.",
     lv:"var(--danger)",rv:"var(--danger)",mv:"var(--muted)",tv:"var(--muted)",p:80},
    {name:"Ventricular ejection",desc:"LV pressure exceeds aortic pressure; semilunar valves open; stroke volume is ejected.",
     lv:"var(--danger)",rv:"var(--danger)",mv:"var(--muted)",tv:"var(--muted)",p:180},
    {name:"Isovolumetric relaxation",desc:"LV pressure falls below aortic pressure; semilunar valves close (S2). All valves shut again.",
     lv:"var(--card)",rv:"var(--card)",mv:"var(--muted)",tv:"var(--muted)",p:60}
  ];
  let idx=0,playing=false,timer=null;
  const $=id=>document.getElementById(id);
  function render(){
    const p=phases[idx];
    $("phaseTitle").textContent="Phase "+(idx+1)+" / "+phases.length+" — "+p.name;
    $("phaseDesc").textContent=p.desc;
    $("lv").setAttribute("fill",p.lv);$("rv").setAttribute("fill",p.rv);
    $("mv").setAttribute("stroke",p.mv);$("tv").setAttribute("stroke",p.tv);
    $("la").setAttribute("fill",p.la||"var(--card)");
    const maxP=200,h=Math.max(10,(p.p/maxP)*175);
    $("pGauge").setAttribute("y",228-h);$("pGauge").setAttribute("height",h);
    [...document.querySelectorAll(".dot")].forEach((d,i)=>d.classList.toggle("active",i===idx));
  }
  function step(d){idx=(idx+d+phases.length)%phases.length;render()}
  function play(){playing=!playing;$("play").textContent=playing?"\u23F8 Pause":"\u25B6 Play";
    if(playing){timer=setInterval(()=>step(1),1600)}else{clearInterval(timer)}}
  $("play").onclick=play;$("next").onclick=()=>{if(playing)play();step(1)};
  $("back").onclick=()=>{if(playing)play();step(-1)};
  $("reset").onclick=()=>{if(playing)play();idx=0;render()};
  const dots=$("dots");phases.forEach((_,i)=>{
    const d=document.createElement("button");d.className="dot";d.textContent=i+1;
    d.onclick=()=>{if(playing)play();idx=i;render()};dots.appendChild(d)});
  render();
</script>
</body>
</html>"""


def _build_simulation_system() -> str:
    return """You are VisualEngine, openEBM's premium medical visualization generator.

You transform a short medical topic into a polished, self-contained interactive HTML artifact plus two short prose explanations.

═══════════════════════════════════════════════════════════
STEP 1 — CLASSIFY THE TOPIC INTO ONE ARCHETYPE
═══════════════════════════════════════════════════════════
Pick exactly one:

  cyclic_process           — recurring phases (cardiac cycle, Krebs, cell cycle, menstrual cycle)
  flow_pathway             — directed cascade (coagulation, complement, RAAS, glycolysis)
  membrane_dynamics        — ion channels / transporters (action potential, SERCA, Na/K ATPase)
  anatomical_cross_section — labeled structure (nephron, gastric gland, ear, eye)
  feedback_loop            — negative/positive feedback (HPA axis, baroreceptor, thyroid)
  comparison_curve         — x/y relationship (O2-Hb curve, Frank-Starling, dose-response)
  phase_timeline           — linear developmental or disease progression
  reaction_mechanism       — molecular events (enzyme catalysis, receptor binding)

Each archetype has a proven layout. Use it. Do not improvise layout.

═══════════════════════════════════════════════════════════
STEP 2 — BUILD A SINGLE SELF-CONTAINED HTML DOCUMENT
═══════════════════════════════════════════════════════════
The artifact will render in a sandboxed iframe (sandbox="allow-scripts") at 340-560px wide.
It reads the theme from ?theme=light or ?theme=dark in the URL.

HARD RULES — FAILURE MODES TO AVOID:
  ❌ NO external URLs (no fonts, no CDN, no images, no fetches)
  ❌ NO localStorage / sessionStorage / cookies
  ❌ NO parent window access
  ❌ NO overlapping text on top of shapes (place labels OUTSIDE shapes or in dedicated label zones)
  ❌ NO more than 8 primary SVG elements per phase (keep scenes readable)
  ❌ NO unlabeled arrows or mystery shapes
  ❌ NO random colors — use ONLY the CSS variable palette below
  ❌ NO fake precise numbers ("LV pressure = 127.3 mmHg") — use ranges or omit
  ❌ NO markdown, NO code fences, NO comments outside the HTML
  ❌ NO absolute positioning that breaks below 340px width

REQUIRED ELEMENTS:
  ✓ <!DOCTYPE html> at the top
  ✓ viewport meta tag for mobile
  ✓ CSS variables with both light and dark theme (see palette below)
  ✓ Reads ?theme=... from URL and sets data-theme on <html>
  ✓ Inline <svg viewBox="0 0 340 260"> (or similar) — responsive width:100%
  ✓ 4-7 phases/steps with a phase title and description above the SVG
  ✓ Play / Pause / Back / Next / Reset buttons (min 44×40px for touch)
  ✓ Numbered phase dots for direct navigation
  ✓ Minimum 3000 characters total
  ✓ Every shape has a clear educational purpose
  ✓ Every label is short (≤4 words) and placed in a clear zone

MANDATORY CSS PALETTE (do not use other colors):
  :root{--bg:#ffffff;--fg:#0f172a;--muted:#64748b;--border:#e2e8f0;--card:#f8fafc;
    --primary:#2563eb;--accent:#0891b2;--danger:#dc2626;--success:#059669;--warning:#d97706;}
  [data-theme=dark]{--bg:#0b0f17;--fg:#e5e9f0;--muted:#94a3b8;--border:#1f2937;--card:#131927;
    --primary:#60a5fa;--accent:#22d3ee;--danger:#f87171;--success:#34d399;--warning:#fbbf24;}

═══════════════════════════════════════════════════════════
WORKED EXAMPLE — Cardiac Cycle (archetype: cyclic_process)
═══════════════════════════════════════════════════════════
Below is a reference implementation. Match this quality level and structure. Adapt layout
to your topic's archetype but mirror the code style, control bar, phase switching logic,
CSS variables, and label placement discipline.

""" + _WORKED_EXAMPLE_CARDIAC + """

═══════════════════════════════════════════════════════════
STEP 3 — WRITE THE PROSE FIELDS
═══════════════════════════════════════════════════════════
mechanism_first_principles: 4-7 sentences. Derive from fundamentals — gradients, charge,
pressure, receptor biology, enzyme kinetics. Explain the WHY, not a textbook WHAT.

clinical_application: 4-7 sentences. Concrete bedside picture: what the clinician sees,
tests, decides, and how the mechanism drives each decision. Include specific drug classes
or lab tests where relevant.

pearls: 3-5 single-sentence high-yield clinical pearls.

═══════════════════════════════════════════════════════════
STEP 4 — SELF-CHECK (MANDATORY)
═══════════════════════════════════════════════════════════
Before submitting, fill in the self_check object honestly. If any check is false,
fix the artifact before calling the tool. This is not optional.

═══════════════════════════════════════════════════════════
SUBMIT
═══════════════════════════════════════════════════════════
Call submit_visual_artifact exactly once. Do not write any text outside the tool call.
"""


SIMULATION_SYSTEM = _build_simulation_system()


def _validate_artifact(spec: Dict) -> Optional[str]:
    """Return an error string if the spec needs repair, else None."""
    html = spec.get("artifact_html", "") or ""
    if len(html) < 2000:
        return "Artifact HTML is too short (<2000 chars). Return a richer artifact."
    if "<!DOCTYPE" not in html[:200].upper() and "<!doctype" not in html[:200]:
        return "Artifact must start with <!DOCTYPE html>."
    if "<svg" not in html.lower():
        return "Artifact must contain an inline <svg> element."
    if "localStorage" in html or "sessionStorage" in html:
        return "Remove all localStorage/sessionStorage use — sandboxed iframe blocks storage."
    if "http://" in html or ("https://" in html and "xmlns" not in html.split("https://")[0][-30:]):
        # allow xmlns="http://www.w3.org/2000/svg" but nothing else
        suspicious = [u for u in re.findall(r'https?://[^\s"\'<>]+', html) if "w3.org" not in u]
        if suspicious:
            return f"Remove external URLs: {suspicious[:2]}. Artifact must be fully self-contained."
    sc = spec.get("self_check", {}) or {}
    failed = [k for k, v in sc.items() if v is False]
    if failed:
        return f"Your own self_check failed on: {', '.join(failed)}. Fix these and resubmit."
    # Ensure controls exist (look for keywords)
    low = html.lower()
    if not ("play" in low and "reset" in low):
        return "Artifact must include Play and Reset controls."
    return None


async def _call_simulation(topic: str, language: str, repair_note: Optional[str] = None) -> Dict:
    client = get_client()
    user_msg = f"Topic: {topic}\nUI language: {language}\n\nBuild the full VisualEngine artifact for this topic now."
    if repair_note:
        user_msg += f"\n\nREPAIR REQUEST — your previous artifact failed this validation:\n{repair_note}\nReturn a corrected artifact."

    msg = await client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=12000,
        temperature=0.3,
        system=SIMULATION_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
        tools=[SIMULATION_TOOL],
        tool_choice={"type": "tool", "name": "submit_visual_artifact"},
    )
    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "submit_visual_artifact":
            return block.input
    raise ValueError("Claude did not return submit_visual_artifact tool_use output")


async def generate_simulation(topic: str, language: str = "en") -> Dict:
    """Generate a VisualEngine artifact. One repair pass if validation fails."""
    spec = await _call_simulation(topic, language)
    err = _validate_artifact(spec)
    if err:
        print(f"[sim] first pass failed validation: {err}")
        try:
            spec = await _call_simulation(topic, language, repair_note=err)
            err2 = _validate_artifact(spec)
            if err2:
                print(f"[sim] repair pass still has issues: {err2} — returning anyway")
        except Exception as e:
            print(f"[sim] repair pass exception: {e}")
    return spec
