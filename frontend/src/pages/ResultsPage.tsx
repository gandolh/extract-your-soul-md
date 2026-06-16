import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { Link } from 'react-router-dom';
import { api, ApiError, type ResultsState } from '../api/client';
import { useToast } from '../components/Toaster';
import { Markdown } from '../components/Markdown';
import { Button, Card, cardClass, Eyebrow, Headline, Notice, Tag } from '../components/ui';

const POLL_MS = 2000;

export function ResultsPage() {
  const toast = useToast();
  const [state, setState] = useState<ResultsState | null>(null);
  const [showPrev, setShowPrev] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The id of the job we last saw running, so we can announce its terminal
  // outcome exactly once when polling observes it has cleared.
  const watchedJob = useRef<number | null>(null);

  // Running state is driven entirely by the server's active-job flag — a reload
  // mid-run picks the poll loop back up instead of re-enabling the button.
  const running = state?.running ?? false;

  useEffect(() => {
    api.results().then(setState).catch(() => {});
  }, []);

  // Poll while a job is live; on the transition to no-live-job, fetch the
  // terminal job detail to report done vs. failed.
  useEffect(() => {
    if (!running) return;
    watchedJob.current = state?.job?.id ?? watchedJob.current;
    const timer = setInterval(() => {
      api
        .results()
        .then(async (fresh) => {
          setState(fresh);
          if (!fresh.running && watchedJob.current != null) {
            const finishedId = watchedJob.current;
            watchedJob.current = null;
            try {
              const detail = await api.job(finishedId);
              if (detail.status === 'done') toast('Profile generated.', 'ok');
              else toast(detail.error ?? 'Extraction failed.', 'err');
            } catch {
              /* job detail unavailable — the result table still updated */
            }
          }
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, state?.job?.id, toast]);

  async function runExtraction() {
    setConfirmOpen(false);
    try {
      const r = await api.extract();
      watchedJob.current = r.jobId;
      // Optimistically flip to running so the poll effect starts immediately.
      setState((s) =>
        s
          ? { ...s, running: true, job: { id: r.jobId, status: 'enqueued', stage: null, chunkDone: 0, chunkTotal: 0 } }
          : s,
      );
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Extraction failed.', 'err');
    }
  }

  function onRunClick() {
    if (state?.result) setConfirmOpen(true);
    else void runExtraction();
  }

  const result = state?.result ?? null;
  const job = state?.job ?? null;
  const progressPct =
    job && job.stage === 'reduce'
      ? 95
      : job && job.chunkTotal > 0
        ? Math.round((job.chunkDone / job.chunkTotal) * 90)
        : 0;
  const stageLabel =
    job?.stage === 'reduce'
      ? 'Synthesizing the profile…'
      : job?.stage === 'map'
        ? `Reading your chunks (${job.chunkDone}/${job.chunkTotal})…`
        : 'Starting…';

  // The markdown currently on screen (current profile, or the previous version
  // when "View previous" is toggled) — what Copy/Download act on.
  const shownMd = showPrev && result?.prevMd ? result.prevMd : (result?.soulMd ?? '');

  async function copyMd() {
    try {
      await navigator.clipboard.writeText(shownMd);
      toast('Copied to clipboard.', 'ok');
    } catch {
      toast('Could not copy — your browser blocked clipboard access.', 'err');
    }
  }

  function downloadMd() {
    const blob = new Blob([shownMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soul.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-section">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[52ch]">
          <Eyebrow>The profile</Eyebrow>
          <Headline className="mt-3">
            soul<span className="text-primary">.</span>md
          </Headline>
          <p className="mt-3 max-w-[64ch] text-[14px] leading-[22px] text-text-secondary">
            The synthesized voice profile, generated locally from your studies and conversations via
            Ollama. Re-run as you add material.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={running || (state ? !state.canExtract || !state.ollamaReady : true)}
            onClick={onRunClick}
          >
            {running ? (
              <>
                <span className="spin" /> Generating…
              </>
            ) : result ? (
              'Re-run extraction'
            ) : (
              'Generate profile'
            )}
          </Button>
          {result && (
            <>
              <Button variant="secondary" onClick={() => void copyMd()}>
                Copy
              </Button>
              <Button variant="secondary" onClick={downloadMd}>
                Download
              </Button>
            </>
          )}
          {result?.prevMd && (
            <Button variant="ghost" onClick={() => setShowPrev((v) => !v)}>
              {showPrev ? 'Hide previous' : 'View previous'}
            </Button>
          )}
        </div>
      </header>
      {result && (
        <p className="-mt-2 max-w-[64ch] font-mono text-[11px] text-text-faint">
          Review before sharing — soul.md is built from your private words. In a
          long chat, re-paste the <span className="text-text-muted">Drift Anchor</span>{' '}
          block every dozen-or-so turns to keep the voice from drifting back to generic.
        </p>
      )}

      {state && !state.canExtract && !result && (
        <Notice tone="err" className="max-w-[64ch]">
          Nothing to extract yet. Answer a{' '}
          <Link to="/studies" className="underline">
            study
          </Link>{' '}
          or{' '}
          <Link to="/import" className="underline">
            import a conversation
          </Link>{' '}
          first.
        </Notice>
      )}

      {state && !state.ollamaReady && !running && (
        <Notice tone="err" className="max-w-[64ch]">
          {state.ollamaReason ?? 'The Ollama server is not reachable.'} Extraction runs locally
          through Ollama, so it must be running before you can generate a profile.
        </Notice>
      )}

      {running && (
        <div className="flex max-w-[64ch] flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-[12px] text-text-secondary">
            <span>{stageLabel}</span>
            <span className="text-text-faint">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-highest">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(progressPct, 4)}%` }}
            />
          </div>
          <p className="font-mono text-[11px] text-text-faint">
            Runs in the background — safe to leave or reload this tab.
          </p>
        </div>
      )}

      {result ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {result.createdAt && (
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-faint">
                Generated {new Date(result.createdAt + 'Z').toLocaleString()} · via {result.extractor}
              </span>
            )}
            {showPrev && result.prevMd && <Tag tone="accent">Showing previous version</Tag>}
          </div>
          <div className={cardClass('soul px-8 py-7')}>
            <Markdown source={showPrev && result.prevMd ? result.prevMd : result.soulMd} />
          </div>
        </div>
      ) : (
        !running && (
          <Card className="text-[14px] text-text-faint">No profile generated yet.</Card>
        )
      )}

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-overlay" />
          <Dialog.Popup
            className={cardClass(
              'fixed left-1/2 top-1/2 z-[41] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 p-6',
            )}
          >
            <Dialog.Title className="font-sans text-[20px] font-semibold tracking-[-0.01em] text-text-primary">
              Re-run extraction?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-[14px] leading-[20px] text-text-secondary">
              The current profile becomes the “previous version” and is replaced by a freshly
              generated one. This can take a few minutes.
            </Dialog.Description>
            <div className="mt-5 flex items-center gap-3">
              <Button onClick={() => void runExtraction()}>Re-run</Button>
              <Dialog.Close
                render={
                  <Button variant="ghost">Cancel</Button>
                }
              />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
