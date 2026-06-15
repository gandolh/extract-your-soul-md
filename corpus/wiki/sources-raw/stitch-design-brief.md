# Design Brief — soul.study

A prompt-ready brief for Stitch (or any AI design tool). Copy whole, or paste a single screen's section to generate that screen.

---

## 1. The product in one line

**soul.study** turns your WhatsApp exports plus a short reflective questionnaire into a portable `soul.md` voice profile that teaches an AI to write like *you* — not like a generic assistant. It combines diverse psychological studies to extract the best of human nature and transpose your speech patterns into a digital format.

**Who it's for:** writers, communicators, and anyone who drafts with AI and wants it to keep their own voice — their humor, bluntness, warmth, and exact way of explaining things. Secondary draw: self-knowledge ("how do I actually come across?").

## 2. Tone & personality

Introspective, quietly rigorous, privacy-first, and a little wry. It reads as a serious **research instrument**, not a quiz — precise and restrained, but warm enough to ask vulnerable questions and have them feel safe.

## 3. Visual direction — clinical instrument, light & compact

A focused, precise, data-forward tool. Dense but never cramped.

- **Base:** clean **light** surfaces. App background near-white `#fafafa`, raised panels/cards pure white `#ffffff`, with a faint warm undertone (not cold blue-gray). Dark text on light.
- **Single accent — oxblood `#9c3a3a`** (wash `#f3e6e4` for tinted fills). Carries brand continuity from the current app. **Used functionally/semantically only:** primary actions, active nav, progress fill, and key state indicators. The rest of the UI stays neutral.
- **Text:** `#1a1714` primary, `#5a554e` secondary, `#8f8a82` faint.
- **Borders:** hairline warm-gray `#e6e3dd` (stronger `#d2cec6` for emphasis). **Slightly soft** surfaces — 4–6px radius, subtle borders, faint shadows only where elevation is needed. Nothing glossy.
- **Semantic colors:** ok `#3c6e47`, warn `#8a5a1a`, error `#c8584a`.
- **Typography — sans body + mono accents:**
  - Body, headings, inputs — one clean **sans** (Inter or similar). Tight line-height, confident sizing, no oversized hero type.
  - **Monospace** (IBM Plex Mono / JetBrains Mono) for labels, eyebrows, metadata, counts, filenames, and button labels — small, often UPPERCASE and letter-spaced. This sans-body / mono-label contrast is the signature and keeps the "instrument" edge.
  - The rendered `soul.md` profile may use a serif for its body so the *output* reads like a document, while the app chrome stays sans.
- **Density:** **compact** — small-to-medium paddings, tight spacing scale (4 / 8 / 12 / 16 / 24), reading measure ~60ch (not luxuriously wide). Aim to fit more on screen without crowding.
- **Wordmark:** `soul.study` in sans, the period in oxblood. Tiny mono subtitle: `voice · regularities · self-report`.
- **Eyebrows:** sections open with a small uppercase mono label ("THE STUDIES", "THE PROFILE", "HOW IT WORKS").

Avoid: generic SaaS gradients, neon, glassmorphism, big rounded bubble cards, drop-shadow soup, stock illustration, emoji-driven UI, oversized hero whitespace, long paragraphs.

## 4. Copy: hard-trimmed

Cut prose to one-liners. Lead with the action, not the explanation. Labels, hints, and the questions themselves carry the meaning. No multi-paragraph intros anywhere.

## 5. Layout shell (all logged-in screens)

- **Sticky masthead** on a white bar with a bottom hairline (subtle shadow on scroll). Left: `soul.study` wordmark + mono subtitle. Right (pushed to end): nav links `OVERVIEW · STUDIES · CONVERSATIONS · PROFILE`, then `— username` in faint mono, then `SIGN OUT`. Active link is oxblood with an underline.
- **Centered content column**, max ~960px, compact vertical padding.
- **Footer:** tiny faint mono, centered — "Self-report data stays on this machine · profiles are generated locally · review before reuse."

## 6. Screens

### A. Login / Register (public, no shell)
Centered on the light background. `soul.study` wordmark, a one-line mono subtitle ("SIGN IN" / "CREATE ACCOUNT"). A single raised panel: username + password fields, an oxblood primary button ("Sign in" / "Create account"), inline error notice when needed, and a link to the other auth screen. Register shows a faint one-line hint under password: "6+ chars · stored hashed."

### B. Overview / home (`/`)
The compact entry point — no long intro.
- Eyebrow "A STUDY OF VOICE". Sans H1, tight: *"Your words, read back as a **pattern**."* ("pattern" in oxblood). One short sub-line, no more.
- A "HOW IT WORKS" row: eyebrow on the left, a **progress meter** on the right ("4 / 11 ANSWERED" with a thin oxblood fill bar).
- Three numbered cards in a tight row: **01 / STUDIES**, **02 / CONVERSATIONS**, **03 / PROFILE** — each one short line + its own mini progress meter.
- One oxblood CTA: "Begin the first study →".

