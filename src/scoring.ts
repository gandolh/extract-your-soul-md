// Scores the choice (trait) questions into per-test reports. Pure functions:
// in = the user's recorded answers (the {id,title,body} shape from
// answers-file.ts), out = a typed report payload per report_key. The server
// persists these into the `reports` table; the UI renders them; the extraction
// pipeline folds the included ones into the reduce prompt.
//
// Reports show AXIS PERCENTAGES, not just labels — percentages keep the
// midpoint-flip honest (a 52/48 split should not read like a confident type).
//
// The instruments (researched 2026-06-17, see brief 37):
//   big-five     TIPI (Gosling 2003)        — 5 traits, 2 items each
//   honesty-tone HEXACO-H modesty + NN/g + Tannen — independent bipolar axes
//   pcm          Kahler perceptual frame    — single dominant frame
//   mbti         OEJTS (open source)        — 4 dichotomies → 4-letter type

import { QUESTIONS, type Question, type ReportKey } from './questions.js';
import { decodeChoiceBody, type RecordedAnswer } from './answers-file.js';

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export type ReportKeyAll = ReportKey;
export const REPORT_KEYS: ReportKeyAll[] = [
  'big-five',
  'honesty-tone',
  'pcm',
  'mbti',
  'need-for-cognition',
  'values',
  'regulatory-focus',
  'locus-of-control',
];

// Whether a report is included in soul.md by default. Under the co-equal
// premise (self-report collaborates with observed voice rather than being the
// weakest evidence), every scored report is on by default — including MBTI.
export const DEFAULT_INCLUDE: Record<ReportKeyAll, boolean> = {
  'big-five': true,
  'honesty-tone': true,
  pcm: true,
  mbti: true,
  'need-for-cognition': true,
  values: true,
  'regulatory-focus': true,
  'locus-of-control': true,
};

export interface AxisResult {
  key: string;
  label: string; // human label for the axis / trait
  // For bipolar axes: percent (0..100) toward the RIGHT/positive pole.
  percent: number;
  // Categorical readout, e.g. "High", "Low", "Introverted (62%)".
  readout: string;
  answered: number; // how many items backed this axis
}

export interface ReportPayload {
  key: ReportKeyAll;
  title: string;
  axes: AxisResult[];
  // A short headline, e.g. the 4-letter MBTI type, or '' if none.
  summary: string;
  // True if the user answered at least one item feeding this report.
  hasData: boolean;
  // Self-report caveat surfaced in UI + prompt (strongest for MBTI).
  caveat: string;
}

const SELF_REPORT_CAVEAT =
  'Self-reported — a rough self-image, not a measurement. Your actual writing is the stronger signal.';
const MBTI_CAVEAT =
  'Self-reported and psychometrically weak — types often flip on retake, especially near 50%. Treat as a loose hint, not a verdict.';

