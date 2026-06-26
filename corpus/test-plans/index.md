# Test plans — UI validation + audit

Plain-text plans describing **what** to test in the browser. The **how** (server
bring-up, fixtures, routes, conventions) lives in the Playwright hub:
[../../playwright/README.md](../../playwright/README.md).

## How a run works

1. Bring up a seeded test server per the hub README (throwaway DB, test port).
2. Walk each plan's cases in order, actually performing interactive flows.
3. Screenshot key states to `playwright/screenshots/<plan-id>-<step>.png` and
   judge each against intent, not just "it rendered".
4. Record outcomes in [RESULTS.md](RESULTS.md) and file durable findings as
   corpus todos.

## Plans

- [TP-01-analyze.md](TP-01-analyze.md) — Conversation analyze flow (compute → save).
- [TP-02-saved-stats.md](TP-02-saved-stats.md) — Saved statistics list + detail + delete.
- [TP-03-ui-audit.md](TP-03-ui-audit.md) — UI/UX audit: responsive, states, a11y, fidelity.
