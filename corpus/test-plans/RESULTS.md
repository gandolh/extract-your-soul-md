# RESULTS — latest UI audit run

_Run 2026-06-26 · branch `conversation-stats-feature` · dev server (Vite 5173 +
Fastify 4317) on a throwaway DB · Playwright MCP, user `audit`._

## Outcomes

| Plan | Result | Note |
|------|--------|------|
| [TP-01 Analyze flow](TP-01-analyze.md) | **PASS w/ findings** | Compute/save/transcript-clear all work; found the avg-reply bug (F-01, fixed). |
| [TP-02 Saved stats](TP-02-saved-stats.md) | **PASS** | List newest-first, detail round-trips, unknown id 404s gracefully. Delete confirmed via API smoke test (native confirm not re-driven). |
| [TP-03 UI/UX audit](TP-03-ui-audit.md) | **PASS** | Brand parity with sibling pages; mobile reflow clean (no h-scroll); single-participant + long-name boundary handled; loading labels present. |

## Evidence (playwright/screenshots/, gitignored)

- `tp01-analyze-empty-desktop.png` — empty analyze page
- `tp01-analyze-garbage-toast.png` — friendly 422 message on unrecognized input
- `tp01-analyze-dashboard-desktop.png` — full dashboard (shows F-01 before fix)
- `tp01-avgreply-fixed-desktop.png` — dashboard after F-01 fix (Alice 3m, Bob 55m)
- `tp01-save-default-toast.png` — save with default name
- `tp02-saved-list-desktop.png` — saved list (`1-2026-06-26`)
- `tp02-saved-detail-desktop.png` — saved detail round-trip
- `tp03-analyze-dashboard-mobile.png` — mobile reflow (390×844)
- `tp03-single-participant-longname.png` — single-person + long-name boundary

## Findings

- **F-01 (medium, FIXED)** — Average response time averaged multi-day gaps between
  conversation *sessions*, producing absurd, unreadable values (a real chat showed
  Alice "15396m" ≈ 10.7 days). Two fixes:
  - Backend: only count a reply toward the mean if it lands within
    `RESPONSE_WINDOW_MINUTES` (6h) of the prior message — longer gaps are a new
    session, not a response. (`src/stats/conversation-stats.ts` + golden test.)
  - Frontend: format the duration in the unit that reads cleanly (m / h / d)
    rather than raw minutes. (`StatsDashboard.tsx`.)
  - Verified: Alice 15396m → 3m, Bob 54.8m → 55m. AC: no response-time value
    exceeds the session window; durations are human-readable.

## Notes / non-findings

- Console "errors" are benign: `favicon.ico` 404 and the expected 401 on
  `/api/auth/me` before login.
- Textarea is cleared on a successful analyze (transcript discarded client-side
  too) — confirmed.
- Keyboard a11y: inputs/buttons/nav use the shared focus-visible outline + ring
  utilities (Button/field primitives); not separately re-driven.
