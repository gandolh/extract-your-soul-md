import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type Conversation } from '../api/client';
import { useToast } from '../components/Toaster';

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
    <div className="stack stack-7">
      <header style={{ maxWidth: '48ch' }}>
        <p className="eyebrow">Conversations</p>
        <h1>Import your own words</h1>
        <p className="lede" style={{ marginTop: 'var(--s-3)' }}>
          Export a WhatsApp chat (Settings → Export chat → Without media) and drop the{' '}
          <code>.txt</code> here. Only the messages <em>you</em> wrote are kept — set the names you
          appear under below, or nothing will be matched.
        </p>
      </header>

      <section className="stack stack-4">
        <p className="eyebrow" style={{ margin: 0 }}>Step 1 — Your names</p>
        <p className="muted" style={{ maxWidth: 'var(--measure)' }}>
          One display name per line — every name you show up as across these chats.
        </p>
        <textarea
          style={{ maxWidth: '40ch', minHeight: 90 }}
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
          placeholder={'Cristian\nCristian G\n+40…'}
        />
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={() => void saveNames()}>Save names</button>
          {names.length > 0 && <span className="tag">{names.length} name{names.length > 1 ? 's' : ''} set</span>}
        </div>
      </section>

      <hr className="divider" />

      <section className="stack stack-4">
        <p className="eyebrow" style={{ margin: 0 }}>Step 2 — Drop exports</p>
        <div
          className="dropzone"
          data-over={over}
          onClick={() => fileInput.current?.click()}
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
          <div className="panel">
            {convos.map((c) => (
              <div key={c.id} className="list-row">
                <span className="mono" style={{ fontSize: '0.85rem' }}>{c.filename}</span>
                <button className="btn btn-ghost" style={{ padding: '4px 12px' }} onClick={() => void remove(c.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
