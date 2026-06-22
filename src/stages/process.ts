import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import type { Config } from "../config.js";

export const QUESTIONNAIRE_PROCESSED_FILENAME = "__questionnaire__.txt";
export const QUESTIONNAIRE_MARKER = "# QUESTIONNAIRE";

export interface ProcessStats {
  filesProcessed: number;
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

/**
 * Stage 1 — the only input source is the questionnaire (the studies forms plus
 * the swipe-card statements the user confirmed, both materialized into
 * `answers.md` upstream). Parses that file into `processed/__questionnaire__.txt`
 * and throws if there is nothing to process.
 */
export function processAll(cfg: Config): ProcessStats {
  const stats: ProcessStats = { filesProcessed: 0, questionnaireAnswers: 0 };

  processQuestionnaire(cfg, stats);

  if (stats.filesProcessed === 0) {
    throw new Error(
      `No questionnaire answers found under ${path.resolve(cfg.questionnaireDir)}. ` +
        `Answer at least one study first.`,
    );
  }

  return stats;
}
