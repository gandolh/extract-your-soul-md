// Rough token estimate: ~4 chars per token for English/Romanian mixed chat text.
// Cheap, deterministic, no tokenizer dep. Good enough for chunk sizing.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
