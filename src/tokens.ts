// Rough token estimate: ~4 BYTES per token for English/Romanian mixed chat text.
// Cheap, deterministic, no tokenizer dep. Good enough for chunk sizing.
//
// Byte length, not char length: BPE tokenizers operate on UTF-8 bytes, so a
// Romanian diacritic (ăâîșț, 2 bytes) or an emoji (4 bytes) costs more than one
// ASCII char's worth of token budget. Counting bytes makes the estimate
// conservative (slightly larger) for diacritic/emoji-heavy text — the safe
// direction, since undercounting risks silent Ollama truncation past num_ctx.
// Pure ASCII is unchanged (1 byte/char). See decisions.md (heuristic stays; no
// gpt-tokenizer dep — its BPE doesn't match Llama's).
export function estimateTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}