### C. Studies index (`/studies`)
- Eyebrow "THE STUDIES", H1 "Self-report instruments", one-line lede.
- A compact responsive grid of study cards (raised panels). Each: mono index ("01 / STUDY"), sans title, one-line description, progress meter at the bottom. Three studies: **Inner World**, **How You Tell It**, **How You See Yourself**. Whole card is a link.

### D. Study page (`/studies/:id`)
The core writing surface — calm but compact.
- Header row: eyebrow "STUDY 01 / 03" on the left; an **EN / RO language toggle** on the right (small mono segmented control, selected segment filled oxblood). Sans H1 = study title, one-line description, then a progress meter ("2 / 3 ANSWERED").
- A vertical stack of questions, ~60ch column. Each: mono label ("QUESTION 1" or "QUESTION 2 · OPTIONAL"), the prompt in sans, an optional faint one-line hint, then a resizable **textarea** (placeholder "Write as much as you like…" or "Optional — leave blank to skip."). Keep inter-question spacing tight.
- Button row: oxblood "Save", ghost "← Previous" (if not first), ghost "Save & next →" (or "Save & finish →" on the last). Buttons show "Saving…" while busy.
- The questions are deliberately vulnerable (frustrations, fears, how you want vs. actually come across) — the surface should feel safe and unhurried even while dense.

### E. Conversations / Import (`/import`)
A clear two-step page.
- Eyebrow "CONVERSATIONS", H1 "Import your own words", one-line lede.
- **Step 1 — Your names:** mono eyebrow "STEP 1 · YOUR NAMES", one-line note ("One name per line — keeps only your messages"), a small textarea (placeholder shows example names/numbers), a ghost "Save names" button, and when set, a mono **pill** like "3 NAMES SET".
- Hairline divider.
- **Step 2 — Drop exports:** a **dropzone** with a dashed border that turns oxblood with a faint wash on drag-over — "Drop .txt / .md exports here, or click to browse." Below, when files exist, a panel listing each file (mono filename + ghost "Remove"). Uploading shows "Uploading…".

### F. Profile / Results (`/results`)
Where `soul.md` appears.
- Header row: left — eyebrow "THE PROFILE", H1 *`soul.md`* (dot in oxblood), one-line lede. Right — oxblood "Generate profile" (disabled with a one-line note if there's nothing to extract), and when a profile exists, "Re-run extraction" + a ghost "View previous / Hide previous".
- **Empty state:** an inline error notice — "Nothing to extract yet. Answer a study or import a conversation first." (those words linked).
- **Running state:** small spinner + button reading "Generating…", plus muted one-liner: "Running over your chunks — may take a few minutes on a local model. Keep this tab open."
- **Result:** a tiny mono metadata line ("GENERATED <date> · VIA OLLAMA"), then the profile rendered as clean markdown inside a raised `.soul` panel (~60ch) — serif body so it reads like a document; headings (Tone & Register, Vocabulary & Signature Phrases, Humor, Values & Worldview, Communication Style, Stylistic Habits, How To Imitate…), paragraphs, bullet lists, inline `code` / **bold** / *italic*. When viewing the previous version, show a mono tag "SHOWING PREVIOUS VERSION".
- **Confirm dialog** for re-run: small centered panel — title "Re-run extraction?", one-line body "The current profile becomes the previous version.", buttons oxblood "Re-run" + ghost "Cancel".

## 7. Shared components & states

- **Buttons:** primary = oxblood fill, light label, 4–6px radius, mono or small-caps label; ghost = transparent with hairline border, light text. Disabled = faded; busy = inline spinner + present-tense label ("Saving…", "Generating…").
- **Progress meter:** thin bar on a hairline track with an oxblood fill and a mono "X / Y" count beside it. Reused on overview, studies index, study page.
- **Eyebrow label:** small uppercase letter-spaced mono in faint ink, above section titles.
- **Notices:** soft tinted band, compact — error (red), success (green), inline.
- **Toasts:** bottom-right, mono, small, auto-dismiss; tones ok / error / info.
- **Pill / tag:** small mono, faint, slightly soft, for counts/status ("3 NAMES SET").
- **Spinner:** tiny ring, oxblood top edge.
- **Loading text:** plain "Loading…" in muted mono.
- **Segmented toggle:** small mono control (EN / RO), selected segment filled oxblood.

## 8. Responsiveness

Single column on mobile; the card rows (overview steps, studies grid) collapse to one column. Masthead nav collapses to a compact menu. Keep the ~60ch reading measure on text-heavy surfaces and preserve the compact spacing — mobile should feel tight, not stretched.

---

*Source of truth for the live app: `frontend/` (React + Vite SPA over a Fastify/SQLite API). This brief describes the **new** intended design — a clean light clinical-instrument look with a single oxblood accent — replacing the previous warm-paper "lab notebook" aesthetic.*
