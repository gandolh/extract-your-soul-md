import { ApiError, type ReportState, type ReportKey } from '../api/client';
import { useSetReportInclude } from '../api/queries';
import { useToast } from './Toaster';
import { cardClass, cx } from './ui';

// Renders any scored trait report (Big Five, Stance & Tone, First Reaction,
// Type Indicator, Need for Cognition, Core Values, Regulatory Focus, Locus of
// Control) as labeled percentage bars, plus the per-report "include in soul.md"
// toggle. The component is shape-agnostic — it maps over `payload.axes`, so a
// new report type needs no change here. Percentages are shown verbatim so a 52%
// lean never reads like a confident result.

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-sm bg-hairline">
      <div
        className="h-full rounded-sm bg-primary-strong transition-[width]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function ReportSection({
  report,
  onToggle,
}: {
  report: ReportState;
  // Optional: the parent may observe the include change. The reports query is
  // invalidated by the mutation regardless, so state stays correct without it.
  onToggle?: (key: ReportKey, include: boolean) => void;
}) {
  const toast = useToast();
  const setInclude = useSetReportInclude();
  const busy = setInclude.isPending;
  const p = report.payload;

  function toggle() {
    const next = !report.includeInSoul;
    setInclude.mutate(
      { key: report.key, includeInSoul: next },
      {
        onSuccess: () => onToggle?.(report.key, next),
        onError: (err) =>
          toast(err instanceof ApiError ? err.message : 'Could not update.', 'err'),
      },
    );
  }

  if (!p || !p.hasData) {
    return (
      <div className={cardClass('p-6')}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
            Your result
          </span>
        </div>
        <p className="mt-2 text-[13px] text-text-faint">
          Answer the questions above to see your {p?.title ?? 'result'}.
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass('p-6')}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
            Your result
          </span>
          {p.summary && (
            <span className="font-mono text-[15px] font-bold tracking-[0.12em] text-text-primary">
              {p.summary}
            </span>
          )}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-text-secondary">
          <input
            type="checkbox"
            checked={report.includeInSoul}
            disabled={busy}
            onChange={() => void toggle()}
            className="h-3.5 w-3.5 accent-[var(--color-primary-strong,currentColor)]"
          />
          Include in soul.md
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {p.axes.map((ax) => (
          <div key={ax.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-text-primary">{ax.label}</span>
              <span className="font-mono text-[11px] text-text-secondary">{ax.readout}</span>
            </div>
            {/* PCM is a single dominant frame, not a spectrum — no bar. */}
            {p.key !== 'pcm' && <Bar percent={ax.percent} />}
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12px] italic leading-[18px] text-text-faint">{p.caveat}</p>
    </div>
  );
}
