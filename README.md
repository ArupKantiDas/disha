# Disha

**An India-specific pre-decision carbon advisor.** State a purchase or trip — or share a booking screenshot — and get your real options ranked across **carbon, cost, and time**, with a lifetime "carbon avoided" total that only grows.

> *Disha* (दिशा) means "direction." Every other carbon app is a guilt machine you open once. Disha makes logging a single sentence and replaces the number with one action you can take **before you spend a rupee.**

Built for the Carbon Footprint Awareness challenge on the Gemini + Google Cloud stack.

---

## The core idea

1. **Three axes, never one.** Every comparison shows carbon, cost, and time side by side. A carbon-only tool is preachy and loses.
2. **Gemini interprets, the engine computes.** The model turns messy input into structured options. It *never* produces a carbon number. All carbon math comes from [`india-factors.json`](india-factors.json) through a pure, unit-tested function. That is the credibility core.
3. **One core, three front doors.** Type, talk, and share-a-screenshot all normalise into the **same** structured intent object, then hit the **same** comparison engine.

### The India honesty angle

Off-the-shelf tools use Western emission factors. The Indian grid is ~**0.72 kg CO₂/kWh** (CEA) — two to three times dirtier than the EU. So electrification saves *less* here than the marketing claims. Disha says this out loud: an EV on a Jaipur drive saves ~17 kg, not "zero."

---

## Architecture

```
disha/
├── india-factors.json     # source of truth for all carbon math
├── packages/
│   ├── engine/            # pure computeFootprint() + factor catalog + Jest tests
│   └── shared/            # the one contract: Intent, Candidate, RankedOption, CompareResponse
└── apps/
    ├── api/               # Express: /compare, /compare-image, /factors, /ledger/*
    └── web/               # Next.js 14 App Router, mobile-first
```

Flow: **input → Gemini parse `{intent, candidates}` → `computeFootprint` per candidate → rank by carbon → frame vs the user's default → result card.**

**Stack:** Next.js 14 · Express · Gemini 2.5 Flash (`@google/genai`) · Vertex AI · Firestore · (Vercel + Cloud Run, asia-south1).

### The three front doors
- **Type** — free text, `POST /compare`.
- **Talk** — browser speech-to-text on the client, then the same `/compare`.
- **Screenshot** — `POST /compare-image`; Gemini multimodal reads route/price/mode only (privacy + injection guards), the read option becomes your default, the engine supplies the greener alternatives.

---

## Gemini backend (important)

Disha talks to Gemini through **Vertex AI by default**, authenticated with Application Default Credentials — no API key in the app.

Why: the Google account used for this build is restricted to `AQ.`-prefix API keys, which the Gemini Developer API rejects (`ACCESS_TOKEN_TYPE_UNSUPPORTED`). Vertex AI sidesteps this entirely and keeps everything inside the Google Cloud project. The backend is configurable — set `GEMINI_BACKEND=aistudio` with an `AIza` key if you have one.

---

## Run locally

Requires Node ≥ 20 and, for the Vertex backend, the `gcloud` CLI.

```bash
npm install

# one-time: auth for Vertex AI (Application Default Credentials)
gcloud auth application-default login

cp apps/api/.env.example apps/api/.env      # set GOOGLE_CLOUD_PROJECT
cp apps/web/.env.local.example apps/web/.env.local

# terminal 1 — API on :8080
npm run dev:api
# terminal 2 — web on :3000
npm run dev:web
```

Open http://localhost:3000. Run the engine tests with `npm test --workspace packages/engine`.

### Environment (`apps/api/.env`)

```
GEMINI_BACKEND=vertex
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-2.5-flash
# GEMINI_API_KEY=    # only for GEMINI_BACKEND=aistudio
```

---

## Credibility

The three load-bearing factors are verified against primary sources (`verify: false` in the factor table):

| Factor | Value | Source |
|---|---|---|
| Grid intensity | 0.72 kg/kWh | CEA CO₂ Baseline v20 (0.716 FY23, 0.727 FY24) |
| Domestic flight | 0.246 kg/pkm | Our World in Data / DEFRA |
| AC rail | 0.012 kg/pkm | India GHG Programme (conservative for AC) |

The engine has a guardrail test suite asserting determinism and direction-correctness (the greener option always scores lower carbon). The app exposes a "How we calculate" panel from `GET /factors`.

---

## Build status

- [x] **Phase 0** — skeleton, web + API talking
- [x] **Phase 1** — emission engine + Jest tests (21)
- [x] **Phase 2** — Gemini decision parser (strict JSON, Vertex)
- [x] **Phase 3** — comparison endpoint + ranking
- [x] **Phase 4** — screenshot ingestion (Door C) with privacy + injection guards
- [x] **Phase 5** — the result card
- [x] **Phase 6** — carbon-avoided ledger (Firestore)
- [x] **Phase 7** — seed examples + empty state
- [x] **Phase 8** — credibility guardrails (verified factors, guardrail tests, factor panel)
- [ ] **Phase 9** — polish + framing
- [ ] **Phase 10** — artifacts + deploy

See [AGENTS.md](AGENTS.md) for the hard rules, and [docs/](docs/) for the demo script, prompt log, and LinkedIn draft.
