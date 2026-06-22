import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, type AnswersStudy } from '../api/client';
import { useAnswers, useSaveStudy } from '../api/queries';
import { useToast } from '../components/app/Toaster';
import { Button, Eyebrow, Headline, Notice } from '../components/ui';
import { QuestionCard } from '../components/studies/QuestionCard';

// SQLite stores updated_at as a space-separated UTC string; append 'Z' (V8 is
// lenient, same trick the Results page uses) and render a coarse relative time.
function editedAgo(updatedAt: string): string {
  const t = new Date(updatedAt + 'Z').getTime();
  if (Number.isNaN(t)) return '';
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'edited today';
  if (days === 1) return 'edited yesterday';
  if (days < 30) return `edited ${days} days ago`;
  return `edited ${new Date(updatedAt + 'Z').toLocaleDateString()}`;
}

export function AnswersPage() {
  const toast = useToast();
  const { data: studies = [], isLoading } = useAnswers();
  const saveStudy = useSaveStudy();

  // Edits as overrides on top of the fetched savedBody — avoids re-seeding when
  // the query refetches. Displayed body = edits[qid] ?? savedBody.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bodyOf = (qid: string, savedBody: string) => edits[qid] ?? savedBody;

  // Which studies have at least one changed answer (so we only save those).
  const dirtyStudies = useMemo(() => {
    const dirty: AnswersStudy[] = [];
    for (const s of studies) {
      if (s.questions.some((q) => q.id in edits && edits[q.id] !== q.savedBody)) dirty.push(s);
    }
    return dirty;
  }, [studies, edits]);

  async function save() {
    if (dirtyStudies.length === 0) return;
    setBusy(true);
    try {
      await Promise.all(
        dirtyStudies.map((s) =>
          // Send the whole study's answered set with current bodies; the per-study
          // endpoint replaces by question id, so untouched answers are preserved.
          saveStudy.mutateAsync({
            id: s.id,
            answers: s.questions.map((q) => ({ id: q.id, body: bodyOf(q.id, q.savedBody) })),
          }),
        ),
      );
      setEdits({});
      toast('Answers updated.', 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save.', 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-section">
      <header className="flex flex-col gap-3">
        <Eyebrow>Your answers</Eyebrow>
        <Headline>Everything you’ve said</Headline>
        <p className="text-[14px] leading-[22px] text-text-secondary">
          Every answer you’ve given, in one place and editable. People change — revisit these any
          time, and re-generate your profile when you do. Edits don’t touch{' '}
          <code className="rounded-sm bg-primary-wash px-1 py-0.5 font-mono text-[12px] text-primary">
            soul.md
          </code>{' '}
          until you press generate on the Profile page.
        </p>
      </header>

      {isLoading && <p className="font-mono text-[12px] text-text-faint">Loading…</p>}

      {!isLoading && studies.length === 0 && (
        <Notice tone="err" className="max-w-[64ch]">
          You haven’t answered anything yet. Start with a{' '}
          <Link to="/studies" className="underline">
            study
          </Link>
          .
        </Notice>
      )}

      {studies.map((s) => (
        <section key={s.id} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-2">
            <h2 className="font-sans text-[18px] font-semibold tracking-[-0.01em] text-text-primary">
              {s.title}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
              {s.answeredCount} / {s.totalCount} answered
              {s.answeredCount < s.totalCount && (
                <>
                  {' · '}
                  <Link to={`/studies/${s.id}`} className="text-primary hover:text-primary-strong">
                    answer {s.totalCount - s.answeredCount} more →
                  </Link>
                </>
              )}
            </span>
          </div>
          {s.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              body={bodyOf(q.id, q.savedBody)}
              meta={editedAgo(q.updatedAt)}
              isActive={active === q.id}
              onActivate={() => setActive(q.id)}
              onDeactivate={() => setActive((a) => (a === q.id ? null : a))}
              onChange={(body) => setEdits((e) => ({ ...e, [q.id]: body }))}
            />
          ))}
        </section>
      ))}

      {studies.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-card/95 px-4 py-3 backdrop-blur">
          <span className="font-mono text-[11px] text-text-faint">
            {dirtyStudies.length === 0
              ? 'No unsaved changes.'
              : `Unsaved changes in ${dirtyStudies.length} stud${dirtyStudies.length === 1 ? 'y' : 'ies'}.`}
          </span>
          <div className="flex items-center gap-3">
            <Link to="/results" className="font-mono text-[12px] text-text-secondary hover:text-primary">
              Re-generate profile →
            </Link>
            <Button disabled={busy || dirtyStudies.length === 0} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