/** Pull the numeric (1..5) scale value for a question id from the answers. */
function scaleValue(answers: Map<string, RecordedAnswer>, id: string): number | null {
  const a = answers.get(id);
  if (!a || !a.body.trim()) return null;
  const { values } = decodeChoiceBody(a.body);
  if (values.length === 0) return null;
  const n = Number(values[0]);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

/** Single-select value (e.g. PCM frame) for a question id. */
function singleValue(answers: Map<string, RecordedAnswer>, id: string): string | null {
  const a = answers.get(id);
  if (!a || !a.body.trim()) return null;
  const { values } = decodeChoiceBody(a.body);
  return values[0] ?? null;
}

/** Average the items loading on a trait, applying reverse-keying, then map the
 *  1..5 mean to a 0..100 percent. Returns null if no item was answered. */
function traitPercent(
  answers: Map<string, RecordedAnswer>,
  items: Question[],
): { percent: number; answered: number } | null {
  const vals: number[] = [];
  for (const q of items) {
    const v = scaleValue(answers, q.id);
    if (v === null) continue;
    vals.push(q.reverse ? 6 - v : v);
  }
  if (vals.length === 0) return null;
  const mean = vals.reduce((s, x) => s + x, 0) / vals.length;
  // 1..5 → 0..100.
  return { percent: Math.round(((mean - 1) / 4) * 100), answered: vals.length };
}

function level(percent: number): string {
  if (percent >= 67) return 'High';
  if (percent <= 33) return 'Low';
  return 'Moderate';
}

const BIG_FIVE_TRAITS: Array<{ key: Question['traitKey']; label: string }> = [
  { key: 'O', label: 'Openness' },
  { key: 'C', label: 'Conscientiousness' },
  { key: 'E', label: 'Extraversion' },
  { key: 'A', label: 'Agreeableness' },
  { key: 'N', label: 'Neuroticism' },
];

function scoreBigFive(answers: Map<string, RecordedAnswer>): ReportPayload {
  const axes: AxisResult[] = [];
  for (const t of BIG_FIVE_TRAITS) {
    const items = QUESTIONS.filter((q) => q.reportKey === 'big-five' && q.traitKey === t.key);
    const r = traitPercent(answers, items);
    if (!r) continue;
    axes.push({
      key: t.key as string,
      label: t.label,
      percent: r.percent,
      readout: `${level(r.percent)} (${r.percent}%)`,
      answered: r.answered,
    });
  }
  return {
    key: 'big-five',
    title: 'The Big Five',
    axes,
    summary: '',
    hasData: axes.length > 0,
    caveat: SELF_REPORT_CAVEAT,
  };
}

// honesty-tone axes are independent bipolar self-descriptions. Each axis is now
// backed by 1+ scale items carrying a matching `toneAxis` in questions.ts; we
// average them (value 1 = LEFT pole, 5 = RIGHT). percent = toward the RIGHT pole.
const HONESTY_TONE_AXES: Array<{ key: Question['toneAxis']; label: string; left: string; right: string }> = [
  { key: 'modesty', label: 'Self-presentation', left: 'Modest', right: 'Self-promoting' },
  { key: 'rapport', label: 'Rapport vs. report', left: 'Connect', right: 'Inform' },
  { key: 'formality', label: 'Formality', left: 'Casual', right: 'Formal' },
  { key: 'seriousness', label: 'Seriousness', left: 'Playful', right: 'Serious' },
  { key: 'irreverence', label: 'Irreverence', left: 'Respectful', right: 'Irreverent' },
  { key: 'enthusiasm', label: 'Energy', left: 'Matter-of-fact', right: 'Enthusiastic' },
];

function scoreHonestyTone(answers: Map<string, RecordedAnswer>): ReportPayload {
  const axes: AxisResult[] = [];
  for (const a of HONESTY_TONE_AXES) {
    const items = QUESTIONS.filter((q) => q.reportKey === 'honesty-tone' && q.toneAxis === a.key);
    const r = traitPercent(answers, items);
    if (!r) continue;
    const percent = r.percent;
    // Read out as a lean toward whichever pole the answer favors.
    const lean = percent === 50 ? `Balanced` : percent > 50 ? `${a.right} (${percent}%)` : `${a.left} (${100 - percent}%)`;
    axes.push({ key: a.key as string, label: a.label, percent, readout: lean, answered: r.answered });
  }
  return {
    key: 'honesty-tone',
    title: 'Stance & Tone',
    axes,
    summary: '',
    hasData: axes.length > 0,
    caveat: SELF_REPORT_CAVEAT,
  };
}

const PCM_LABELS: Record<string, string> = {
  thoughts: 'Thoughts — analyzes facts and logic first',
  opinions: 'Opinions — judges against values first',
  emotions: 'Emotions — feels for the people first',
  reactions: 'Reactions — immediate gut like/dislike first',
  actions: 'Actions — sees what to do and starts',
  reflections: 'Reflections — steps back and observes first',
};

function scorePcm(answers: Map<string, RecordedAnswer>): ReportPayload {
  const frame = singleValue(answers, 'Q29');
  const has = frame !== null && frame in PCM_LABELS;
  return {
    key: 'pcm',
    title: 'First Reaction',
    axes: has
      ? [{ key: frame!, label: 'Dominant frame', percent: 100, readout: PCM_LABELS[frame!], answered: 1 }]
      : [],
    summary: has ? (PCM_LABELS[frame!].split(' — ')[0] ?? '') : '',
    hasData: has,
    caveat: SELF_REPORT_CAVEAT,
  };
}

// MBTI: per axis, value 5 == the SECOND letter (I/N/F/P) by construction in
// questions.ts. Average the 4 items per axis → percent toward the second
// letter; the letter is whichever side > 50%.
const MBTI_AXES: Array<{ key: Question['traitKey']; first: string; second: string; label: string }> = [
  { key: 'EI', first: 'E', second: 'I', label: 'Extraversion / Introversion' },
  { key: 'SN', first: 'S', second: 'N', label: 'Sensing / Intuition' },
  { key: 'TF', first: 'T', second: 'F', label: 'Thinking / Feeling' },
  { key: 'JP', first: 'J', second: 'P', label: 'Judging / Perceiving' },
];

function scoreMbti(answers: Map<string, RecordedAnswer>): ReportPayload {
  const axes: AxisResult[] = [];
  let type = '';
  for (const ax of MBTI_AXES) {
    const items = QUESTIONS.filter((q) => q.reportKey === 'mbti' && q.traitKey === ax.key);
    const r = traitPercent(answers, items); // reverse already baked per item
    if (!r) {
      type += '–';
      continue;
    }
    const towardSecond = r.percent; // 100 == fully second letter
    const letter = towardSecond > 50 ? ax.second : ax.first;
    type += letter;
    const shown = letter === ax.second ? towardSecond : 100 - towardSecond;
    axes.push({
      key: ax.key as string,
      label: ax.label,
      percent: towardSecond,
      readout: `${letter} (${shown}%)`,
      answered: r.answered,
    });
  }
  const hasData = axes.length > 0;
  return {
    key: 'mbti',
    title: 'Type Indicator',
    axes,
    summary: hasData ? type : '',
    hasData,
    caveat: MBTI_CAVEAT,
  };
}

// --- Need for Cognition (NCS-6) — one trait, mean of 6 items → 0..100. -----
function scoreNeedForCognition(answers: Map<string, RecordedAnswer>): ReportPayload {
  const items = QUESTIONS.filter((q) => q.reportKey === 'need-for-cognition');
  const r = traitPercent(answers, items);
  return {
    key: 'need-for-cognition',
    title: 'Need for Cognition',
    axes: r
      ? [{ key: 'nfc', label: 'Appetite for hard thinking', percent: r.percent, readout: `${level(r.percent)} (${r.percent}%)`, answered: r.answered }]
      : [],
    summary: '',
    hasData: r !== null,
    caveat: SELF_REPORT_CAVEAT,
  };
}

// --- Schwartz Values (TIVI) — 10 single-item value portraits. Each is a
// "like me" rating; we report each value's percent and rank them, since the
// PROFILE is the relative priority ordering, not absolute levels. ------------
const VALUE_LABELS: Array<{ key: NonNullable<Question['valueKey']>; label: string }> = [
  { key: 'self-direction', label: 'Self-direction (autonomy, ideas)' },
  { key: 'stimulation', label: 'Stimulation (novelty, adventure)' },
  { key: 'hedonism', label: 'Hedonism (pleasure, enjoying life)' },
  { key: 'achievement', label: 'Achievement (success, getting ahead)' },
  { key: 'power', label: 'Power (influence, being in charge)' },
  { key: 'security', label: 'Security (order, safety)' },
  { key: 'conformity', label: 'Conformity (propriety, restraint)' },
  { key: 'tradition', label: 'Tradition (custom, the time-honored)' },
  { key: 'benevolence', label: 'Benevolence (caring for close others)' },
  { key: 'universalism', label: 'Universalism (fairness for all)' },
];

function scoreValues(answers: Map<string, RecordedAnswer>): ReportPayload {
  const scored: AxisResult[] = [];
  for (const v of VALUE_LABELS) {
    const items = QUESTIONS.filter((q) => q.reportKey === 'values' && q.valueKey === v.key);
    const r = traitPercent(answers, items);
    if (!r) continue;
    scored.push({ key: v.key, label: v.label, percent: r.percent, readout: `${level(r.percent)} (${r.percent}%)`, answered: r.answered });
  }
  // Show highest-priority values first — the rank order is the signal.
  scored.sort((a, b) => b.percent - a.percent);
  // Summary: the top 2-3 endorsed values, for a quick headline.
  const top = scored.filter((a) => a.percent >= 50).slice(0, 3).map((a) => a.label.split(' (')[0]);
  return {
    key: 'values',
    title: 'Core Values',
    axes: scored,
    summary: top.join(', '),
    hasData: scored.length > 0,
    caveat: SELF_REPORT_CAVEAT,
  };
}

// --- Regulatory Focus (RFQ) — two independent means (promotion, prevention),
// each 0..100. Not a single bipolar axis: a person can be high or low on both.
function scoreRegulatoryFocus(answers: Map<string, RecordedAnswer>): ReportPayload {
  const axes: AxisResult[] = [];
  for (const f of [
    { key: 'promotion', label: 'Promotion (chasing gains & ideals)' },
    { key: 'prevention', label: 'Prevention (avoiding loss, duty & safety)' },
  ] as const) {
    const items = QUESTIONS.filter((q) => q.reportKey === 'regulatory-focus' && q.focusKey === f.key);
    const r = traitPercent(answers, items);
    if (!r) continue;
    axes.push({ key: f.key, label: f.label, percent: r.percent, readout: `${level(r.percent)} (${r.percent}%)`, answered: r.answered });
  }
  const prom = axes.find((a) => a.key === 'promotion');
  const prev = axes.find((a) => a.key === 'prevention');
  const summary =
    prom && prev ? (prom.percent >= prev.percent ? 'Promotion-leaning' : 'Prevention-leaning') : '';
  return {
    key: 'regulatory-focus',
    title: 'Regulatory Focus',
    axes,
    summary,
    hasData: axes.length > 0,
    caveat: SELF_REPORT_CAVEAT,
  };
}

// --- Locus of Control (IE-4) — two independent 2-item means. --------------
function scoreLocusOfControl(answers: Map<string, RecordedAnswer>): ReportPayload {
  const axes: AxisResult[] = [];
  for (const l of [
    { key: 'internal', label: 'Internal (own effort drives outcomes)' },
    { key: 'external', label: 'External (others & fate drive outcomes)' },
  ] as const) {
    const items = QUESTIONS.filter((q) => q.reportKey === 'locus-of-control' && q.locusKey === l.key);
    const r = traitPercent(answers, items);
    if (!r) continue;
    axes.push({ key: l.key, label: l.label, percent: r.percent, readout: `${level(r.percent)} (${r.percent}%)`, answered: r.answered });
  }
  const intl = axes.find((a) => a.key === 'internal');
  const extl = axes.find((a) => a.key === 'external');
  const summary =
    intl && extl ? (intl.percent >= extl.percent ? 'Internally driven' : 'Externally driven') : '';
  return {
    key: 'locus-of-control',
    title: 'Locus of Control',
    axes,
    summary,
    hasData: axes.length > 0,
    caveat: SELF_REPORT_CAVEAT,
  };
}

/** Score a single report from a user's answers map. */
export function scoreReport(
  key: ReportKeyAll,
  answers: Map<string, RecordedAnswer>,
): ReportPayload {
  switch (key) {
    case 'big-five':
      return scoreBigFive(answers);
    case 'honesty-tone':
      return scoreHonestyTone(answers);
    case 'pcm':
      return scorePcm(answers);
    case 'mbti':
      return scoreMbti(answers);
    case 'need-for-cognition':
      return scoreNeedForCognition(answers);
    case 'values':
      return scoreValues(answers);
    case 'regulatory-focus':
      return scoreRegulatoryFocus(answers);
    case 'locus-of-control':
      return scoreLocusOfControl(answers);
  }
}

/** Score every report from a flat answer list (DB shape). */
export function scoreAllReports(answerList: ReadonlyArray<RecordedAnswer>): ReportPayload[] {
  const map = new Map(answerList.map((a) => [a.id, a]));
  return REPORT_KEYS.map((k) => scoreReport(k, map));
}

/** Which report a question feeds, if any (used to decide what to rescore). */
export function reportKeyForQuestion(questionId: string): ReportKeyAll | undefined {
  return QUESTION_BY_ID.get(questionId)?.reportKey;
}

/** Render a report as plain text for the reduce prompt's profile block. */
export function renderReportForPrompt(p: ReportPayload): string {
  if (!p.hasData) return '';
  const lines = [`### ${p.title}${p.summary ? ` — ${p.summary}` : ''}`];
  for (const ax of p.axes) lines.push(`- ${ax.label}: ${ax.readout}`);
  lines.push(`(${p.caveat})`);
  return lines.join('\n');
}
