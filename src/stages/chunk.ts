import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../config.js';
import { estimateTokens } from '../tokens.js';
import { QUESTIONNAIRE_PROCESSED_FILENAME } from './process.js';

export type ChunkKind = 'freeform' | 'questionnaire';

// Reserve room inside the model context window for the prompt header and the
// generated output. HEADER_RESERVE covers the largest map header (MAP_QA≈565 tok
// after the imitation-spec reframe, brief 06) plus the per-chunk file header and
// `--- name ---` separators; the chunk budget is whatever fits in `num_ctx` once
// those are subtracted. The extract.ts assertFitsContext() backstop catches any
// overflow if a header grows past this.
const HEADER_RESERVE = 768;
const OUTPUT_RESERVE = 512;

export interface ChunkEntry {
  file: string;
  sourceFiles: string[];
  estimatedTokens: number;
  kind: ChunkKind;
}

export interface Manifest {
  generatedAt: string;
  totalEstimatedTokens: number;
  chunkTargetTokens: number;
  chunks: ChunkEntry[];
}

interface FileBlock {
  name: string;
  content: string;
  tokens: number;
}

function readAllFiles(processedDir: string): FileBlock[] {
  const entries = readdirSync(processedDir).sort();
  const out: FileBlock[] = [];
  for (const name of entries) {
    const abs = path.join(processedDir, name);
    if (!statSync(abs).isFile()) continue;
    if (!/\.txt$/i.test(name)) continue;
    const content = readFileSync(abs, 'utf8');
    if (content.trim().length === 0) continue;
    out.push({ name, content, tokens: estimateTokens(content) });
  }
  return out;
}

function splitOversizedFile(block: FileBlock, targetTokens: number): FileBlock[] {
  // Line-bounded split — keep messages intact.
  const lines = block.content.split('\n');
  const parts: FileBlock[] = [];
  let buf: string[] = [];
  let bufTokens = 0;
  let partIdx = 1;
  for (const line of lines) {
    const t = estimateTokens(line + '\n');
    if (bufTokens + t > targetTokens && buf.length > 0) {
      const content = buf.join('\n') + '\n';
      parts.push({ name: `${block.name}#part${partIdx}`, content, tokens: estimateTokens(content) });
      partIdx++;
      buf = [];
      bufTokens = 0;
    }
    buf.push(line);
    bufTokens += t;
  }
  if (buf.length > 0) {
    const content = buf.join('\n');
    parts.push({ name: `${block.name}#part${partIdx}`, content, tokens: estimateTokens(content) });
  }
  return parts;
}

export function chunkAll(cfg: Config): Manifest {
  const inDir = path.resolve(cfg.inputsProcessedDir);
  const outDir = path.resolve(cfg.chunksDir);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Derive the packing budget from the model context window so chunks actually
  // fit the map call (Ollama silently truncates anything past `num_ctx`). With
  // the default 8192 ctx this clamps the 30k target down to ~7080.
  const budget = Math.min(cfg.chunkTargetTokens, cfg.ollamaNumCtx - HEADER_RESERVE - OUTPUT_RESERVE);
  if (budget < cfg.chunkTargetTokens) {
    process.stdout.write(
      `  ⚠ chunk budget clamped ${cfg.chunkTargetTokens} → ${budget} tokens ` +
        `(OLLAMA_NUM_CTX=${cfg.ollamaNumCtx} − ${HEADER_RESERVE} header − ${OUTPUT_RESERVE} output). ` +
        `Raise OLLAMA_NUM_CTX to use larger chunks.\n`,
    );
  }

  const allBlocks = readAllFiles(inDir);

  // Isolate the questionnaire file — it always gets its own chunk so the
  // extractor can apply Q&A-flavored prompting without cross-contamination
  // from chat fragments.
  const qBlocks = allBlocks.filter((b) => b.name === QUESTIONNAIRE_PROCESSED_FILENAME);
  const freeformBlocks = allBlocks.filter((b) => b.name !== QUESTIONNAIRE_PROCESSED_FILENAME);

  // Expand oversized files into parts that fit the budget.
  const expanded: FileBlock[] = [];
  for (const b of freeformBlocks) {
    if (b.tokens <= budget) {
      expanded.push(b);
    } else {
      expanded.push(...splitOversizedFile(b, budget));
    }
  }

  // First-fit packing into chunks (freeform files only).
  type ChunkBuf = { sources: string[]; bodies: string[]; tokens: number; kind: ChunkKind };
  const buckets: ChunkBuf[] = [];
  for (const b of expanded) {
    let placed = false;
    for (const bucket of buckets) {
      if (bucket.tokens + b.tokens <= budget) {
        bucket.sources.push(b.name);
        bucket.bodies.push(b.content.endsWith('\n') ? b.content : b.content + '\n');
        bucket.tokens += b.tokens;
        placed = true;
        break;
      }
    }
    if (!placed) {
      buckets.push({
        sources: [b.name],
        bodies: [b.content.endsWith('\n') ? b.content : b.content + '\n'],
        tokens: b.tokens,
        kind: 'freeform',
      });
    }
  }

  // Append questionnaire as its own bucket(s). If it ever exceeds the budget
  // we still split, but the split parts remain questionnaire-flavored.
  for (const q of qBlocks) {
    const parts =
      q.tokens <= budget ? [q] : splitOversizedFile(q, budget);
    for (const p of parts) {
      buckets.push({
        sources: [p.name],
        bodies: [p.content.endsWith('\n') ? p.content : p.content + '\n'],
        tokens: p.tokens,
        kind: 'questionnaire',
      });
    }
  }

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    totalEstimatedTokens: buckets.reduce((s, b) => s + b.tokens, 0),
    chunkTargetTokens: budget,
    chunks: [],
  };

  buckets.forEach((bucket, i) => {
    const file = `chunk-${String(i + 1).padStart(3, '0')}.txt`;
    const note =
      bucket.kind === 'questionnaire'
        ? `# This chunk is the personality questionnaire (Q&A format).`
        : `# These are my own messages only, filtered from WhatsApp exports.`;
    const header =
      `# Source files: ${bucket.sources.join(', ')}\n` +
      `# Estimated tokens: ${bucket.tokens}\n` +
      `# Kind: ${bucket.kind}\n` +
      `${note}\n\n`;
    const body = bucket.bodies
      .map((b, idx) => `--- ${bucket.sources[idx]} ---\n${b}`)
      .join('\n');
    writeFileSync(path.join(outDir, file), header + body, 'utf8');
    manifest.chunks.push({
      file,
      sourceFiles: bucket.sources,
      estimatedTokens: bucket.tokens,
      kind: bucket.kind,
    });
  });

  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
