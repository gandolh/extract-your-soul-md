import { useState } from 'react';
import type { StudyQuestion } from '../../api/client';
import { cardClass, cx, FIELD_CLASS } from '../ui';
import { decodeChoiceBody, encodeChoiceBody } from '../../shared/choiceBody';

// One question card, shared by the StudyPage form and the AnswersPage review/edit
// list. Free-text questions render a textarea; choice questions render a scale or
// radio group with an optional "say more" note. The persisted `body` is always a
// string: raw text for text questions, an encoded choice-body for choice ones.
export function QuestionCard({
  q,
  index,
  body,
  isActive,
  onActivate,
  onDeactivate,
  onChange,
  meta,
}: {
  q: StudyQuestion;
  index: number;
  body: string;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onChange: (body: string) => void;
  // Optional trailing metadata in the header (e.g. "edited 3 days ago").
  meta?: string;
}) {
  const prompt = q.prompt;
  const hint = q.hint;
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
        {meta ? ` · ${meta}` : ''}
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

  // --- Free-text question --------------------------------------------------
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
        <ScaleField name={q.id} left={q.left} right={q.right} value={selected} onSelect={setSelected} />
      ) : (
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label={prompt}>
          {(q.choices ?? []).map((c) => {
            const checked = selected === c.value;
            return (
              <label
                key={c.value}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 text-[14px] transition-colors',
                  checked
                    ? 'border-primary-strong bg-primary-wash font-medium'
                    : 'border-hairline hover:border-text-faint',
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={c.value}
                  checked={checked}
                  onChange={() => setSelected(c.value)}
                  className="h-4 w-4 accent-[var(--color-primary-strong,currentColor)]"
                />
                <span className="leading-[20px] text-text-primary">{c.label}</span>
              </label>
            );
          })}
        </div>
      )}

      <ChoiceNote note={note} onChange={setNote} />
    </div>
  );
}

// The optional free-text note on a choice question. Collapsed by default;
// expands on click, or when a note already exists.
function ChoiceNote({ note, onChange }: { note: string; onChange: (n: string) => void }) {
  const [open, setOpen] = useState(note.trim().length > 0);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-9 items-center font-mono text-[11px] uppercase tracking-[0.06em] text-text-faint transition-colors hover:text-primary"
      >
        + Add a note
      </button>
    );
  }
  return (
    <textarea
      autoFocus={note.length === 0}
      className={cx(FIELD_CLASS, 'mt-3 min-h-[44px] resize-y bg-surface-low leading-[1.5]')}
      value={note}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Optional — add a word or two if it doesn't quite fit."
    />
  );
}

// A 5-point bipolar Likert scale laid out as stacked radio rows. The two pole
// labels sit beside the end rows; middle rows carry their number.
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
    <div
      className="mt-3 flex max-w-[440px] flex-col gap-1.5"
      role="radiogroup"
      aria-label={`${left ?? ''} to ${right ?? ''}`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const v = String(n);
        const checked = value === v;
        const pole = n === 1 ? left : n === 5 ? right : null;
        return (
          <label
            key={n}
            className={cx(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-[14px] transition-colors',
              checked
                ? 'border-primary-strong bg-primary-wash font-medium'
                : 'border-hairline hover:border-text-faint',
            )}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={checked}
              onChange={() => onSelect(v)}
              className="h-4 w-4 accent-[var(--color-primary-strong,currentColor)]"
              aria-label={pole ? `${n} — ${pole}` : `${n}`}
            />
            <span className="text-text-primary">
              {n}
              {pole && <span className="ml-2 text-text-secondary">{pole}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
