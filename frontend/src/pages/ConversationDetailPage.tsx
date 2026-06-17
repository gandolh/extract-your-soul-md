import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ConversationProvider } from '../api/queries';
import { useConversation, useSetConversationNames } from '../api/queries';
import { useToast } from '../components/Toaster';
import {
  Button,
  cardClass,
  cx,
  Eyebrow,
  FIELD_CLASS,
  Headline,
  Notice,
  Tag,
} from '../components/ui';
import { normalizeName } from '../lib/normalizeName';

const PROVIDER_LABEL: Record<ConversationProvider, string> = {
  whatsapp: 'WhatsApp',
};

export function ConversationDetailPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);

  const { data: conv, isLoading, isError } = useConversation(id);
  const setNames = useSetConversationNames(id);

  const [namesText, setNamesText] = useState('');

  // Seed the draft from the saved names whenever they (re)load. While the
  // conversation uses the global fallback we still show those names so the user
  // sees what's currently in effect, but saving will pin them to this chat.
  useEffect(() => {
    if (conv) setNamesText(conv.names.join('\n'));
  }, [conv]);

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <span className="spin" />
      </div>
    );
  }

  if (isError || !conv) {
    return (
      <div className="flex flex-col gap-6">
        <Notice tone="err" className="max-w-[64ch]">
          That conversation could not be found.
        </Notice>
        <Link to="/conversations" className="font-mono text-[13px] text-primary">
          ← Back to conversations
        </Link>
      </div>
    );
  }

  // Live normalized set for the draft — drives chip state + match count, exactly
  // like the backend normalize-then-match. Updates as you type / click chips.
  const draftNormalized = new Set(
    namesText.split('\n').map((s) => normalizeName(s)).filter(Boolean),
  );
  const matchedCount = conv.senders
    .filter((s) => draftNormalized.has(s.normalized))
    .reduce((sum, s) => sum + s.count, 0);
  const totalCount = conv.senders.reduce((sum, s) => sum + s.count, 0);
  const hasZeroMatch = conv.senders.length > 0 && matchedCount === 0;

  function addName(raw: string) {
    if (draftNormalized.has(normalizeName(raw))) return;
    setNamesText((t) => (t.trim() ? `${t.replace(/\n*$/, '')}\n${raw}` : raw));
  }

  function save() {
    const list = namesText.split('\n').map((s) => s.trim()).filter(Boolean);
    setNames.mutate(list, {
      onSuccess: () => toast('Names saved for this conversation.', 'ok'),
      onError: () => toast('Could not save names.', 'err'),
    });
  }

  function resetToGlobal() {
    setNames.mutate(null, {
      onSuccess: () => toast('Reverted to your global names.', 'ok'),
      onError: () => toast('Could not reset.', 'err'),
    });
  }

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-col gap-3">
        <Link to="/conversations" className="font-mono text-[12px] text-text-secondary hover:text-primary">
          ← Conversations
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Headline className="break-all">{conv.filename}</Headline>
          <Tag tone="neutral">{PROVIDER_LABEL[conv.provider] ?? conv.provider}</Tag>
          {conv.usesGlobal && <Tag tone="accent">using global names</Tag>}
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <Eyebrow as="h2">Your names in this conversation</Eyebrow>
        <p className="max-w-[64ch] text-[14px] text-text-secondary">
          One display name per line — every name <em>you</em> appear under in this chat. Only your
          messages are kept for the voice profile.
          {conv.usesGlobal && ' These start from your global names; saving pins them to this conversation.'}
        </p>

        <textarea
          className={cx(FIELD_CLASS, 'max-w-[40ch] min-h-[90px] resize-y font-mono text-[13px]')}
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
          placeholder={'Your name\nYour nickname\n+1 555…'}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={save} disabled={setNames.isPending}>
            Save names
          </Button>
          {!conv.usesGlobal && (
            <Button variant="ghost" onClick={resetToGlobal} disabled={setNames.isPending}>
              Reset to global names
            </Button>
          )}
        </div>

        {conv.senders.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-text-secondary">
              Everyone detected in this chat — click the one(s) that are <em>you</em>:
            </p>
            <div className="flex flex-wrap gap-2">
              {conv.senders.map((s) => {
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
                    {s.name} <span className="text-text-faint">({s.count})</span>
                  </button>
                );
              })}
            </div>
            {hasZeroMatch ? (
              <Notice tone="err" className="max-w-[64ch]">
                None of these names are marked as <strong>you</strong> — this conversation will
                contribute <strong>no voice signal</strong>. Click a chip above so your messages are
                picked up.
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

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <Eyebrow as="h2">Full conversation</Eyebrow>
          <span className="font-mono text-[11px] text-text-faint">read-only</span>
        </div>
        <pre
          className={cardClass(
            'max-h-[60vh] overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-[12px] leading-[20px] text-text-secondary',
          )}
        >
          {conv.content}
        </pre>
      </section>

      <div>
        <Button variant="ghost" onClick={() => navigate('/conversations')}>
          ← Back to conversations
        </Button>
      </div>
    </div>
  );
}
