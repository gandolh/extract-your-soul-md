// Frontend mirror of normalizeName() in src/stages/process.ts (the backend can't
// be imported here — separate tsconfig/bundler). The voice filter matches on this
// normalized form, so the UI uses it to tell whether a detected sender is already
// covered by a saved name and to sum the live "matched N messages" count.
//
// KEEP IN SYNC with src/stages/process.ts normalizeName(). If you change one,
// change the other — a divergence would make the UI's "already added"/match
// signal disagree with what extraction actually filters on.
export function normalizeName(s: string): string {
  return s
    .trim()
    .replace(/^~\s*/, '') // WhatsApp group-participant prefix
    .replace(/[​-‏﻿]/g, '') // zero-width + bidi marks
    .normalize('NFC')
    .toLowerCase()
    .trim();
}
