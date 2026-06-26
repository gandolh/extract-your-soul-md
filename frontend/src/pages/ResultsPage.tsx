import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { queryKeys, useExtract, useResults } from '../api/queries';
import { useToast } from '../components/app/Toaster';
import { Markdown } from '../components/app/Markdown';
import { Button, Card, cardClass, Eyebrow, Headline, Notice, Tag } from '../components/ui';

const POLL_MS = 2000;

export function ResultsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [showPrev, setShowPrev] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The id of the job we last saw running, so we can announce its terminal
  // outcome exactly once when polling observes it has cleared.
  const watchedJob = useRef<number | null>(null);

  // Local optimistic running flag so the poll starts the instant we enqueue,
  // before the first refetch confirms it server-side.
  const [optimisticRunning, setOptimisticRunning] = useState(false);

  // Poll only while a job is live (server flag) or just-enqueued (optimistic);
  // an idle page makes a single fetch. A reload mid-run resumes polling once
  // the first fetch reports running.
  const [serverRunningSeen, setServerRunningSeen] = useState(false);
  const polling = serverRunningSeen || optimisticRunning;
  const { data: state = null } = useResults(polling, POLL_MS);
  const serverRunning = state?.running ?? false;
  const running = serverRunning || optimisticRunning;

  useEffect(() => {
    setServerRunningSeen(serverRunning);
  }, [serverRunning]);

  const extract = useExtract();

  // On the running→stopped transition, fetch the terminal job detail once and
  // announce done vs. failed.
  useEffect(() => {
    if (serverRunning) {
      watchedJob.current = state?.job?.id ?? watchedJob.current;
      setOptimisticRunning(false); // server now confirms the run
      return;
    }
    if (watchedJob.current == null) return;
    const finishedId = watchedJob.current;
    watchedJob.current = null;
    (async () => {
      try {
        const detail = await api.job(finishedId);
        if (detail.status === 'done') toast('Profile generated.', 'ok');
        else toast(detail.error ?? 'Extraction failed.', 'err');
      } catch {
        /* job detail unavailable — the result table still updated */
      }
    })();
  }, [serverRunning, state?.job?.id, toast]);

  function runExtraction() {
    setConfirmOpen(false);
    extract.mutate(undefined, {
      onSuccess: (r) => {
        watchedJob.current = r.jobId;
        // Optimistically flip to running so the poll effect starts immediately;
        // the invalidate inside useExtract refreshes the real state shortly.
        setOptimisticRunning(true);
        void qc.invalidateQueries({ queryKey: queryKeys.results });
      },
      onError: (err) =>
        toast(err instanceof ApiError ? err.message : 'Extraction failed.', 'err'),
    });
  }

  function onRunClick() {
    if (state?.result) setConfirmOpen(true);
    else runExtraction();
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
            The synthesized voice profile, generated locally from your studies and the cards you
            confirmed, via Ollama. Re-run as you add material.
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
          long chat, re-paste the profile every dozen-or-so turns to keep the
          model&rsquo;s voice from drifting back to generic.
        </p>
      )}

      {state && !state.canExtract && !result && (
        <Notice tone="err" className="max-w-[64ch]">
          Nothing to extract yet. Answer a{' '}
          <Link to="/studies" className="underline">
            study
          </Link>{' '}
          first, then optionally{' '}
          <Link to="/swipe" className="underline">
            swipe some cards
          </Link>
          .
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
          {!showPrev && result.regurgitation && result.regurgitation.count > 0 && (
            <Notice tone="err" className="max-w-[64ch]">
              <strong>Review before sharing.</strong> {result.regurgitation.count} verbatim{' '}
              {result.regurgitation.ngram}-word span
              {result.regurgitation.count === 1 ? '' : 's'} from your own answers appear in this
              profile — the model may have copied you rather than describing your voice. For
              example:{' '}
              {result.regurgitation.samples.slice(0, 3).map((s, i) => (
                <span key={s}>
                  {i > 0 ? '; ' : ''}“…{s}…”
                </span>
              ))}
              . Edit these out before any downstream use.
            </Notice>
          )}
          <div className={cardClass('soul px-8 py-7')}>
            <Markdown source={showPrev && result.prevMd ? result.prevMd : result.soulMd} />
          </div>
        </div>
      ) : (
        !running &&
        // Only show the teaching empty state once there's material to extract;
        // otherwise the "Nothing to extract yet" Notice above already guides.
        state?.canExtract && (
          <Card className="flex flex-col items-start gap-3">
            <p className="text-[14px] text-text-secondary">
              No profile generated yet — your studies and confirmed cards are ready to synthesize.
            </p>
            {state.ollamaReady ? (
              <Button onClick={onRunClick}>Generate profile</Button>
            ) : (
              <p className="font-mono text-[12px] text-text-faint">
                Start your local Ollama server, then generate.
              </p>
            )}
          </Card>
        )
      )}

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-modal-backdrop bg-overlay" />
          <Dialog.Popup
            className={cardClass(
              'fixed left-1/2 top-1/2 z-modal w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 p-6',
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
              <Button onClick={runExtraction}>Re-run</Button>
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
