import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import type { Config } from "../config.js";

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
  };

  let entries: string[];
  try {
    entries = readdirSync(inDir);
  } catch {
    throw new Error(`Freeform inputs dir not found: ${inDir}`);
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

  return stats;
}
