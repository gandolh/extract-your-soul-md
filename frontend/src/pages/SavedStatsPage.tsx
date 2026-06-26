import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useDeleteSavedStat, useSavedStat, useSavedStats } from '../api/queries';
import { useToast } from '../components/app/Toaster';
import { Eyebrow, Headline, Notice } from '../components/ui';
import { cardClass } from '../components/ui/Card';
import { cx } from '../components/ui/cx';
import { StatsDashboard } from '../components/stats/StatsDashboard';

function savedAgo(createdAt: string): string {
  // SQLite stores datetime('now') as a space-separated UTC string; append 'Z'.
  const d = new Date(createdAt + 'Z');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export function SavedStatsPage() {
  const toast = useToast();
  const { data: saved = [], isLoading } = useSavedStats();
  const del = useDeleteSavedStat();

  function remove(id: number, name: string) {
    if (!window.confirm(`Delete saved result “${name}”?`)) return;
    del.mutate(id, {
      onSuccess: () => toast('Deleted.', 'ok'),
      onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not delete.', 'err'),
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-section">
      <header className="flex flex-col gap-3">
        <Eyebrow>Saved statistics</Eyebrow>
        <Headline>Your saved results</Headline>
        <p className="text-[14px] leading-[22px] text-text-secondary">
          Statistics you’ve kept from analyzed conversations. The conversations themselves were
          never stored — only these numbers.{' '}
          <Link to="/stats" className="text-primary hover:underline">
            Analyze another →
          </Link>
        </p>
      </header>

      {isLoading && <p className="font-mono text-[13px] text-text-faint">Loading…</p>}

      {!isLoading && saved.length === 0 && (
        <Notice tone="ok">
          Nothing saved yet. Analyze a conversation and hit “Save statistics” to keep a result here.
        </Notice>
      )}

      {saved.length > 0 && (
        <ul className="flex flex-col gap-3">
          {saved.map((s) => (
            <li key={s.id} className={cardClass('flex items-center gap-4 p-4')}>
              <Link to={`/saved-stats/${s.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-sans text-[15px] font-semibold text-text-primary">
                  {s.name}
                </span>
                <span className="font-mono text-[11px] text-text-faint">saved {savedAgo(s.created_at)}</span>
              </Link>
              <Link
                to={`/saved-stats/${s.id}`}
                className="font-mono text-[12px] uppercase tracking-[0.05em] text-primary hover:underline"
              >
                View
              </Link>
              <button
                type="button"
                onClick={() => remove(s.id, s.name)}
                className="font-mono text-[12px] uppercase tracking-[0.05em] text-text-faint hover:text-text-primary"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SavedStatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error } = useSavedStat(id);

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-section">
      <Link
        to="/saved-stats"
        className={cx('self-start font-mono text-[12px] uppercase tracking-[0.05em] text-text-secondary hover:text-text-primary')}
      >
        ← All saved
      </Link>

      {isLoading && <p className="font-mono text-[13px] text-text-faint">Loading…</p>}
      {error && (
        <Notice>{error instanceof ApiError ? error.message : 'Could not load this result.'}</Notice>
      )}

      {data && (
        <>
          <header className="flex flex-col gap-2">
            <Eyebrow>Saved result</Eyebrow>
            <Headline>{data.name}</Headline>
            <p className="font-mono text-[11px] text-text-faint">saved {savedAgo(data.createdAt)}</p>
          </header>
          <StatsDashboard stats={data.stats} />
        </>
      )}
    </div>
  );
}
