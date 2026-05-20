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
const BRACKETED = /^\[[^\]]+\]\s+([^:]+?):\s?(.*)$/;
const DASHED = /^[\d/.\-: ,APMapm]+\s-\s([^:]+?):\s?(.*)$/;

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

export interface ProcessStats {
  filesProcessed: number;
  totalLinesIn: number;
  myLinesIn: number;
  linesOut: number;
  duplicatesDropped: number;
  questionnaireAnswers: number;
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

interface ParsedLine {
  sender: string;
  body: string;
}

function parseLine(raw: string): ParsedLine | null {
  const m = raw.match(BRACKETED) ?? raw.match(DASHED);
  if (!m) return null;
  return { sender: m[1].trim(), body: m[2] };
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

  const stats: ProcessStats = {
    filesProcessed: 0,
    totalLinesIn: 0,
    myLinesIn: 0,
    linesOut: 0,
    duplicatesDropped: 0,
    questionnaireAnswers: 0,
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

    for (const line of lines) {
      stats.totalLinesIn++;
      const parsed = parseLine(line);
      if (parsed) {
        const mine = myNames.has(parsed.sender);
        lastWasMine = mine;
        if (!mine) continue;
        stats.myLinesIn++;
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
  }

  processQuestionnaire(cfg, stats);

  if (stats.filesProcessed === 0) {
    throw new Error(
      `No inputs found. Add WhatsApp exports under ${inDir} or run \`npm run start -- --interview\` first.`,
    );
  }

  return stats;
}
