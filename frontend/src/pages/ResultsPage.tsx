import { useEffect, useState } from 'react';
import { Dialog } from '@base-ui-components/react/dialog';
import { Link } from 'react-router-dom';
import { api, ApiError, type ResultsState } from '../api/client';
import { useToast } from '../components/Toaster';
import { Markdown } from '../components/Markdown';

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
    <div className="stack stack-6">
      <header className="row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--s-4)' }}>
        <div style={{ maxWidth: '46ch' }}>
          <p className="eyebrow">The profile</p>
          <h1>
            soul<span style={{ color: 'var(--accent)' }}>.</span>md
          </h1>
          <p className="lede" style={{ marginTop: 'var(--s-3)' }}>
            The synthesized voice profile, generated locally from your studies and conversations via
            Ollama. Re-run as you add material.
          </p>
        </div>
        <div className="btn-row">
          <button
            className="btn btn-accent"
            disabled={running || (state ? !state.canExtract : true)}
            onClick={onRunClick}
          >
            {running ? (
              <>
                <span className="spin" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Generating…
              </>
            ) : result ? (
              'Re-run extraction'
            ) : (
              'Generate profile'
            )}
          </button>
          {result?.prevMd && (
            <button className="btn btn-ghost" onClick={() => setShowPrev((v) => !v)}>
              {showPrev ? 'Hide previous' : 'View previous'}
            </button>
          )}
        </div>
      </header>

      {state && !state.canExtract && !result && (
        <p className="notice notice-err" style={{ maxWidth: 'var(--measure)' }}>
          Nothing to extract yet. Answer a <Link to="/studies">study</Link> or{' '}
          <Link to="/import">import a conversation</Link> first.
        </p>
      )}

      {running && (
        <p className="muted mono" style={{ fontSize: '0.82rem' }}>
          Running map/reduce over your chunks. This can take a few minutes on a local model — keep this tab open.
        </p>
      )}

      {result ? (
        <>
          {result.createdAt && (
            <p className="muted mono" style={{ fontSize: '0.72rem', letterSpacing: '0.06em' }}>
              Generated {new Date(result.createdAt + 'Z').toLocaleString()} · via {result.extractor}
            </p>
          )}
          <div className="soul">
            <Markdown source={showPrev && result.prevMd ? result.prevMd : result.soulMd} />
          </div>
          {showPrev && result.prevMd && (
            <p className="tag">Showing the previous version</p>
          )}
        </>
      ) : (
        !running && (
          <div className="panel muted" style={{ maxWidth: 'var(--measure)' }}>
            <p style={{ margin: 0 }}>No profile generated yet.</p>
          </div>
        )
      )}

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26,23,20,0.4)',
              zIndex: 40,
            }}
          />
          <Dialog.Popup
            className="panel"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 41,
              maxWidth: 420,
              width: 'calc(100% - 32px)',
            }}
          >
            <Dialog.Title style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', marginBottom: 'var(--s-2)' }}>
              Re-run extraction?
            </Dialog.Title>
            <Dialog.Description className="muted" style={{ marginBottom: 'var(--s-5)' }}>
              The current profile becomes the “previous version” and is replaced by a freshly
              generated one. This can take a few minutes.
            </Dialog.Description>
            <div className="btn-row">
              <button className="btn btn-accent" onClick={() => void runExtraction()}>
                Re-run
              </button>
              <Dialog.Close className="btn btn-ghost">Cancel</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
