# TP-02 — Saved statistics list + detail

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).

## Goal
Verify saved statistics are listed, openable in detail, and deletable — and that
no conversation text is exposed anywhere.

## Cases
1. **Empty state** — a fresh user with nothing saved sees a clear empty notice,
   not a blank page.
2. **List after save** — saved results appear newest-first with name + saved-at.
3. **Open detail** — clicking a saved result opens `/saved-stats/:id` and renders
   the same dashboard the analyze page showed.
4. **Back navigation** — "All saved" returns to the list.
5. **Delete** — deleting prompts for confirmation, removes the row, and shows a
   toast; reopening its old URL 404s gracefully.
6. **Unknown id** — visiting `/saved-stats/9999` shows a not-found notice, no crash.

## Pass criteria
List ordering and metadata are correct; detail matches the saved numbers; delete
is confirmed and reflected immediately; no raw transcript is ever shown.
