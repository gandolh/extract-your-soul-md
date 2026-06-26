# TP-01 — Conversation analyze flow

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).

## Goal
Verify a pasted conversation is analyzed on the spot (no LLM, no persistence of
the transcript) and the derived statistics can be saved.

## Cases
1. **Empty analyze** — click Analyze with an empty textarea → an inline error,
   no crash, no navigation.
2. **Garbage input** — paste text with no recognizable timestamps → a friendly
   422-driven message ("No messages were recognized…"), not a blank dashboard.
3. **Valid analyze** — paste a small WhatsApp-style export → dashboard renders:
   overview tiles (messages / people / date range), per-person cards (message
   count, words, avg reply, top words), messages-per-month bars, red flags.
4. **Transcript cleared** — after a successful analyze, the textarea is emptied
   (the transcript is discarded client-side too).
5. **Save with default name** — leave the name blank, Save → toast confirms a
   name like `1-2026-06-26`.
6. **Save named** — type a name, Save → toast confirms that exact name.
7. **Upload .txt** — the Upload button loads a file's text into the textarea.

## Pass criteria
Dashboard numbers match the input; saving succeeds and the name defaulting works;
empty/garbage inputs fail gracefully with inline messaging. No console errors
beyond benign Vite/React-Query noise.
