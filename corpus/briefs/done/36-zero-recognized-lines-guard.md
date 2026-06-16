# 36 — Zero-recognized-lines import guard

**Priority:** P3 · **Goal:** engineering · **Impact:** medium · **Effort:** S · **Status:** done · **Promoted:** 2026-06-16 (the S half of `todos/multi-platform-import-adapters.md`; the L adapter-registry half stays deferred) · **Done:** 2026-06-16

## Outcome (2026-06-16)
Added a pipeline-layer guard in
[server/pipeline.ts](../../../src/server/pipeline.ts) so a non-WhatsApp upload
fails loudly instead of producing a silently-empty soul.md.

- New `NoRecognizedMessagesError` class, sibling to the existing
  `NamesMismatchError`. Distinction made explicit in the doc comment: names
  mismatch = lines parsed but none were the user's; no-recognized = the parser
  matched ZERO message lines (no sender ever parsed) → almost certainly a
  non-WhatsApp export.
- Guard (a) in `runUserExtraction`, right where the names-mismatch guard lives:
  fires when conversations were imported AND `questionnaireAnswers === 0` AND
  every `perSource` entry has `parsedSenders.length === 0`. Message points the
  user at WhatsApp's "Export chat → Without media" or to answering the studies.
- **Questionnaire-only flows are unaffected** — the guard requires
  `questionnaireAnswers === 0`, and a questionnaire-only run has no freeform
  sources anyway. This honors the todo's "not the shared core path that
  questionnaire-only flows use" constraint by living in the web pipeline layer,
  not in `processAll` itself.
- Deliberately did NOT add `&& noQuestionnaire` to the pre-existing
  names-mismatch guard (b) — a names problem is worth surfacing even when a
  questionnaire fallback exists; preserves prior behavior.
- Wired `NoRecognizedMessagesError` into `failureMessage` in
  [routes/results.ts](../../../src/server/routes/results.ts) so its message
  passes through to the user (the job's `error` field) rather than being
  scrubbed to the generic "Extraction failed".

**Test:** added a `processAll` case to
[stages/pipeline.test.ts](../../../src/stages/pipeline.test.ts) pinning the
`ProcessStats` contract the guard keys on — a non-WhatsApp file yields
`perSource.every(s => s.parsedSenders.length === 0)` with `myLinesIn === 0` and
`questionnaireAnswers === 0`. (The guard itself sits in DB+Ollama-coupled
`runUserExtraction`, like `NamesMismatchError`, so it's covered by pinning its
trigger signal rather than by an integration test.) 13 tests pass; `build:server`
+ `typecheck:test` + `typecheck:web` clean. Nothing committed.

## Deferred (still open — see the trimmed todo)
The parser-adapter registry (extract BRACKETED/DASHED into a `whatsapp` adapter,
add Telegram/iMessage/etc.) stays deferred — `decisions.md` locks "WhatsApp-only"
and there's no second-format demand signal. Gate on a real request; keep the
`ParsedLine {sender, body}` seam stable.

## Problem
`parseLine` recognizes exactly two WhatsApp line formats; any other export
(iMessage, Telegram/Discord JSON, Signal, CSV) silently produced zero kept lines,
and `processAll` still counted the file as processed — so a non-WhatsApp upload
yielded an empty profile with no error.

## Refs
code: [server/pipeline.ts](../../../src/server/pipeline.ts), [routes/results.ts](../../../src/server/routes/results.ts), [stages/process.ts](../../../src/stages/process.ts), [stages/pipeline.test.ts](../../../src/stages/pipeline.test.ts) · corpus: [decisions.md](../../wiki/decisions.md)
