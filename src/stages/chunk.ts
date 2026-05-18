import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../config.js';
import { estimateTokens } from '../tokens.js';

export interface ChunkEntry {
  file: string;
  sourceFiles: string[];
  estimatedTokens: number;
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

  const blocks = readAllFiles(inDir);

  // Expand oversized files into parts that fit the budget.
  const expanded: FileBlock[] = [];
  for (const b of blocks) {
    if (b.tokens <= cfg.chunkTargetTokens) {
      expanded.push(b);
    } else {
      expanded.push(...splitOversizedFile(b, cfg.chunkTargetTokens));
    }
  }

  // First-fit packing into chunks.
  type ChunkBuf = { sources: string[]; bodies: string[]; tokens: number };
  const buckets: ChunkBuf[] = [];
  for (const b of expanded) {
    let placed = false;
    for (const bucket of buckets) {
      if (bucket.tokens + b.tokens <= cfg.chunkTargetTokens) {
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
      });
    }
  }

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    totalEstimatedTokens: expanded.reduce((s, b) => s + b.tokens, 0),
    chunkTargetTokens: cfg.chunkTargetTokens,
    chunks: [],
  };

  buckets.forEach((bucket, i) => {
    const file = `chunk-${String(i + 1).padStart(3, '0')}.txt`;
    const header =
      `# Source files: ${bucket.sources.join(', ')}\n` +
      `# Estimated tokens: ${bucket.tokens}\n` +
      `# These are my own messages only, filtered from WhatsApp exports.\n\n`;
    const body = bucket.bodies
      .map((b, idx) => `--- ${bucket.sources[idx]} ---\n${b}`)
      .join('\n');
    writeFileSync(path.join(outDir, file), header + body, 'utf8');
    manifest.chunks.push({ file, sourceFiles: bucket.sources, estimatedTokens: bucket.tokens });
  });

  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
