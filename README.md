# Disha

**An India-specific pre-decision carbon advisor.** State a purchase or trip — or paste a booking screenshot — and get your real options ranked across **carbon, cost, and time**, with a lifetime "carbon avoided" total that only grows.

> *Disha* (दिशा) means "direction." Every other carbon app is a guilt machine you open once. Disha makes logging a single sentence and replaces the number with one action you can take **before you spend a rupee.**

Built for the Carbon Footprint Awareness challenge on the Gemini + Google Cloud stack.

---

## The core idea

1. **Three axes, never one.** Every comparison shows carbon, cost, and time side by side. A carbon-only tool is preachy and loses.
2. **Gemini interprets, the engine computes.** The model turns messy input into structured options. It *never* produces a carbon number. All carbon math comes from [`india-factors.json`](india-factors.json) through a pure, unit-tested function. That is the credibility core.
3. **One core, three front doors.** Type, talk, and share-a-screenshot all normalise into the **same** structured intent object, then hit the **same** `/compare` engine.

### The India honesty angle

Off-the-shelf tools use Western emission factors. The Indian grid is ~**0.72 kg CO₂/kWh** (CEA) — two to three times dirtier than the EU. So electrification saves *less* here than the marketing claims. Disha says this out loud.

---

## Architecture

```
disha/
├── india-factors.json     # source of truth for all carbon math
├── packages/
│   └── engine/            # pure computeFootprint() + Jest tests (Phase 1)
└── apps/
    ├── api/               # Express on Cloud Run (asia-south1)
    └── web/               # Next.js 14 App Router on Vercel, mobile-first
```

**Stack:** Next.js 14 · Express · Gemini 2.5 Flash (`@google/genai`) · Firebase Anonymous Auth + Firestore.

---

## Run locally

Requires Node ≥ 20.

```bash
npm install                 # installs all workspaces

# terminal 1 — API on :8080
npm run dev:api

# terminal 2 — web on :3000
npm run dev:web
```

Open http://localhost:3000 — the landing card should show **✓ API connected**, confirming both ends talk (Phase 0).

### Environment

```bash
cp apps/api/.env.example apps/api/.env            # add GEMINI_API_KEY from Phase 2
cp apps/web/.env.local.example apps/web/.env.local
```

---

## Build status

Following the blueprint phases 0 → 10:

- [x] **Phase 0** — skeleton, web + API talking
- [ ] **Phase 1** — emission engine + Jest tests (ships before any AI)
- [ ] **Phase 2** — Gemini decision parser (strict JSON)
- [ ] **Phase 3** — `/compare` endpoint + ranking
- [ ] **Phase 4** — screenshot ingestion (Door C)
- [ ] **Phase 5** — the result card
- [ ] **Phase 6** — carbon-avoided ledger
- [ ] **Phase 7** — seed examples + empty state
- [ ] **Phase 8** — credibility guardrails
- [ ] **Phase 9** — polish + framing
- [ ] **Phase 10** — artifacts + deploy
