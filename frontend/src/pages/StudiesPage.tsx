import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StudySummary } from '../api/client';
import { Meter } from '../components/Layout';
import { Eyebrow, Headline, Tag } from '../components/ui';

function status(s: StudySummary): { label: string; tone: 'neutral' | 'accent' | 'success' } {
  if (s.total > 0 && s.completed >= s.total) return { label: 'Completed', tone: 'success' };
  if (s.completed > 0) return { label: 'In progress', tone: 'accent' };
  return { label: 'Not started', tone: 'neutral' };
}

export function StudiesPage() {
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.studies().then((r) => setStudies(r.studies)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-section">
      <header className="max-w-[60ch]">
        <Eyebrow>The studies</Eyebrow>
        <Headline className="mt-3">Self-report instruments</Headline>
        <p className="mt-3 max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">
          Complete these diagnostic panels to generate a comprehensive baseline profile. Answer in
          whatever language feels natural — prompts are shown in English or Romanian. Partial answers
          are saved; come back any time.
        </p>
      </header>

      {loading ? (
        <p className="font-mono text-[12px] text-text-faint">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {studies.map((s, i) => {
            const st = status(s);
            return (
              <Link
                key={s.id}
                to={`/studies/${s.id}`}
                className="group flex flex-col rounded-md border border-hairline bg-surface-card p-5 shadow-card transition-colors hover:border-outline"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
                    {String(i + 1).padStart(2, '0')} / Study
                  </span>
                  <span className="font-mono text-text-faint transition-colors group-hover:text-primary">→</span>
                </div>
                <h3 className="mt-3 font-sans text-[20px] font-semibold leading-[26px] tracking-[-0.01em] text-text-primary">
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-[18px] text-text-secondary">{s.description}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex-1">
                    <Meter completed={s.completed} total={s.total} />
                  </div>
                  <Tag tone={st.tone}>{st.label}</Tag>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
