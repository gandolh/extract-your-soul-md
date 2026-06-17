import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import type { ConversationProvider } from '../api/queries';
import {
  useAddConversation,
  useConversations,
  useDeleteConversation,
} from '../api/queries';
import { useToast } from '../components/Toaster';
import {
  Button,
  cardClass,
  cx,
  Eyebrow,
  FieldLabel,
  FIELD_CLASS,
  Headline,
  Tag,
} from '../components/ui';

// Mirrors the server cap (conversations.ts route bodyLimit / 413 check). Client
// preflight is UX-only; the server stays authoritative (defense in depth).
const MAX_BYTES = 5 * 1024 * 1024;

// Only WhatsApp today — the select exists so adding a provider is data-only.
const PROVIDERS: Array<{ value: ConversationProvider; label: string }> = [
  { value: 'whatsapp', label: 'WhatsApp' },
];

const PROVIDER_LABEL: Record<ConversationProvider, string> = {
  whatsapp: 'WhatsApp',
};

export function ConversationsPage() {
  const toast = useToast();
  const { data: convos = [] } = useConversations();
  const [provider, setProvider] = useState<ConversationProvider>('whatsapp');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const addConversation = useAddConversation();
  const deleteConversation = useDeleteConversation();

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => /\.(txt|md)$/i.test(f.name));
    if (list.length === 0) return toast('Only .txt or .md exports are supported.', 'err');

    // Client-side size preflight (server stays the source of truth at 5 MB).
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
          await addConversation.mutateAsync({ filename: f.name, content, provider });
          imported += 1;
        } catch (err) {
          failed.push(f.name + (err instanceof ApiError ? ` (${err.message})` : ''));
        }
      }
    } finally {
      setBusy(false);
    }

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
  }

  function remove(id: number, filename: string) {
    if (!window.confirm(`Remove "${filename}"? This can't be undone.`)) return;
    deleteConversation.mutate(id, {
      onError: () => toast('Could not delete.', 'err'),
    });
  }

  return (
    <div className="flex flex-col gap-section">
      <header className="max-w-[60ch]">
        <Eyebrow>Conversations</Eyebrow>
        <Headline className="mt-3">Import your conversations</Headline>
        <p className="mt-3 max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">
          Pick a provider, then drop your exported chats. Every conversation you import shows up
          below — open one to set which names are <em>you</em> and read the full transcript. Only
          the messages you wrote feed your voice profile.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="max-w-[28ch]">
          <FieldLabel htmlFor="provider">Provider</FieldLabel>
          <select
            id="provider"
            className={cx(FIELD_CLASS, 'mt-2 cursor-pointer')}
            value={provider}
            onChange={(e) => setProvider(e.target.value as ConversationProvider)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-2 font-mono text-[11px] text-text-faint">
            More providers coming. WhatsApp: Settings → Export chat → Without media.
          </p>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload conversation exports"
          className={cx(
            'cursor-pointer rounded-md border border-dashed p-12 text-center font-mono text-[12px] transition-colors',
            over
              ? 'border-primary bg-primary-wash text-primary'
              : 'border-outline/50 text-text-faint hover:border-outline',
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
          {busy ? 'Uploading…' : `Drop ${PROVIDER_LABEL[provider]} .txt / .md exports here, or click to browse`}
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md"
            multiple
            hidden
            onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <Eyebrow as="h2">Imported conversations</Eyebrow>
          {convos.length > 0 && (
            <span className="font-mono text-[12px] text-text-faint">
              {convos.length} total
            </span>
          )}
        </div>

        {convos.length === 0 ? (
          <p className="max-w-[64ch] text-[14px] text-text-secondary">
            Nothing imported yet. Drop an export above to get started — or skip this and answer the
            studies instead; either source is enough.
          </p>
        ) : (
          <div className={cardClass('px-0')}>
            {convos.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 border-b border-hairline px-5 py-3 last:border-b-0"
              >
                <Link
                  to={`/conversations/${c.id}`}
                  className="group flex flex-1 items-center gap-3 no-underline"
                >
                  <span className="truncate font-mono text-[13px] text-text-primary group-hover:text-primary">
                    {c.filename}
                  </span>
                  <Tag tone="neutral" className="shrink-0">
                    {PROVIDER_LABEL[c.provider] ?? c.provider}
                  </Tag>
                  {c.namesCount === null ? (
                    <span className="shrink-0 font-mono text-[11px] text-text-faint">
                      global names
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono text-[11px] text-text-faint">
                      {c.namesCount} name{c.namesCount === 1 ? '' : 's'}
                    </span>
                  )}
                </Link>
                <Button
                  variant="ghost"
                  className="shrink-0 px-3 py-1.5"
                  onClick={() => remove(c.id, c.filename)}
                >
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
