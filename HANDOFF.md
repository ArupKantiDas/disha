# Disha — build handoff (continue from here)

You are continuing the build of **Disha**, an India-specific pre-decision carbon advisor. The previous session (Opus) hit its usage limit. **Almost everything is done.** Only one step remains: **deploy the web app to Vercel** and wrap up. Read this whole file first.

## Absolute rule: git identity (do not violate)

Every commit must be authored by **Arup Kanti Das**, never an AI. No AI co-author lines, no "Generated with…" trailers. The repo is already configured:

```bash
git config user.name    # must print: Arup Kanti Das
git config user.email   # must print: arupd557@gmail.com
```

Verify before committing. Write commit messages like a human engineer.

## What this project is

State a trip or purchase (type, talk, or share a screenshot) → get options ranked across **carbon, cost, and time** → a lifetime "carbon avoided" counter. Hard rules: Gemini interprets but **never** produces a carbon number (a pure engine does, from `india-factors.json`); three axes always; one core behind three doors; screenshot reads route/price/mode only. See `AGENTS.md`.

## Current state — Phases 0–9 DONE and verified, all pushed

- Repo: `/Users/arupkantidas/Documents/disha` · GitHub (public): https://github.com/ArupKantiDas/disha
- Engine: 27 Jest tests pass (`npm test --workspace packages/engine`).
- API: `/compare`, `/compare-image`, `/factors`, `/ledger/*` — all working.
- Web: type + voice + screenshot doors, result card, seed chips, avoided counter, "how we calculate" panel, grid-honesty note. Self-contained (no `@disha/*` imports), builds clean (`npm run build --workspace apps/web`).
- **API is already deployed to Cloud Run and verified:**
  - URL: **https://disha-api-563892064515.asia-south1.run.app** (allow-unauthenticated, CORS open)
  - GCP project: `disha-500107`, region `asia-south1`
  - Gemini via **Vertex AI** (model `gemini-2.5-flash`, location `global`) — auth via the Cloud Run runtime service account (Vertex AI User + Datastore User granted). No API key. (The Google account is restricted to `AQ.`-prefix keys which the Gemini Developer API rejects, hence Vertex.)
  - Firestore: Native, `asia-south1`, ledger collection `ledgers`.
- `apps/web/.env.production` already points the web build at the Cloud Run URL (verified inlined into the production bundle).
- Artifacts done: `README.md`, `AGENTS.md`, `docs/DEMO_SCRIPT.md`, `docs/PROMPT_LOG.md`, `docs/LINKEDIN.md`.

## THE ONLY REMAINING TASK: deploy web to Vercel

### Step 1 — ask the user to authenticate Vercel (the one manual step)
This is the only thing you cannot do via CLI yourself. Ask the user to run in THEIR terminal:
```bash
npx vercel login
```
(Continue with GitHub or email; creates a free account if needed.) Wait for them to confirm. Then verify:
```bash
npx vercel whoami
```

### Step 2 — deploy (you do this via CLI)
Deploy `apps/web` as its own project (it is self-contained):
```bash
cd /Users/arupkantidas/Documents/disha/apps/web
npx vercel --prod --yes
```
- Accept defaults (`--yes`). Framework auto-detects as Next.js. It will create a project (name defaults to the folder; you may set it to `disha` if prompted/possible).
- `NEXT_PUBLIC_API_URL` is committed in `apps/web/.env.production`, so the build inlines the live Cloud Run URL automatically. If for any reason Vercel does not pick it up, set it and redeploy:
  ```bash
  npx vercel env add NEXT_PUBLIC_API_URL production   # value: https://disha-api-563892064515.asia-south1.run.app
  npx vercel --prod --yes
  ```
- Capture the production URL it prints.

### Step 3 — verify the full live stack
- `curl -sI <vercel-url>` returns 200.
- Confirm the deployed bundle calls the Cloud Run API (the URL is inlined; you can grep the page/JS, or load it).
- Best: load the site in a browser and run one comparison + tap "I'll take this", confirming the counter ticks up. You can use the `webapp-testing` skill (Playwright) or the Claude Preview MCP. Note from the prior session: the Preview MCP's `preview_click` did not always trigger React handlers — use `element.click()` via `preview_eval`, or Playwright, instead.
- Sanity-check the live API still works:
  ```bash
  curl -s -X POST https://disha-api-563892064515.asia-south1.run.app/compare -H 'Content-Type: application/json' -d '{"text":"Kolkata to Bangalore for a 3-day work trip"}'
  ```

### Step 4 — finalize
- Update `README.md`: tick Phase 10, add the live URLs (web + API) near the top.
- Commit (as Arup, no AI trailers) and push:
  ```bash
  git add -A && git commit -m "Phase 10: deploy web to Vercel; live demo end to end"
  git push origin main
  ```

## Useful commands / facts
- Run locally: `npm run dev:api` (:8080) + `npm run dev:web` (:3000). Local web uses `apps/web/.env.local` if present (point to localhost:8080).
- `gcloud` is authed as arupd557@gmail.com; ADC is set up; project `disha-500107`.
- If ports are stuck: `lsof -ti:3000 | xargs kill` / `lsof -ti:8080 | xargs kill`.
- The kickoff used a manual Opus→Sonnet handoff model. You are now the single executor — just finish the deploy; no further handoffs needed.

## Stop condition
When the Vercel URL is live and a comparison works through it end to end (web → Cloud Run → Vertex + Firestore), the build is complete. Don't add new features; the product is one sharp flow.
