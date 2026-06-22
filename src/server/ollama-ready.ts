// Process-global, TTL-cached Ollama readiness ping. Host/model are server-wide
// (not per-user), so one cached result serves every page load; concurrent loads
// share a single in-flight ping. 30s TTL is short enough to reflect "I just
// started Ollama" without re-pinging on every request. Used by the results and
// swipe routes to gate their Generate buttons.

import type { Config } from '../config.js';
import { pingOllama, type PingResult } from '../ollama.js';

const READY_TTL_MS = 30_000;
let readyCache: { at: number; result: PingResult } | null = null;
let readyInflight: Promise<PingResult> | null = null;

export async function getOllamaReady(cfg: Config): Promise<PingResult> {
  const now = Date.now();
  if (readyCache && now - readyCache.at < READY_TTL_MS) return readyCache.result;
  if (readyInflight) return readyInflight;
  readyInflight = pingOllama({ host: cfg.ollamaHost, model: cfg.ollamaModel, apiKey: cfg.ollamaApiKey })
    .then((result) => {
      readyCache = { at: Date.now(), result };
      return result;
    })
    .finally(() => {
      readyInflight = null;
    });
  return readyInflight;
}
