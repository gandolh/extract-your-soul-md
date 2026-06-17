import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, type StudyQuestion, type ReportState } from '../api/client';
import { useReports, useSaveStudy, useStudy } from '../api/queries';
import { useToast } from '../components/Toaster';
import { Meter } from '../components/Layout';
import { STUDY_ORDER } from '../studyOrder';
import { useLangPref, type Lang } from '../lang';
import { Button, cardClass, Eyebrow, Headline, buttonClass, cx, FIELD_CLASS } from '../components/ui';
import { decodeChoiceBody, encodeChoiceBody } from '../choiceBody';
import { ReportSection } from '../components/ReportSection';

export function StudyPage() {
  const { studyId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lang, setLang] = useLangPref();
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
    <div className="flex flex-col gap-section">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Eyebrow>
            Study {idx >= 0 ? `${String(idx + 1).padStart(2, '0')} / ${STUDY_ORDER.length}` : ''}
          </Eyebrow>
          <div className="inline-flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Prompt language">
            {(['en', 'ro'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cx(
                  'px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.05em] transition-colors',
                  lang === l ? 'bg-primary-strong text-on-primary' : 'bg-transparent text-text-faint hover:text-text-primary',
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <Headline>{detail.study.title}</Headline>
        <p className="max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">{detail.study.description}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
            {completed} / {detail.questions.length} answered
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
            lang={lang}
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

// One question card. Free-text questions keep the original textarea; choice
// questions render a scale or radio group, with an optional "say more" textarea
// underneath so the prose voice-sample benefit is never lost. The persisted
// `body` is always a string: raw text for text questions, an encoded
// choice-body for choice questions (see choiceBody.ts).
function QuestionCard({
  q,
  index,
  lang,
  body,
  isActive,
  onActivate,
  onDeactivate,
  onChange,
}: {
  q: StudyQuestion;
  index: number;
  lang: Lang;
  body: string;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onChange: (body: string) => void;
}) {
  const prompt = lang === 'en' ? q.promptEn : q.promptRo;
  const hint = lang === 'en' ? q.hintEn : q.hintRo;
  const answered = body.trim().length > 0;

  const cardCx = cardClass(cx('p-6 transition-colors', isActive && 'border-primary-strong'));
  const header = (
    <div className="mb-3 flex items-center justify-between">
      <span
        className={cx(
          'flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]',
          isActive ? 'text-primary' : 'text-text-faint',
        )}
      >
        {isActive && <span className="inline-block h-1.5 w-1.5 rounded-sm bg-primary-strong" />}
        Question {index + 1}
        {q.optional ? ' · optional' : ''}
      </span>
      {answered && (
        <span
          aria-label="answered"
          className="grid h-5 w-5 place-items-center rounded-full bg-tertiary text-[11px] text-on-tertiary"
        >
          ✓
        </span>
      )}
    </div>
  );
  const promptLabel = (
    <>
      <p className="block text-[14px] font-medium leading-[20px] text-text-primary">{prompt}</p>
      {hint && <p className="mt-1 text-[13px] italic text-text-faint">{hint}</p>}
    </>
  );

  // --- Free-text question (unchanged behavior) -----------------------------
  if (q.kind !== 'choice') {
    const words = body.trim().split(/\s+/).filter(Boolean).length;
    const thin = !q.optional && words > 0 && words < 25;
    return (
      <div className={cardCx}>
        {header}
        <label htmlFor={q.id} className="contents">
          {promptLabel}
        </label>
        <textarea
          id={q.id}
          className={cx(FIELD_CLASS, 'mt-3 min-h-[150px] resize-y leading-[1.5]')}
          value={body}
          onFocus={onActivate}
          onBlur={onDeactivate}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            q.optional
              ? 'Optional — leave blank to skip.'
              : 'Take your time — a few sentences carry more of you than one line.'
          }
        />
        <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-text-faint">
          <span className={cx(thin && 'text-primary')}>
            {thin ? 'a few more sentences would help' : ' '}
          </span>
          <span>{words === 0 ? '' : `${words} word${words === 1 ? '' : 's'}`}</span>
        </div>
      </div>
    );
  }

  // --- Choice question -----------------------------------------------------
  const decoded = decodeChoiceBody(body);
  const selected = decoded.values[0] ?? '';
  const note = decoded.note;
  const setSelected = (value: string) => onChange(encodeChoiceBody([value], note));
  const setNote = (n: string) => onChange(encodeChoiceBody(selected ? [selected] : [], n));

  return (
    <div className={cardCx} onFocus={onActivate} onBlur={onDeactivate}>
      {header}
      {promptLabel}

      {q.choiceMode === 'scale' ? (
        <ScaleField
          name={q.id}
          left={lang === 'en' ? q.leftEn : q.leftRo}
          right={lang === 'en' ? q.rightEn : q.rightRo}
          value={selected}
          onSelect={setSelected}
        />
      ) : (
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label={prompt}>
          {(q.choices ?? []).map((c) => {
            const label = lang === 'en' ? c.labelEn : c.labelRo;
            const checked = selected === c.value;
            return (
              <label
                key={c.value}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3 text-[14px] transition-colors',
                  checked ? 'border-primary-strong bg-tertiary/30' : 'border-hairline hover:border-text-faint',
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={c.value}
                  checked={checked}
                  onChange={() => setSelected(c.value)}
                  className="mt-0.5 accent-[var(--color-primary-strong,currentColor)]"
                />
                <span className="leading-[20px] text-text-primary">{label}</span>
              </label>
            );
          })}
        </div>
      )}

      <textarea
        className={cx(FIELD_CLASS, 'mt-3 min-h-[64px] resize-y leading-[1.5]')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional — add a word or two if it doesn't quite fit."
      />
    </div>
  );
}

// A 5-point bipolar Likert track with the two pole labels at the ends.
function ScaleField({
  name,
  left,
  right,
  value,
  onSelect,
}: {
  name: string;
  left: string | null;
  right: string | null;
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3" role="radiogroup" aria-label={`${left ?? ''} to ${right ?? ''}`}>
        {[1, 2, 3, 4, 5].map((n) => {
          const v = String(n);
          const checked = value === v;
          // Middle dot smaller, ends larger — a familiar Likert affordance.
          const size = n === 3 ? 'h-5 w-5' : n === 1 || n === 5 ? 'h-7 w-7' : 'h-6 w-6';
          return (
            <label key={n} className="flex flex-1 cursor-pointer items-center justify-center">
              <input
                type="radio"
                name={name}
                value={v}
                checked={checked}
                onChange={() => onSelect(v)}
                className="sr-only"
                aria-label={`${n}`}
              />
              <span
                className={cx(
                  'grid place-items-center rounded-full border-2 transition-colors',
                  size,
                  checked ? 'border-primary-strong bg-primary-strong' : 'border-hairline hover:border-text-faint',
                )}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-text-faint">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
