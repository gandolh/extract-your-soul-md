import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type StudyDetail } from '../api/client';
import { useToast } from '../components/Toaster';
import { Meter } from '../components/Layout';
import { STUDY_ORDER } from '../studyOrder';
import { Button, cardClass, Eyebrow, Headline, buttonClass, cx, FIELD_CLASS } from '../components/ui';

export function StudyPage() {
  const { studyId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [detail, setDetail] = useState<StudyDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<'en' | 'ro'>('en');
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setNotFound(false);
    api
      .study(studyId)
      .then((d) => {
        setDetail(d);
        const init: Record<string, string> = {};
        for (const q of d.questions) init[q.id] = q.savedBody;
        setAnswers(init);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else toast('Could not load study.', 'err');
      });
  }, [studyId, toast]);

  const { idx, next, prev } = useMemo(() => {
    const i = STUDY_ORDER.indexOf(studyId);
    return {
      idx: i,
      prev: i > 0 ? STUDY_ORDER[i - 1] : null,
      next: i >= 0 && i < STUDY_ORDER.length - 1 ? STUDY_ORDER[i + 1] : null,
    };
  }, [studyId]);

  const completed = Object.values(answers).filter((b) => b.trim().length > 0).length;

  async function save(thenGoTo?: string | null) {
    if (!detail) return;
    setBusy(true);
    try {
      await api.saveStudy(
        detail.study.id,
        detail.questions.map((q) => ({ id: q.id, body: answers[q.id] ?? '' })),
      );
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
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {detail.questions.map((q, i) => {
          const prompt = lang === 'en' ? q.promptEn : q.promptRo;
          const hint = lang === 'en' ? q.hintEn : q.hintRo;
          const answered = (answers[q.id] ?? '').trim().length > 0;
          const isActive = active === q.id;
          return (
            <div
              key={q.id}
              className={cardClass(
                cx('p-6 transition-colors', isActive && 'border-primary-strong'),
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={cx(
                  'flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]',
                  isActive ? 'text-primary' : 'text-text-faint',
                )}>
                  {isActive && <span className="inline-block h-1.5 w-1.5 rounded-sm bg-primary-strong" />}
                  Question {i + 1}{q.optional ? ' · optional' : ''}
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
              <label htmlFor={q.id} className="block text-[14px] font-medium leading-[20px] text-text-primary">
                {prompt}
              </label>
              {hint && <p className="mt-1 text-[13px] italic text-text-faint">{hint}</p>}
              <textarea
                id={q.id}
                className={cx(FIELD_CLASS, 'mt-3 min-h-[110px] resize-y leading-[1.5]')}
                value={answers[q.id] ?? ''}
                onFocus={() => setActive(q.id)}
                onBlur={() => setActive((a) => (a === q.id ? null : a))}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder={q.optional ? 'Optional — leave blank to skip.' : 'Enter your response here…'}
              />
            </div>
          );
        })}
      </div>

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
