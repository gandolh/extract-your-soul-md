import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type Conversation } from '../api/client';
import { useToast } from '../components/Toaster';
import { Button, Eyebrow, Headline, Tag, cx, FIELD_CLASS } from '../components/ui';

export function ImportPage() {
  const toast = useToast();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [namesText, setNamesText] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    api.conversations().then((r) => setConvos(r.conversations)).catch(() => {});
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
      setBusy(true);
      try {
        for (const f of list) {
          const content = await f.text();
          await api.addConversation(f.name, content);
        }
        toast(`Imported ${list.length} file${list.length > 1 ? 's' : ''}.`, 'ok');
        reload();
      } catch (err) {
        toast(err instanceof ApiError ? err.message : 'Upload failed.', 'err');
      } finally {
        setBusy(false);
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
          <div className="rounded-md border border-hairline bg-surface-card px-5 shadow-card">
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
