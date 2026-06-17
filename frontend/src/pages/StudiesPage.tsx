import { Link } from 'react-router-dom';
import type { StudySummary } from '../api/client';
import { useStudies } from '../api/queries';
import { Meter } from '../components/Layout';
import { cardClass, Eyebrow, Headline, Tag } from '../components/ui';

function status(s: StudySummary): { label: string; tone: 'neutral' | 'accent' | 'success' } {
  if (s.total > 0 && s.completed >= s.total) return { label: 'Completed', tone: 'success' };
  if (s.completed > 0) return { label: 'In progress', tone: 'accent' };
  return { label: 'Not started', tone: 'neutral' };
}

function StudyCard({ s, kindLabel, index }: { s: StudySummary; kindLabel: string; index: number }) {
  const st = status(s);
  return (
    <Link
      to={`/studies/${s.id}`}
      className={cardClass('group flex flex-col p-5 transition-colors hover:border-outline')}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
          {String(index + 1).padStart(2, '0')} / {kindLabel}
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
}

export function StudiesPage() {
  const { data: studies = [], isPending: loading } = useStudies();

  const voice = studies.filter((s) => s.band !== 'profile');
  const profile = studies.filter((s) => s.band === 'profile');

  return (
    <div className="flex flex-col gap-section">
      <header className="max-w-[60ch]">
        <Eyebrow>The studies</Eyebrow>
        <Headline className="mt-3">Tell us about yourself</Headline>
        <p className="mt-3 max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">
          A few short prompts that help build your voice profile. Answer in whatever language feels
          natural — prompts are shown in English or Romanian. Partial answers are saved; come back any
          time.
        </p>
      </header>

      {loading ? (
        <p className="font-mono text-[12px] text-text-faint">Loading…</p>
      ) : (
        <div className="flex flex-col gap-section">
          {voice.length > 0 && (
            <section>
              <div className="max-w-[60ch] border-b border-hairline pb-3">
                <Eyebrow>Written response</Eyebrow>
                <p className="mt-2 text-[13px] leading-[20px] text-text-secondary">
                  Open-ended prompts — you write in your own words. Each answer doubles as a writing
                  sample for your voice profile.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {voice.map((s, i) => (
                  <StudyCard key={s.id} s={s} index={i} kindLabel="Written" />
                ))}
              </div>
            </section>
          )}

          {profile.length > 0 && (
            <section>
              <div className="max-w-[60ch] border-b border-hairline pb-3">
                <Eyebrow>Multiple choice</Eyebrow>
                <p className="mt-2 text-[13px] leading-[20px] text-text-secondary">
                  Quick self-ratings inspired by well-known personality questionnaires. They produce a
                  scored trait sketch — no writing required.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {profile.map((s, i) => (
                  <StudyCard key={s.id} s={s} index={i} kindLabel="Profile" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
