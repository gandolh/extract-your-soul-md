import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import type { Config } from "../config.js";

export const QUESTIONNAIRE_PROCESSED_FILENAME = "__questionnaire__.txt";
export const QUESTIONNAIRE_MARKER = "# QUESTIONNAIRE";

// WhatsApp export line, e.g.:
//   [15/03/24, 21:42:11] Gandolh: hey what's up
//   [3/15/24, 9:42:11 PM] Cristian: hey
// Also handles the variant without brackets used on some Android exports:
//   15/03/24, 21:42 - Gandolh: hey
export const BRACKETED = /^\[[^\]]+\]\s+([^:]+?):\s?(.*)$/;
export const DASHED = /^[\d/.\-: ,APMapm]+\s-\s([^:]+?):\s?(.*)$/;

/** Does this text look like a WhatsApp export? Samples the first ~50 non-empty
 *  lines; true if any matches a known line format. */
export function looksLikeWhatsAppExport(content: string): boolean {
  const sample = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 50);
  return sample.some((l) => BRACKETED.test(l) || DASHED.test(l));
}

const URL_RE = /\bhttps?:\/\/\S+/gi;
const MEDIA_PLACEHOLDERS = [
  "<Media omitted>",
  "<media omitted>",
  "image omitted",
  "video omitted",
  "audio omitted",
  "sticker omitted",
  "GIF omitted",
  "document omitted",
  "Contact card omitted",
  "This message was deleted",
  "You deleted this message",
  "null",
];

export interface SourceStats {
  filename: string;
  parsedSenders: string[]; // distinct normalized senders seen in this file
  myLinesIn: number; // lines that matched one of the user's names
  linesOut: number; // kept after noise/dup filtering
}

export interface ProcessStats {
  filesProcessed: number;
  totalLinesIn: number;
  myLinesIn: number;
  linesOut: number;
  duplicatesDropped: number;
  questionnaireAnswers: number;
  perSource: SourceStats[];
}

interface ParsedQA {
  id: string;
  title: string;
  body: string;
}

function parseQuestionnaire(raw: string): ParsedQA[] {
  const out: ParsedQA[] = [];
  const headerRe = /^##\s+(Q\d+)\s+—\s+(.+)$/;
  const lines = raw.split(/\r?\n/);
  let current: { id: string; title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (current) {
        out.push({
          id: current.id,
          title: current.title,
          body: current.lines.join("\n").trim(),
        });
      }
      current = { id: m[1], title: m[2].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) {
    out.push({
      id: current.id,
      title: current.title,
      body: current.lines.join("\n").trim(),
    });
  }
  return out.filter((qa) => qa.body.length > 0 && qa.body.toLowerCase() !== "[skipped]");
}

function processQuestionnaire(cfg: Config, stats: ProcessStats): void {
  const filePath = path.resolve(cfg.questionnaireDir, cfg.questionnaireFile);
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  const answered = parseQuestionnaire(raw);
  if (answered.length === 0) return;

  const outDir = path.resolve(cfg.inputsProcessedDir);
  mkdirSync(outDir, { recursive: true });

  const header =
    `${QUESTIONNAIRE_MARKER}\n` +
    `# These are answers to an open-ended personality / voice questionnaire.\n` +
    `# Each \`## Qn — Title\` block is one question and the user's free-text answer.\n` +
    `# Treat each answer as BOTH content (beliefs, values, narrative arcs) and a voice sample.\n` +
    `\n`;

  const body = answered
    .map((qa) => `## ${qa.id} — ${qa.title}\n\n${qa.body}\n`)
    .join("\n");

  writeFileSync(
    path.join(outDir, QUESTIONNAIRE_PROCESSED_FILENAME),
    header + body,
    "utf8",
  );

  stats.filesProcessed += 1;
  stats.questionnaireAnswers = answered.length;
}

// Normalize a display name for matching the user's own messages. The voice
// filter is load-bearing, so a mis-cased name, a WhatsApp `~` group prefix, or a
// stray bidi/zero-width mark must NOT silently drop every message. Normalize,
// then exact-match — no fuzzy/substring (that risks false self-matches).
export function normalizeName(s: string): string {
  return s
    .trim()
    .replace(/^~\s*/, '') // WhatsApp group-participant prefix
    .replace(/[​-‏﻿]/g, '') // zero-width + bidi marks (ZWSP..RLM, BOM)
    .normalize('NFC')
    .toLowerCase()
    .trim();
}

interface ParsedLine {
  sender: string;
  body: string;
}

function parseLine(raw: string): ParsedLine | null {
  const m = raw.match(BRACKETED) ?? raw.match(DASHED);
  if (!m) return null;
  return { sender: m[1].trim(), body: m[2] };
}

export interface DetectedSender {
  name: string; // most frequent raw spelling for this person
  normalized: string; // normalizeName() key the voice filter matches on
  count: number; // total messages across all raw spellings of this key
}

/** Detect who appears as a sender in a WhatsApp export, grouped by the same
 *  normalized key the voice filter uses. Names-independent — works before the
 *  user has set any names, so the UI can offer "add this name" chips. */
export function detectSenders(content: string): DetectedSender[] {
  // key -> { count, rawCounts: spelling -> n }
  const groups = new Map<string, { count: number; rawCounts: Map<string, number> }>();
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const key = normalizeName(parsed.sender);
    if (key.length === 0) continue;
    const g = groups.get(key) ?? { count: 0, rawCounts: new Map() };
    g.count += 1;
    g.rawCounts.set(parsed.sender, (g.rawCounts.get(parsed.sender) ?? 0) + 1);
    groups.set(key, g);
  }
  const out: DetectedSender[] = [];
  for (const [normalized, g] of groups) {
    // Pick the most frequent raw spelling as the display label.
    let name = normalized;
    let best = -1;
    for (const [raw, n] of g.rawCounts) {
      if (n > best) {
        best = n;
        name = raw;
      }
    }
    out.push({ name, normalized, count: g.count });
  }
  return out.sort((a, b) => b.count - a.count);
}

