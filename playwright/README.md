# Playwright UI audit — how to run

The **how-to-run hub** for browser-driven UI testing of this app. Test plans
(what to check) live alongside the project knowledge; this file is the setup +
conventions they all point back to.

Screenshots and traces are **build artifacts**: written to `screenshots/`, kept
for the current run, **gitignored**, and regenerated each time — never committed.

## Bring up the app

```bash
npm install          # Node ≥ 24 (built-in node:sqlite)
npm run dev          # Fastify API on :4317  +  Vite SPA on :5173
```

Open **http://localhost:5173** (Vite proxies `/api` → Fastify). For a
production-like run instead: `npm run build && npm run serve:prod` → single
origin on **http://127.0.0.1:4317**.

## Auth fixture

Every page except `/login` and `/register` is behind a cookie session. To reach
the app surface, register a throwaway user first:

1. Go to `/register`, create e.g. `audit` / `audit-pw-123`.
2. You land authenticated; the `sid` cookie carries the rest of the session.

The SQLite DB lives at `data/soul.sqlite` (gitignored). Delete it to reset all
users/answers/saved stats between runs.

## Routes worth walking

| Route | Page | Notes |
|-------|------|-------|
| `/` | Overview | Intro / onboarding |
| `/studies`, `/studies/:id` | Studies | Questionnaire forms (voice + profile) |
| `/answers` | Answers | Editable review of every answer |
| `/swipe` | Cards | "Does this sound like you?" deck (needs Ollama) |
| `/stats` | Analyze | Paste a conversation → transient stats → Save |
| `/saved-stats`, `/saved-stats/:id` | Saved | Saved statistics list + detail |
| `/results` | Profile | Generates `soul.md` (needs Ollama) |

The **Analyze** flow needs no Ollama and no real data — paste a few WhatsApp-style
lines (`1/1/24, 10:00 - Alice: hi`) to exercise the parser, charts, and save path.

## Conventions

- **Screenshot naming:** `screenshots/<plan-id>-<step>.png` (e.g.
  `stats-analyze-desktop.png`) so a glob diffs cleanly across runs.
- **Viewports:** capture `-desktop` (1280×800) and `-mobile` (390×844) for any
  layout claim.
- **Capture during async work** (a save, a compute call), not only before — so
  loading/empty/filled states are all evidenced.
- File durable findings back into the project's corpus (`corpus/`), not here.
