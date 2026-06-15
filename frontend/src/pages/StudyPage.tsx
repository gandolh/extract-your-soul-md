import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type StudyDetail } from '../api/client';
import { useToast } from '../components/Toaster';
import { Meter } from '../components/Layout';
import { STUDY_ORDER } from '../studyOrder';

export function StudyPage() {
  const { studyId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [detail, setDetail] = useState<StudyDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<'en' | 'ro'>('en');
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

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
      <div className="stack stack-4">
        <h1>Unknown study</h1>
        <p className="muted">That study doesn’t exist. <Link to="/studies">Back to the studies</Link>.</p>
      </div>
    );
  }
  if (!detail) return <p className="muted mono">Loading…</p>;

  return (
    <div className="stack stack-6">
      <header className="stack stack-3" style={{ maxWidth: 'var(--measure)' }}>
        <div className="row-between">
          <p className="eyebrow" style={{ margin: 0 }}>
            Study {idx >= 0 ? `${String(idx + 1).padStart(2, '0')} / ${STUDY_ORDER.length}` : ''}
          </p>
          <div className="toggle" role="group" aria-label="Prompt language">
            <button data-on={lang === 'en'} onClick={() => setLang('en')}>EN</button>
            <button data-on={lang === 'ro'} onClick={() => setLang('ro')}>RO</button>
          </div>
        </div>
        <h1>{detail.study.title}</h1>
        <p className="lede">{detail.study.description}</p>
        <Meter completed={completed} total={detail.questions.length} />
      </header>

      <div className="stack stack-6">
        {detail.questions.map((q, i) => {
          const prompt = lang === 'en' ? q.promptEn : q.promptRo;
          const hint = lang === 'en' ? q.hintEn : q.hintRo;
          return (
            <div key={q.id} className="field" style={{ maxWidth: 'var(--measure)' }}>
              <span className="field-q-index">Question {i + 1}{q.optional ? ' · optional' : ''}</span>
              <label className="field-label" htmlFor={q.id}>
                {prompt}
              </label>
              {hint && <p className="field-hint">{hint}</p>}
              <textarea
                id={q.id}
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder={q.optional ? 'Optional — leave blank to skip.' : 'Write as much as you like…'}
              />
            </div>
          );
        })}
      </div>

      <div className="btn-row">
        <button className="btn btn-accent" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {prev && (
          <Link className="btn btn-ghost" to={`/studies/${prev}`}>
            ← Previous study
          </Link>
        )}
        {next ? (
          <button className="btn btn-ghost" disabled={busy} onClick={() => void save(next)}>
            Save & next →
          </button>
        ) : (
          <button className="btn btn-ghost" disabled={busy} onClick={() => void save(null)}>
            Save & finish →
          </button>
        )}
      </div>
    </div>
  );
}
