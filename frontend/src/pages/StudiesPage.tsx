import { Link } from 'react-router-dom';
import type { StudySummary } from '../api/client';
import { useStudies } from '../api/queries';
import { Meter } from '../components/Layout';
import { STUDY_ORDER } from '../studyOrder';
import { cardClass, cx, Eyebrow, Headline, Tag } from '../components/ui';

// Global 1-based number for a study, matching StudyPage's "Study NN / total"
// counter (both read STUDY_ORDER) so the same study reads the same everywhere.
function studyNumber(id: string): number {
  const i = STUDY_ORDER.indexOf(id);
  return i >= 0 ? i + 1 : 0;
}

function status(s: StudySummary): { label: string; tone: 'neutral' | 'accent' | 'success' } {
  if (s.total > 0 && s.completed >= s.total) return { label: 'Completed', tone: 'success' };
  if (s.completed > 0) return { label: 'In progress', tone: 'accent' };
  return { label: 'Not started', tone: 'neutral' };
}

function StudyCard({
  s,
  number,
  total,
  startHere,
}: {
  s: StudySummary;
  number: number;
  total: number;
  startHere?: boolean;
}) {
  const st = status(s);
  // Highlight the entry point only while it's untouched — once the user has
  // started anywhere, the "start here" cue has done its job.
  const showStart = startHere && st.label === 'Not started';
  return (
    <Link
      to={`/studies/${s.id}`}
      className={cardClass(
        cx(
          'group flex flex-col p-5 transition-colors hover:border-outline',
          showStart && 'border-primary-strong',
        ),
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
          Study {String(number).padStart(2, '0')} / {total}
          {showStart && <span className="text-primary">· Start here</span>}
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
  const total = STUDY_ORDER.length;
  // The first study in canonical order gets a "Start here" cue so a first-timer
  // facing seven equal cards knows where to begin.
  const firstId = STUDY_ORDER[0];

  return (
    <div className="flex flex-col gap-section">
      <header className="max-w-[60ch]">
        <Eyebrow>The studies</Eyebrow>
        <Headline className="mt-3">Tell us about yourself</Headline>
        <p className="mt-3 max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">
          A few short prompts that help build your voice profile. Answer in your own words — there
          is no right length. Partial answers are saved; come back any time.
        </p>
      </header>

      {loading ? (
        <p className="font-mono text-[12px] text-text-faint">Loading…</p>
      ) : (
        <div className="flex flex-col gap-section">
          {voice.length > 0 && (
            <section>
              <div className="max-w-[60ch] border-b border-hairline pb-3">
                <Eyebrow as="h2">Written response</Eyebrow>
                <p className="mt-2 text-[13px] leading-[20px] text-text-secondary">
                  Open-ended prompts — you write in your own words. Each answer doubles as a writing
                  sample for your voice profile.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {voice.map((s) => (
                  <StudyCard
                    key={s.id}
                    s={s}
                    number={studyNumber(s.id)}
                    total={total}
                    startHere={s.id === firstId}
                  />
                ))}
              </div>
            </section>
          )}

          {profile.length > 0 && (
            <section>
              <div className="max-w-[60ch] border-b border-hairline pb-3">
                <Eyebrow as="h2">Multiple choice</Eyebrow>
                <p className="mt-2 text-[13px] leading-[20px] text-text-secondary">
                  Quick self-ratings inspired by well-known personality questionnaires. They produce a
                  scored trait sketch — no writing required.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {profile.map((s) => (
                  <StudyCard
                    key={s.id}
                    s={s}
                    number={studyNumber(s.id)}
                    total={total}
                    startHere={s.id === firstId}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
