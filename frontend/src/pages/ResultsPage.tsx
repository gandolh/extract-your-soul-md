import { useEffect, useState } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { Link } from 'react-router-dom';
import { api, ApiError, type ResultsState } from '../api/client';
import { useToast } from '../components/Toaster';
import { Markdown } from '../components/Markdown';
import { Button, Card, cardClass, Eyebrow, Headline, Notice, Tag } from '../components/ui';

export function ResultsPage() {
  const toast = useToast();
  const [state, setState] = useState<ResultsState | null>(null);
  const [running, setRunning] = useState(false);
  const [showPrev, setShowPrev] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    api.results().then(setState).catch(() => {});
  }, []);

  async function runExtraction() {
    setConfirmOpen(false);
    setRunning(true);
    try {
      const r = await api.extract();
      const fresh = await api.results();
      setState(fresh);
      toast('Profile generated.', 'ok');
      void r;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Extraction failed.', 'err');
    } finally {
      setRunning(false);
    }
  }

  function onRunClick() {
    if (state?.result) setConfirmOpen(true);
    else void runExtraction();
  }

  const result = state?.result ?? null;

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
          <Button disabled={running || (state ? !state.canExtract : true)} onClick={onRunClick}>
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
          {result?.prevMd && (
            <Button variant="ghost" onClick={() => setShowPrev((v) => !v)}>
              {showPrev ? 'Hide previous' : 'View previous'}
            </Button>
          )}
        </div>
      </header>

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

      {running && (
        <p className="font-mono text-[12px] text-text-faint">
          Running map/reduce over your chunks. This can take a few minutes on a local model — keep
          this tab open.
        </p>
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
