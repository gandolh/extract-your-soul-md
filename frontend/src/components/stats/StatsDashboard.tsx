// Renders a computed ConversationStats bundle. Used by both the live analyze
// page and the saved-result detail view, so the two read identically. Charts
// are plain CSS bars — no charting dependency, no LLM, just the numbers.

import { type ConversationStats } from '../../api/client';
import { Card, Eyebrow } from '../ui';
import { cx } from '../ui/cx';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Response time arrives as a (possibly fractional) number of minutes. Show it in
// the unit that reads cleanly rather than e.g. "148m" or a raw minute count.
function fmtDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

// Top participant gets the strong accent; the second a washed-out one; any
// further participants share a neutral tone. Keeps the existing palette.
function barTone(index: number): string {
  if (index === 0) return 'bg-primary-strong';
  if (index === 1) return 'bg-primary/40';
  return 'bg-text-faint/50';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">{label}</span>
      <span className="font-sans text-[20px] font-semibold tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

export function StatsDashboard({ stats }: { stats: ConversationStats }) {
  const { participants, messagesPerMonth } = stats;
  const maxMonthly = Math.max(
    1,
    ...messagesPerMonth.series.flatMap((s) => s.counts),
  );

  return (
    <div className="flex flex-col gap-section">
      {/* Overview tiles */}
      <Card className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Messages" value={stats.totalMessages.toLocaleString()} />
        <Stat label="People" value={String(stats.participantCount)} />
        <Stat
          label="From"
          value={stats.dateRange ? fmtDate(stats.dateRange.start) : '—'}
        />
        <Stat label="To" value={stats.dateRange ? fmtDate(stats.dateRange.end) : '—'} />
      </Card>

      {/* Per-participant comparison */}
      <section className="flex flex-col gap-3">
        <Eyebrow as="h2">Per person</Eyebrow>
        <div className="grid gap-4 sm:grid-cols-2">
          {participants.map((p, i) => (
            <Card key={p.name} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span aria-hidden className={cx('h-2.5 w-2.5 rounded-full', barTone(i))} />
                <span className="truncate font-sans text-[15px] font-semibold text-text-primary">{p.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Messages" value={p.messageCount.toLocaleString()} />
                <Stat label="Words" value={p.wordCount.toLocaleString()} />
                <Stat label="Avg reply" value={fmtDuration(p.avgResponseMinutes)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">Top words</span>
                {p.topWords.length === 0 ? (
                  <span className="font-mono text-[12px] text-text-faint">—</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {p.topWords.map((w) => (
                      <li
                        key={w.word}
                        className="rounded-sm bg-primary-wash px-2 py-0.5 font-mono text-[12px] text-primary"
                      >
                        {w.word} <span className="text-text-faint">·{w.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Messages per month */}
      {messagesPerMonth.months.length > 0 && (
        <section className="flex flex-col gap-3">
          <Eyebrow as="h2">Messages per month</Eyebrow>
          <Card className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {messagesPerMonth.months.map((month, mi) => (
                <li key={month} className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] text-text-secondary">{month}</span>
                  <div className="flex flex-col gap-1">
                    {messagesPerMonth.series.map((s, si) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="h-3 flex-1 overflow-hidden rounded-sm bg-primary-wash">
                          <div
                            className={cx('h-full rounded-sm transition-[width] duration-500', barTone(si))}
                            style={{ width: `${(s.counts[mi] / maxMonthly) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-text-faint">
                          {s.counts[mi]}
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4 border-t border-hairline pt-3">
              {messagesPerMonth.series.map((s, si) => (
                <span key={s.name} className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary">
                  <span aria-hidden className={cx('h-2.5 w-2.5 rounded-full', barTone(si))} />
                  {s.name}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Red flags */}
      <section className="flex flex-col gap-3">
        <Eyebrow as="h2">Patterns &amp; red flags</Eyebrow>
        <Card>
          <ul className="flex flex-col gap-2">
            {stats.redFlags.map((flag, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-[22px] text-text-secondary">
                <span aria-hidden className="text-primary">›</span>
                {flag}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
