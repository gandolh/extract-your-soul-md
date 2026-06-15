// Order of studies for prev/next navigation — mirrors STUDIES in src/studies.ts.
// The studies list page reads the live order from the API; this constant only
// drives the "next/previous" buttons within a study and degrades gracefully if
// a study id isn't found (indexOf → -1, no neighbors shown).
export const STUDY_ORDER = ['inner-world', 'how-you-tell-it', 'how-you-see-yourself'];
