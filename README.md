# openEBM — Open Evidence-Based Medicine

A Claude-powered, mobile-first evidence-based medicine platform with verified citations,
multilingual answers, and interactive medical simulations. No login required.

> openEBM is decision support — **not a substitute for clinician judgment**.

- **Frontend:** Next.js 14 + React + TypeScript + Bootstrap 5
- **Backend:** FastAPI (Python) + SQLAlchemy + Anthropic Claude API
- **Database:** PostgreSQL on Render
- **Deployment:** Vercel (frontend) + Render (backend + DB)
- **AI engine:** Anthropic Claude (the *only* AI engine — no other vendors)

**License:** [MIT](./LICENSE) · **15 languages supported**

---

## Table of Contents

1. [Architecture](#architecture)
2. [Repository structure](#repository-structure)
3. [Local development](#local-development)
4. [Environment variables](#environment-variables)
5. [Database setup & reset](#database-setup--reset)
6. [Render deployment (backend)](#render-deployment-backend)
7. [Vercel deployment (frontend)](#vercel-deployment-frontend)
8. [Termux workflow (phone-based push)](#termux-workflow-phone-based-push)
9. [Roadmap](#roadmap)

---

## Architecture

### Why this stack

- **Next.js + Bootstrap** — fast mobile-first UI with App Router, premium component library, true dark mode.
- **FastAPI** — async-first Python framework that handles concurrent citation verification cleanly.
- **PostgreSQL on Render** — same provider as the API, free tier, easy `DATABASE_URL` injection.
- **Claude API only** — single high-quality AI dependency. No OpenAI, Gemini, Perplexity, OpenRouter, etc.

### How Claude is used

The backend's `claude_service.py` calls `client.messages.create` with the
`web_search_20250305` tool enabled (`max_uses: 8`). This lets Claude run multiple
web searches per query and consider **20+ candidate sources internally** across
the broad medical evidence universe — major journals, Cochrane, society guidelines
(IDSA, AHA/ACC, ESC, ASCO, NICE, ACOG, AAP…), public health agencies (WHO, CDC,
NIH, FDA, EMA), and high-quality reviews/meta-analyses.

Claude is **never limited to a fixed pool of 8 sources.** The 10–15 final references
displayed to the user are a curated, verified subset of a much larger candidate set.

### How references are verified

`citation_verifier.py` is the trust layer. For every candidate Claude proposes:

1. The URL is normalized and fetched concurrently (httpx + semaphore-bounded).
2. The page is parsed with BeautifulSoup; real `<title>`, `og:title`,
   `<link rel="canonical">`, `citation_publication_date`, `citation_journal_title`,
   and `citation_author` are extracted.
3. Token-overlap title similarity is computed against Claude's claimed title.
4. The domain is scored against `trusted_domains.py` (~50 trusted medical domains).
5. Each candidate gets a status: `verified`, `weak-match`, or `rejected`.
6. Only `verified` references reach the user.
7. Inline `[n]` citation tokens in the answer body are **remapped** so dropped
   references never leave dangling numbers.

If fewer than 10 high-confidence sources can be confirmed, the response is flagged
`insufficient_evidence: true` and a warning is shown. The system does **not** pad with
weak sources to hit a number.

### How PostgreSQL is used

All openEBM tables are namespaced `openebm_*`:

- `openebm_verified_citations` — cache of verified URL metadata
- `openebm_answer_sessions` — optional server-side answer record (history is local-first)
- `openebm_simulation_templates` — prebuilt simulation specs
- `openebm_trusted_domains` — trust scoring reference table

Run `python -m scripts.reset_db` once on Render to **wipe the previous app's data**
and initialize a fresh openEBM schema (see [Database setup & reset](#database-setup--reset)).

### How multilingual works

- `langdetect` infers query language; user can override in Settings.
- The system prompt instructs Claude to write all prose in the user-selected language.
- Source titles are kept in their original language (medical fidelity).
- Supported: **English, Français, Español, العربية, Português** (with full RTL layout for Arabic).

### How simulations work

Claude generates a **JSON specification** (never executable code) describing steps,
visual elements (`circle`, `rect`, `arrow`, `label`), and durations. The frontend's
`SimulationPlayer.tsx` renders this with a deterministic SVG engine and provides
**Play / Pause / Next / Back / Reset / Speed** controls. `prefers-reduced-motion`
is honored.

---

## Repository structure

```
openEBM/
├── backend/
│   ├── app/
│   │   ├── main.py                      FastAPI app + CORS
│   │   ├── core/config.py               Pydantic settings (env-only)
│   │   ├── db/database.py               SQLAlchemy engine
│   │   ├── models/models.py             openebm_* tables
│   │   ├── schemas/schemas.py           Request/response models
│   │   ├── services/
│   │   │   ├── claude_service.py        THE Claude engine (web_search tool)
│   │   │   ├── citation_verifier.py     Verification layer
│   │   │   ├── trusted_domains.py       ~50 trusted medical domains
│   │   │   └── language_service.py      langdetect wrapper
│   │   └── api/
│   │       ├── ask.py                   Main /api/ask endpoint
│   │       ├── simulations.py           /api/simulations/*
│   │       └── health.py                /api/health
│   ├── scripts/reset_db.py              DB reset + seed
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                         Next.js App Router pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 Search/chat
│   │   │   ├── compare/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── saved/page.tsx
│   │   │   ├── more/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── simulations/page.tsx
│   │   │   └── about/page.tsx
│   │   ├── components/                  AppProvider, TopBar, BottomNav,
│   │   │                                Composer, AnswerView, SimulationPlayer
│   │   ├── lib/                         api.ts, storage.ts, i18n.ts
│   │   ├── styles/globals.css
│   │   └── types/index.ts
│   ├── public/manifest.json
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── vercel.json
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then edit ANTHROPIC_API_KEY and DATABASE_URL
python -m scripts.reset_db          # first time only
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive API docs.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local          # set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key. **Never commit.** |
| `DATABASE_URL` | ✅ | Render Postgres connection string. **Set via Render dashboard only.** |
| `CLAUDE_MODEL` | | Default: `claude-opus-4-5` |
| `CLAUDE_FAST_MODEL` | | For simulations. Default: `claude-sonnet-4-5` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated. Include `https://openebm.vercel.app` in prod. |
| `APP_ENV` | | `development` or `production` |
| `VERIFY_TIMEOUT_SECONDS` | | Default `8` |
| `MAX_CONCURRENT_VERIFICATIONS` | | Default `10` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | e.g. `https://openebm-api.onrender.com` |

> 🔒 **Security:** All secrets live in environment variables. Nothing sensitive is
> ever committed. `.env` is in `.gitignore`.

---

## Database setup & reset

The previous app's data on the Render Postgres database **must be wiped** before
openEBM can initialize cleanly.

### Hard reset (recommended for first install)

This drops **every table** in the public schema, then creates the openEBM schema
and seeds trusted domains + simulation stubs.

```bash
cd backend
python -m scripts.reset_db
```

### Soft reset (only drop openebm_* tables)

```bash
python -m scripts.reset_db --soft
```

### Running the reset on Render

After deploying the backend (see below), open the Render shell for the
`openebm-api` service and run:

```bash
python -m scripts.reset_db
```

Or trigger it once via a one-off Render Job.

---

## Render deployment (backend)

1. Push this repo to GitHub: https://github.com/Joysilas389/OpenEBM
2. In Render, create a new **PostgreSQL** instance (or reuse the existing one).
3. Create a new **Web Service** → **Build from a repository** → select `OpenEBM`.
4. Render will detect `backend/render.yaml`. If not, configure manually:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in the Render dashboard:
   - `ANTHROPIC_API_KEY` → your key
   - `DATABASE_URL` → from the Render Postgres "Internal Database URL"
   - `ALLOWED_ORIGINS` → `https://openebm.vercel.app`
   - `CLAUDE_MODEL` → `claude-opus-4-5`
   - `APP_ENV` → `production`
6. Deploy. Once live, open the Render shell and run:
   ```bash
   python -m scripts.reset_db
   ```
7. Verify: `https://openebm-api.onrender.com/api/health` should return `{"status":"ok",...}`

---

## Vercel deployment (frontend)

1. In Vercel, import the GitHub repo.
2. **Root directory:** `frontend`
3. **Framework preset:** Next.js (auto-detected)
4. Add environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` → `https://openebm-api.onrender.com`
5. Deploy. Live URL: `https://openebm.vercel.app`

After deployment, double-check the backend's `ALLOWED_ORIGINS` includes the
final Vercel URL.

---

## Termux workflow (phone-based push)

This project is built to be downloaded as a zip to your Android phone, then
pushed to GitHub via Termux.

### A. First-time Termux setup

```bash
pkg update -y && pkg upgrade -y
pkg install -y git unzip rsync nodejs python
termux-setup-storage
```

### B. First download and push

```bash
cd /storage/emulated/0/Download
rm -rf openEBM
unzip openEBM.zip -d openEBM
cd openEBM
git init
git add .
git commit -m "Initial openEBM build"
git branch -M main
git remote add origin https://github.com/Joysilas389/OpenEBM.git
git push -u origin main
```

### C. Later update workflow (preserves git history)

```bash
cd /storage/emulated/0/Download
rm -rf openEBM-new OpenEBM-repo
git clone https://github.com/Joysilas389/OpenEBM.git OpenEBM-repo
unzip openEBM.zip -d openEBM-new
rsync -av --delete --exclude='.git' openEBM-new/ OpenEBM-repo/
cd OpenEBM-repo
git add .
git commit -m "Update openEBM"
git push origin main
```

### D. Delete old zip before downloading a new zip

```bash
cd /storage/emulated/0/Download
rm -f openEBM.zip
```

### E. Optional: remove old extracted folders

```bash
cd /storage/emulated/0/Download
rm -rf openEBM openEBM-new
```

---

## Roadmap

### Next upgrades

- **Streaming answers** — switch `/api/ask` to SSE so sections appear progressively.
- **Server-side history sync** — wire the existing `openebm_answer_sessions` table to
  per-device sync endpoints (`GET/DELETE /api/sessions`).
- **Voice input** — Web Speech API on the composer mic button.
- **PDF export** — server-side PDF rendering of answers + references.
- **Drug interaction checker** — dedicated endpoint built on top of Claude + verified
  pharmacology references.
- **Differential diagnosis builder** — multi-symptom workflow.
- **Clinical calculators** — Wells, CHA₂DS₂-VASc, MELD, etc., as cards next to answers.
- **Citation cache hit-rate metrics** — admin dashboard.
- **Offline reading** — cache last N answers in IndexedDB for airplane-mode review.
- **Specialty home screens** — pre-tuned landing pages for each specialty filter.
- **More languages** — German, Hindi, Swahili, Mandarin.
- **Prebuilt simulation library** — replace stubs with hand-authored specs for the
  classic physiology curriculum.
- **Citation export** — BibTeX / RIS / EndNote.

---

**Owner:** joysilas389@gmail.com
**Repo:** https://github.com/Joysilas389/OpenEBM
**Frontend:** https://openebm.vercel.app
**Backend:** https://openebm-api.onrender.com
