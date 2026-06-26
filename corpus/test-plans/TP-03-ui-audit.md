# TP-03 — UI/UX audit (stats feature)

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).

## Goal
Audit the new Analyze + Saved pages for design fidelity, responsiveness, states,
and accessibility — beyond happy-path clicking.

## Cases
1. **Design fidelity** — the new pages match the Clinical Voice Instrument system
   (monospace eyebrows, hairline cards, oxblood accent, tight sans headlines) used
   by Studies/Answers/Cards. No off-palette colors or stray defaults.
2. **Responsive** — at mobile (390×844) the overview tiles, per-person cards, and
   monthly bars reflow without horizontal scroll or overlap; nav collapses to the
   hamburger and includes Analyze + Saved.
3. **Loading state** — during Analyze and Save, the button shows a pending label
   and is disabled (capture *during* the call).
4. **Empty / boundary states** — single-participant chat, a chat with no parseable
   dates (date range shows "—", monthly section hidden), long participant names
   (truncate, no overflow).
5. **Bar chart sanity** — monthly bars scale to the max; legend dots match bar
   colors; counts align.
6. **Keyboard a11y** — textarea, buttons, name input, and nav links are reachable
   by Tab with a visible focus ring; the file input is operable.
7. **Contrast** — eyebrow/faint text and the primary buttons meet contrast against
   their backgrounds.

## Pass criteria
Visual parity with sibling pages; no overflow/overlap at mobile; pending states
visible; boundary inputs render cleanly; focus order + visible focus present.
