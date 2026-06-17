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
export const REPORT_KEYS: ReportKeyAll[] = ['big-five', 'honesty-tone', 'pcm', 'mbti'];

// Whether a report is included in soul.md by default. MBTI is off (its
// psychometric validity is weak — see brief 37); the rest are on.
export const DEFAULT_INCLUDE: Record<ReportKeyAll, boolean> = {
  'big-five': true,
  'honesty-tone': true,
  pcm: true,
  mbti: false,
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

// honesty-tone axes are independent bipolar self-descriptions. Each is one
// scale item; percent = toward the RIGHT pole. We label both poles in readout.
const HONESTY_TONE_AXES: Array<{ id: string; key: string; label: string; left: string; right: string }> = [
  { id: 'Q23', key: 'modesty', label: 'Self-presentation', left: 'Modest', right: 'Self-promoting' },
  { id: 'Q24', key: 'rapport', label: 'Rapport vs. report', left: 'Connect', right: 'Inform' },
  { id: 'Q25', key: 'formality', label: 'Formality', left: 'Casual', right: 'Formal' },
  { id: 'Q26', key: 'seriousness', label: 'Seriousness', left: 'Playful', right: 'Serious' },
  { id: 'Q27', key: 'irreverence', label: 'Irreverence', left: 'Respectful', right: 'Irreverent' },
  { id: 'Q28', key: 'enthusiasm', label: 'Energy', left: 'Matter-of-fact', right: 'Enthusiastic' },
];

function scoreHonestyTone(answers: Map<string, RecordedAnswer>): ReportPayload {
  const axes: AxisResult[] = [];
  for (const a of HONESTY_TONE_AXES) {
    const v = scaleValue(answers, a.id);
    if (v === null) continue;
    const percent = Math.round(((v - 1) / 4) * 100);
    // Read out as a lean toward whichever pole the answer favors.
    const lean = percent === 50 ? `Balanced` : percent > 50 ? `${a.right} (${percent}%)` : `${a.left} (${100 - percent}%)`;
    axes.push({ key: a.key, label: a.label, percent, readout: lean, answered: 1 });
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
