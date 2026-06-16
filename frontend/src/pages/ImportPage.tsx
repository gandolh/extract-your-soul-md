import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type Conversation, type DetectedSender } from '../api/client';
import { useToast } from '../components/Toaster';
import { Button, cardClass, Eyebrow, Headline, Notice, Tag, cx, FIELD_CLASS } from '../components/ui';
import { normalizeName } from '../lib/normalizeName';

// Mirrors the server cap (conversations.ts route bodyLimit / 413 check). Client
// preflight is UX-only; the server stays authoritative (defense in depth).
const MAX_BYTES = 5 * 1024 * 1024;

export function ImportPage() {
  const toast = useToast();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [namesText, setNamesText] = useState('');
  const [senders, setSenders] = useState<DetectedSender[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    api.conversations().then((r) => setConvos(r.conversations)).catch(() => {});
    api.senders().then((r) => setSenders(r.senders)).catch(() => {});
    api.names().then((r) => {
      setNames(r.names);
      setNamesText(r.names.join('\n'));
    }).catch(() => {});
  }, []);

  useEffect(reload, [reload]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => /\.(txt|md)$/i.test(f.name));
      if (list.length === 0) return toast('Only .txt or .md exports are supported.', 'err');

      // Client-side size preflight (server stays the source of truth at 5 MB).
      // f.size (bytes) is a sound proxy for the server's UTF-8 byte length.
      const oversized = list.filter((f) => f.size > MAX_BYTES);
      const ok = list.filter((f) => f.size <= MAX_BYTES);

      setBusy(true);
      // Per-file try/catch so one failure never aborts the rest of the batch.
      let imported = 0;
      const failed: string[] = [];
      try {
        for (const f of ok) {
          try {
            const content = await f.text();
            await api.addConversation(f.name, content);
            imported += 1;
          } catch (err) {
            failed.push(f.name + (err instanceof ApiError ? ` (${err.message})` : ''));
          }
        }
      } finally {
        setBusy(false);
      }
      if (imported > 0) reload();

      // One summary toast covering imported / skipped-too-large / failed.
      const parts: string[] = [];
      if (imported > 0) parts.push(`Imported ${imported}`);
      if (oversized.length > 0) parts.push(`skipped ${oversized.length} over 5 MB`);
      if (failed.length > 0) parts.push(`${failed.length} failed`);
      const tone = failed.length > 0 || (imported === 0 && oversized.length > 0) ? 'err' : 'ok';
      toast(parts.length > 0 ? parts.join(', ') + '.' : 'Nothing to import.', tone);
      if (oversized.length > 0) {
        toast(
          `Too large (5 MB max): ${oversized.map((f) => f.name).join(', ')}. Split the export and re-import.`,
          'err',
        );
      }
    },
    [reload, toast],
  );

  async function remove(id: number) {
    try {
      await api.deleteConversation(id);
      reload();
    } catch {
      toast('Could not delete.', 'err');
    }
  }

  async function saveNames() {
    const list = namesText.split('\n').map((s) => s.trim()).filter(Boolean);
    try {
      const r = await api.setNames(list);
      setNames(r.names);
      setNamesText(r.names.join('\n'));
      toast('Names saved.', 'ok');
    } catch {
      toast('Could not save names.', 'err');
    }
  }

  // The set of normalized names currently in the textarea — drives both the
  // "already added" chip state and the live match count, updating as you type
  // or click chips (before saving). Matches the backend's normalize-then-match.
  const draftNormalized = new Set(
    namesText.split('\n').map((s) => normalizeName(s)).filter(Boolean),
  );
  const matchedCount = senders
    .filter((s) => draftNormalized.has(s.normalized))
    .reduce((sum, s) => sum + s.count, 0);
  const totalCount = senders.reduce((sum, s) => sum + s.count, 0);
  const hasZeroMatch = convos.length > 0 && senders.length > 0 && matchedCount === 0;

  function addName(raw: string) {
    if (draftNormalized.has(normalizeName(raw))) return;
    setNamesText((t) => (t.trim() ? `${t.replace(/\n*$/, '')}\n${raw}` : raw));
  }

  return (
    <div className="flex flex-col gap-section">
      <header className="max-w-[60ch]">
        <Eyebrow>Conversations</Eyebrow>
        <Headline className="mt-3">Import your own words</Headline>
        <p className="mt-3 max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">
          Export a WhatsApp chat (Settings → Export chat → Without media) and drop the{' '}
          <code className="rounded-sm bg-primary-wash px-1.5 py-0.5 font-mono text-[12px] text-primary">.txt</code> here.
          Only the messages <em>you</em> wrote are kept — set the names you appear under below, or
          nothing will be matched.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <Eyebrow>Step 1 — Your names</Eyebrow>
        <p className="max-w-[64ch] text-[14px] text-text-secondary">
          One display name per line — every name you show up as across these chats.
        </p>
        <textarea
          className={cx(FIELD_CLASS, 'max-w-[40ch] min-h-[90px] resize-y font-mono text-[13px]')}
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
          placeholder={'Cristian\nCristian G\n+40…'}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => void saveNames()}>
            Save names
          </Button>
          {names.length > 0 && (
            <Tag tone="accent">
              {names.length} name{names.length > 1 ? 's' : ''} set
            </Tag>
          )}
        </div>

        {senders.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-text-secondary">
              Detected in your imports — click the one(s) that are <em>you</em>:
            </p>
            <div className="flex flex-wrap gap-2">
              {senders.map((s) => {
                const added = draftNormalized.has(s.normalized);
                return (
                  <button
                    key={s.normalized}
                    type="button"
                    disabled={added}
                    onClick={() => addName(s.name)}
                    className={cx(
                      'rounded-full border px-3 py-1 font-mono text-[12px] transition-colors',
                      added
                        ? 'cursor-default border-primary bg-primary-wash text-primary'
                        : 'cursor-pointer border-outline/50 text-text-secondary hover:border-outline',
                    )}
                    title={added ? 'Already in your names' : `Add "${s.name}"`}
                  >
                    {added ? '✓ ' : '+ '}
                    {s.name}{' '}
                    <span className="text-text-faint">({s.count})</span>
                  </button>
                );
              })}
            </div>
            {hasZeroMatch ? (
              <Notice tone="err" className="max-w-[64ch]">
                None of your names match these chats yet — there’ll be{' '}
                <strong>no freeform voice signal</strong> from them. Click a chip above (or fix the
                names) so your messages are picked up. Your questionnaire answers still count.
              </Notice>
            ) : (
              matchedCount > 0 && (
                <p className="font-mono text-[12px] text-text-faint">
                  ✓ matched {matchedCount} of {totalCount} messages as yours
                </p>
              )
            )}
          </div>
        )}
      </section>

      <hr className="border-0 border-t border-hairline" />

      <section className="flex flex-col gap-4">
        <Eyebrow>Step 2 — Drop exports</Eyebrow>
        <div
          role="button"
          tabIndex={0}
          className={cx(
            'cursor-pointer rounded-md border border-dashed p-12 text-center font-mono text-[12px] transition-colors',
            over ? 'border-primary bg-primary-wash text-primary' : 'border-outline/50 text-text-faint hover:border-outline',
          )}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void uploadFiles(e.dataTransfer.files);
          }}
        >
          {busy ? 'Uploading…' : 'Drop .txt / .md exports here, or click to browse'}
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md"
            multiple
            hidden
            onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
          />
        </div>

        {convos.length > 0 && (
          <div className={cardClass('px-5')}>
            {convos.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 border-b border-hairline py-3 last:border-b-0"
              >
                <span className="font-mono text-[13px] text-text-primary">{c.filename}</span>
                <Button variant="ghost" className="px-3 py-1.5" onClick={() => void remove(c.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
