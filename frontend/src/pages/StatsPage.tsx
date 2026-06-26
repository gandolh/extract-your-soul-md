import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, type ConversationStats } from '../api/client';
import { useComputeStats, useSaveStats } from '../api/queries';
import { useToast } from '../components/app/Toaster';
import { Button, Eyebrow, Headline, Notice } from '../components/ui';
import { FieldLabel, FIELD_CLASS } from '../components/ui/field';
import { StatsDashboard } from '../components/stats/StatsDashboard';

export function StatsPage() {
  const toast = useToast();
  const compute = useComputeStats();
  const save = useSaveStats();
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState('');
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [name, setName] = useState('');

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.onerror = () => toast('Could not read that file.', 'err');
    reader.readAsText(file);
  }

  function analyze() {
    if (text.trim().length === 0) {
      toast('Paste a conversation first.', 'err');
      return;
    }
    compute.mutate(text, {
      onSuccess: (s) => {
        setStats(s);
        // Drop the transcript from memory the moment we have the numbers — it
        // was never stored server-side, and we don't need it client-side either.
        setText('');
        if (fileRef.current) fileRef.current.value = '';
      },
      onError: (err) =>
        toast(err instanceof ApiError ? err.message : 'Could not analyze.', 'err'),
    });
  }

  function persist() {
    if (!stats) return;
    save.mutate(
      { stats, name: name.trim() || undefined },
      {
        onSuccess: (r) => {
          toast(`Saved as “${r.name}”.`, 'ok');
          setName('');
        },
        onError: (err) =>
          toast(err instanceof ApiError ? err.message : 'Could not save.', 'err'),
      },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-section">
      <header className="flex flex-col gap-3">
        <Eyebrow>Conversation stats</Eyebrow>
        <Headline>Analyze a conversation</Headline>
        <p className="text-[14px] leading-[22px] text-text-secondary">
          Paste a chat export (WhatsApp-style lines like{' '}
          <code className="rounded-sm bg-primary-wash px-1 py-0.5 font-mono text-[12px] text-primary">
            1/1/24, 10:00 - Name: message
          </code>
          ) and get the numbers instantly — message counts, response times, top words, monthly
          activity, and a few behavioural flags. No model is involved, and{' '}
          <strong className="text-text-primary">the conversation itself is never stored</strong> — it’s
          analyzed on the spot and discarded. Save only the statistics if you want to keep them.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <FieldLabel htmlFor="conversation">Conversation text</FieldLabel>
        <textarea
          id="conversation"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Paste the exported chat here…"
          className={`${FIELD_CLASS} resize-y font-mono text-[13px] leading-[20px]`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={analyze} disabled={compute.isPending}>
            {compute.isPending ? 'Analyzing…' : 'Analyze'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            onChange={onFile}
            className="hidden"
            id="conversation-file"
          />
          <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
            Upload .txt
          </Button>
          <Link
            to="/saved-stats"
            className="font-mono text-[12px] uppercase tracking-[0.05em] text-text-secondary hover:text-text-primary"
          >
            View saved →
          </Link>
        </div>
      </section>

      {stats && (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-md border border-hairline bg-surface-card p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FieldLabel htmlFor="stat-name">Save these statistics as</FieldLabel>
                <input
                  id="stat-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Leave blank for an auto name (e.g. 1-2026-06-26)"
                  className={`${FIELD_CLASS} mt-2`}
                />
              </div>
              <Button type="button" onClick={persist} disabled={save.isPending} className="shrink-0">
                {save.isPending ? 'Saving…' : 'Save statistics'}
              </Button>
            </div>
            <Notice tone="ok">
              These are aggregate numbers only — the conversation text has already been discarded.
            </Notice>
          </section>

          <StatsDashboard stats={stats} />
        </>
      )}
    </div>
  );
}
