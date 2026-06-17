import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError, type EvalResult, type EvalCondition, type MetricBundle } from '../api/client';
import { useToast } from '../components/Toaster';
import { Button, Card, cardClass, Eyebrow, Headline, Notice, Tag } from '../components/ui';

const CONDITIONS: EvalCondition[] = ['A', 'B', 'C'];

const METRICS: Array<{ key: keyof MetricBundle; label: string }> = [
  { key: 'burstinessDelta', label: 'Burstiness Δ' },
  { key: 'sentenceLengthVarianceDelta', label: 'Sentence-length variance Δ' },
  { key: 'typeTokenRatioDelta', label: 'Type-token ratio Δ' },
  { key: 'functionWordDistance', label: 'Function-word distance' },
  { key: 'charDistributionDistance', label: 'Char-distribution distance' },
];

function fmt(n: number): string {
  return n.toFixed(4);
}

// Lower is better for every metric — find which condition wins each row.
function bestCondition(agg: Record<EvalCondition, MetricBundle>, key: keyof MetricBundle): EvalCondition {
  return CONDITIONS.reduce((best, c) => (agg[c][key] < agg[best][key] ? c : best), CONDITIONS[0]);
}

export function EvalPage() {
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(null);

  const evalRun = useMutation({
    mutationFn: () => api.runEval(),
    onSuccess: () => toast('Eval complete.', 'ok'),
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Eval failed.', 'err'),
  });
  const running = evalRun.isPending;
  const result: EvalResult | null = evalRun.data?.result ?? null;

  function run() {
    evalRun.mutate();
  }

  // Tally row-wins per condition as a quick headline read.
  const wins =
    result &&
    CONDITIONS.reduce(
      (acc, c) => {
        acc[c] = METRICS.filter((m) => bestCondition(result.aggregate, m.key) === c).length;
        return acc;
      },
      { A: 0, B: 0, C: 0 } as Record<EvalCondition, number>,
    );

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[52ch]">
          <Eyebrow>The measurement</Eyebrow>
          <Headline className="mt-3">
            eval<span className="text-primary">.</span>
          </Headline>
          <p className="mt-3 max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">
            Does your <strong>soul.md</strong> spec actually beat raw text examples at making the
            model write like you? This holds out real messages of yours and scores three conditions
            against them with local stylometric metrics. A <em>relative</em> A/B signal — lower is
            closer to your real voice.
          </p>
        </div>
        <Button disabled={running} onClick={() => void run()}>
          {running ? (
            <>
              <span className="spin" /> Running…
            </>
          ) : result ? (
            'Re-run eval'
          ) : (
            'Run eval'
          )}
        </Button>
      </header>

      {running && (
        <p className="font-mono text-[12px] text-text-faint">
          Generating continuations under each condition via the local model. This can take a few
          minutes — keep this tab open.
        </p>
      )}

      {result && wins ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-faint">
              {result.n} held-out samples · {result.k} raw examples
            </span>
            {CONDITIONS.map((c) => (
              <Tag key={c} tone={wins[c] === Math.max(wins.A, wins.B, wins.C) ? 'success' : 'neutral'}>
                {c} ({result.conditionLabels[c]}): {wins[c]}/{METRICS.length}
              </Tag>
            ))}
          </div>

          <div className={cardClass('overflow-x-auto p-0')}>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="px-4 py-3 text-left font-sans font-semibold text-text-secondary">
                    Metric (lower = closer)
                  </th>
                  {CONDITIONS.map((c) => (
                    <th key={c} className="px-4 py-3 text-right font-sans font-semibold text-text-secondary">
                      {c}
                      <span className="block font-mono text-[10px] font-normal text-text-faint">
                        {result.conditionLabels[c]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const best = bestCondition(result.aggregate, m.key);
                  return (
                    <tr key={m.key} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-text-secondary">{m.label}</td>
                      {CONDITIONS.map((c) => (
                        <td
                          key={c}
                          className={
                            'px-4 py-2.5 text-right font-mono ' +
                            (c === best ? 'font-semibold text-primary' : 'text-text-primary')
                          }
                        >
                          {fmt(result.aggregate[c][m.key])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-sans text-[16px] font-semibold tracking-[-0.01em] text-text-primary">
              Per-sample breakdown
            </h2>
            {result.samples.map((s, i) => (
              <div key={i} className={cardClass('p-4')}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="truncate font-mono text-[12px] text-text-secondary">
                    “{s.prefix.slice(0, 80)}…”
                  </span>
                  <span className="font-mono text-[11px] text-text-faint">
                    {open === i ? 'hide' : 'show'}
                  </span>
                </button>
                {open === i && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-hairline pt-3">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-faint">
                        Real continuation
                      </span>
                      <p className="mt-1 text-[13px] leading-[20px] text-text-primary">
                        {s.realContinuation}
                      </p>
                    </div>
                    {CONDITIONS.map((c) => (
                      <div key={c}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-faint">
                          {c} — {result.conditionLabels[c]}
                        </span>
                        <p className="mt-1 text-[13px] leading-[20px] text-text-secondary">
                          {s.generated[c]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        !running && (
          <Notice tone="err" className="max-w-[64ch]">
            Run an eval to compare your soul.md against raw examples. You’ll need a generated{' '}
            <strong>soul.md</strong> profile and enough imported conversation history.
          </Notice>
        )
      )}
    </div>
  );
}
