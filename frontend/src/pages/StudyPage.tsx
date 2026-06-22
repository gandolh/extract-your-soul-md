import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, type ReportState } from '../api/client';
import { useReports, useSaveStudy, useStudy } from '../api/queries';
import { useToast } from '../components/app/Toaster';
import { Meter } from '../components/app/Layout';
import { STUDY_ORDER } from '../shared/studyOrder';
import { Button, Eyebrow, Headline, buttonClass } from '../components/ui';
import { ReportSection } from '../components/studies/ReportSection';
import { QuestionCard } from '../components/studies/QuestionCard';

export function StudyPage() {
  const { studyId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [autosave, setAutosave] = useState<'idle' | 'saving' | 'saved'>('idle');

  const studyQuery = useStudy(studyId);
  const detail = studyQuery.data ?? null;
  const notFound =
    studyQuery.error instanceof ApiError && studyQuery.error.status === 404;
  const reportKey = detail?.study.reportKey ?? null;

  // Profile studies have a scored report; pull it from the reports query and
  // pick the one matching this study's reportKey.
  const { data: reports } = useReports(reportKey != null);
  const report: ReportState | null =
    reportKey != null ? (reports?.find((r) => r.key === reportKey) ?? null) : null;

  const saveStudy = useSaveStudy();

  // Snapshot of the last-persisted answers (JSON), so the autosave effect can
  // tell a real edit from the initial seed / a study switch and skip saving when
  // nothing changed. Also the dirty signal for the beforeunload guard.
  const baseline = useRef<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Non-404 load failures surface as a toast (404 → the "unknown study" view).
  useEffect(() => {
    if (studyQuery.error && !(studyQuery.error instanceof ApiError && studyQuery.error.status === 404)) {
      toast('Could not load study.', 'err');
    }
  }, [studyQuery.error, toast]);

  // Seed the editable answers from the loaded study (and re-seed on a study
  // switch). The baseline snapshot guards the autosave effect against firing on
  // this seed.
  useEffect(() => {
    setActive(null);
    setAutosave('idle');
    if (timer.current) clearTimeout(timer.current);
    if (!detail) return;
    const init: Record<string, string> = {};
    for (const q of detail.questions) init[q.id] = q.savedBody;
    setAnswers(init);
    baseline.current = JSON.stringify(init);
  }, [detail]);

  const { idx, next, prev } = useMemo(() => {
    const i = STUDY_ORDER.indexOf(studyId);
    return {
      idx: i,
      prev: i > 0 ? STUDY_ORDER[i - 1] : null,
      next: i >= 0 && i < STUDY_ORDER.length - 1 ? STUDY_ORDER[i + 1] : null,
    };
  }, [studyId]);

  const completed = Object.values(answers).filter((b) => b.trim().length > 0).length;

  // The bare persistence call — no toast, no navigate. Returns the snapshot it
  // saved so callers can update the baseline. Shared by autosave + manual save.
  const persist = useCallback(async (): Promise<string | null> => {
    if (!detail) return null;
    const snapshot = JSON.stringify(answers);
    // The mutation invalidates the reports query on success, so profile studies
    // refresh their scored result without a manual fetch.
    await saveStudy.mutateAsync({
      id: detail.study.id,
      answers: detail.questions.map((q) => ({ id: q.id, body: answers[q.id] ?? '' })),
    });
    baseline.current = snapshot;
    return snapshot;
  }, [detail, answers, saveStudy]);

  // Debounced autosave: ~1.5s after the last edit, if answers differ from the
  // last-persisted baseline. The baseline guard means the initial seed and a
  // study switch don't trigger a save.
  useEffect(() => {
    if (!detail) return;
    if (JSON.stringify(answers) === baseline.current) return;
    setAutosave('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      (async () => {
        try {
          await persist();
          setAutosave('saved');
        } catch {
          setAutosave('idle');
        }
      })();
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [answers, detail, persist]);

  // Tab-close guard while there are unsaved edits (covers what autosave can't:
  // a close mid-debounce). In-app nav loss is already a non-issue via autosave.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(answers) !== baseline.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [answers]);

  async function save(thenGoTo?: string | null) {
    if (!detail) return;
    if (timer.current) clearTimeout(timer.current); // cancel any pending autosave
    setBusy(true);
    try {
      await persist();
      setAutosave('saved');
      toast('Answers saved.', 'ok');
      if (thenGoTo) navigate(`/studies/${thenGoTo}`);
      else if (thenGoTo === null && next === null) navigate('/results');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Save failed.', 'err');
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <Headline>Unknown study</Headline>
        <p className="text-[14px] text-text-secondary">
          That study doesn’t exist.{' '}
          <Link to="/studies" className="text-primary hover:text-primary-strong">
            Back to the studies
          </Link>
          .
        </p>
      </div>
    );
  }
  if (!detail) return <p className="font-mono text-[12px] text-text-faint">Loading…</p>;

  return (
    // A tighter reading column than the 960px shell: the studies are a form
    // (one-line prompts + a ~440px scale), so a 680px measure keeps cards and
    // their content in step instead of stranding answers in dead width.
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-section">
      <header className="flex flex-col gap-3">
        <Eyebrow>
          Study {idx >= 0 ? `${String(idx + 1).padStart(2, '0')} / ${STUDY_ORDER.length}` : ''}
        </Eyebrow>
        <Headline>{detail.study.title}</Headline>
        <p className="text-[14px] leading-[22px] text-text-secondary">{detail.study.description}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
            {completed} / {detail.questions.length} answered · ~{detail.study.estimateMinutes} min
          </span>
          <div className="max-w-[420px] flex-1">
            <Meter completed={completed} total={detail.questions.length} />
          </div>
          {autosave !== 'idle' && (
            <span
              aria-live="polite"
              className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint"
            >
              {autosave === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {detail.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            body={answers[q.id] ?? ''}
            isActive={active === q.id}
            onActivate={() => setActive(q.id)}
            onDeactivate={() => setActive((a) => (a === q.id ? null : a))}
            onChange={(body) => setAnswers((a) => ({ ...a, [q.id]: body }))}
          />
        ))}
      </div>

      {/* Profile studies show their scored result + the soul.md toggle. */}
      {detail.study.band === 'profile' && report && <ReportSection report={report} />}

      <div className="flex flex-wrap items-center gap-3">
        {prev ? (
          <Link className={buttonClass('ghost')} to={`/studies/${prev}`}>
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Button variant="ghost" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save draft'}
          </Button>
          {next ? (
            <Button variant="primary" disabled={busy} onClick={() => void save(next)}>
              Save & next →
            </Button>
          ) : (
            <Button variant="primary" disabled={busy} onClick={() => void save(null)}>
              Save & finish →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