function isNoise(body: string, cfg: Config): boolean {
  let s = body.trim();
  if (
    cfg.dropMediaPlaceholders &&
    MEDIA_PLACEHOLDERS.some((p) => s.includes(p))
  )
    return true;
  if (cfg.dropUrls) s = s.replace(URL_RE, "").trim();
  if (s.length < cfg.minMessageLength) return true;
  return false;
}

function cleanBody(body: string, cfg: Config): string {
  let s = body;
  if (cfg.dropUrls) s = s.replace(URL_RE, "").trim();
  return s.replace(/\s+/g, " ").trim();
}

export function processAll(cfg: Config, myNames: Set<string>): ProcessStats {
  const inDir = path.resolve(cfg.inputsFreeformDir);
  const outDir = path.resolve(cfg.inputsProcessedDir);
  mkdirSync(outDir, { recursive: true });

  // Normalize the "you" names once so matching is caller-proof and consistent
  // with how each sender is normalized at the compare site below.
  const normalizedNames = new Set([...myNames].map(normalizeName));

  const stats: ProcessStats = {
    filesProcessed: 0,
    totalLinesIn: 0,
    myLinesIn: 0,
    linesOut: 0,
    duplicatesDropped: 0,
    questionnaireAnswers: 0,
    perSource: [],
  };

  let entries: string[] = [];
  try {
    entries = readdirSync(inDir);
  } catch {
    // No freeform dir is OK if the user is questionnaire-only.
  }

  const seen = new Set<string>();

  for (const name of entries) {
    const abs = path.join(inDir, name);
    if (!statSync(abs).isFile()) continue;
    if (!/\.(txt|md)$/i.test(name)) continue;

    const raw = readFileSync(abs, "utf8");
    const lines = raw.split(/\r?\n/);

    const kept: string[] = [];
    // Track continuation: WhatsApp messages can span lines (newline within message body).
    let lastWasMine = false;
    // Per-source diagnostics so the web layer can surface a names mismatch.
    const sendersSeen = new Set<string>();
    let myLinesInFile = 0;

    for (const line of lines) {
      stats.totalLinesIn++;
      const parsed = parseLine(line);
      if (parsed) {
        const normSender = normalizeName(parsed.sender);
        sendersSeen.add(normSender);
        const mine = normalizedNames.has(normSender);
        lastWasMine = mine;
        if (!mine) continue;
        stats.myLinesIn++;
        myLinesInFile++;
        if (isNoise(parsed.body, cfg)) continue;
        const cleaned = cleanBody(parsed.body, cfg);
        const key = cleaned.toLowerCase();
        if (seen.has(key)) {
          stats.duplicatesDropped++;
          continue;
        }
        seen.add(key);
        kept.push(cleaned);
        stats.linesOut++;
      } else if (lastWasMine && line.trim().length > 0) {
        // Continuation of my previous message — append to last kept line.
        if (kept.length === 0) continue;
        const merged = (kept[kept.length - 1] + " " + line.trim())
          .replace(/\s+/g, " ")
          .trim();
        const cleaned = cleanBody(merged, cfg);
        // Replace last entry with merged version (don't double-count seen).
        kept[kept.length - 1] = cleaned;
      }
    }

    const outPath = path.join(outDir, name.replace(/\.md$/i, ".txt"));
    writeFileSync(outPath, kept.join("\n") + (kept.length ? "\n" : ""), "utf8");
    stats.filesProcessed++;
    stats.perSource.push({
      filename: name,
      parsedSenders: [...sendersSeen],
      myLinesIn: myLinesInFile,
      linesOut: kept.length,
    });
  }

  processQuestionnaire(cfg, stats);

  if (stats.filesProcessed === 0) {
    throw new Error(
      `No inputs found under ${inDir}. Import a conversation or answer at least one study first.`,
    );
  }

  return stats;
}
