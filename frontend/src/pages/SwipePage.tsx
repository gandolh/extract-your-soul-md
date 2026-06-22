import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, type SwipeCard } from '../api/client';
import { useGenerateCards, useSetVerdict, useSwipe } from '../api/queries';
import { useToast } from '../components/app/Toaster';
import { Meter } from '../components/app/Layout';
import { Button, buttonClass, Card, cardClass, cx, Eyebrow, Headline, Notice, Tag } from '../components/ui';

// Past this many px of horizontal drag, releasing commits the swipe.
const COMMIT_PX = 110;
// How long the fling-off animation runs before we persist + advance.
const FLING_MS = 240;

export function SwipePage() {
  const toast = useToast();
  const swipeQuery = useSwipe();
  const generate = useGenerateCards();
  const setVerdict = useSetVerdict();

  const state = swipeQuery.data ?? null;
  const cards = useMemo(() => state?.cards ?? [], [state]);
  const queue = useMemo(() => cards.filter((c) => c.verdict === null), [cards]);

  const judged = cards.length - queue.length;
  const confirmed = cards.filter((c) => c.verdict === 'yes').length;

  // Drag + fling state for the top card. `exiting` holds the direction while the
  // card animates off-screen; persistence is deferred until the animation ends
  // so the card stays rendered as it flies out.
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<null | 'yes' | 'no'>(null);
  const startX = useRef(0);

  const top = queue[0] ?? null;

  const reset = useCallback(() => {
    setDragX(0);
    setDragging(false);
    setExiting(null);
  }, []);

  // Reset transient drag state whenever the active card changes.
  useEffect(() => {
    reset();
  }, [top?.id, reset]);

  const commit = useCallback(
    (card: SwipeCard, verdict: 'yes' | 'no') => {
      if (exiting) return; // already animating one out
      setExiting(verdict);
      setDragX(verdict === 'yes' ? window.innerWidth : -window.innerWidth);
      window.setTimeout(() => {
        setVerdict.mutate({ id: card.id, verdict });
        // The optimistic cache update drops this card from `queue`; the
        // top-change effect resets drag state for the next card.
      }, FLING_MS);
    },
    [exiting, setVerdict],
  );

  // Keyboard: ← = not me, → = sounds like me.
  useEffect(() => {
    if (!top || exiting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') commit(top, 'yes');
      else if (e.key === 'ArrowLeft') commit(top, 'no');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [top, exiting, commit]);

  function onPointerDown(e: React.PointerEvent) {
    if (exiting) return;
    setDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || exiting) return;
    setDragX(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (!dragging || exiting || !top) return;
    setDragging(false);
    if (dragX > COMMIT_PX) commit(top, 'yes');
    else if (dragX < -COMMIT_PX) commit(top, 'no');
    else setDragX(0); // snap back
  }

  function runGenerate() {
    generate.mutate(undefined, {
      onSuccess: (r) => {
        const added = r.cards.length - cards.length;
        toast(added > 0 ? `Added ${added} card${added === 1 ? '' : 's'}.` : 'No new cards this time — try again.', added > 0 ? 'ok' : 'err');
      },
      onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not generate cards.', 'err'),
    });
  }

  // ---- gating / empty states ----------------------------------------------
  const loading = swipeQuery.isLoading;
  const canGenerate = state?.canGenerate ?? false;
  const ollamaReady = state?.ollamaReady ?? false;
  const generating = generate.isPending;

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-section">
      <header className="flex flex-col gap-3">
        <Eyebrow>Cards</Eyebrow>
        <Headline>Does this sound like you?</Headline>
        <p className="text-[14px] leading-[22px] text-text-secondary">
          We turned your study answers into first-person statements. Swipe each one — right if it
          sounds like you, left if it doesn’t. The ones you confirm are folded into your profile.
        </p>
        {cards.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
              {judged} / {cards.length} swiped · {confirmed} confirmed
            </span>
            <div className="max-w-[420px] flex-1">
              <Meter completed={judged} total={cards.length} />
            </div>
          </div>
        )}
      </header>

      {loading && <p className="font-mono text-[12px] text-text-faint">Loading…</p>}

      {/* No study answers yet → cards can't be generated. */}
      {!loading && !canGenerate && (
        <Notice tone="err" className="max-w-[64ch]">
          Cards are built from your study answers. Answer a{' '}
          <Link to="/studies" className="underline">
            study
          </Link>{' '}
          first, then come back here.
        </Notice>
      )}

      {/* Ollama gate (only relevant once there's material to generate from). */}
      {!loading && canGenerate && !ollamaReady && (
        <Notice tone="err" className="max-w-[64ch]">
          {state?.ollamaReason ?? 'The Ollama server is not reachable.'} Cards are generated locally
          through Ollama, so it must be running.
        </Notice>
      )}

      {/* Deck empty but generatable → teaching empty state. */}
      {!loading && canGenerate && cards.length === 0 && (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-[14px] text-text-secondary">
            No cards yet. Generate a deck of statements from your answers, then swipe through them.
          </p>
          <Button disabled={!ollamaReady || generating} onClick={runGenerate}>
            {generating ? (
              <>
                <span className="spin" /> Generating…
              </>
            ) : (
              'Generate cards'
            )}
          </Button>
        </Card>
      )}

      {/* The deck. */}
      {!loading && top && (
        <div className="flex flex-col items-center gap-6">
          <CardStack
            queue={queue}
            dragX={dragX}
            dragging={dragging}
            exiting={exiting}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />

          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Not me"
              disabled={!!exiting}
              onClick={() => commit(top, 'no')}
              className={cx(
                'grid h-14 w-14 place-items-center rounded-full border-2 border-hairline text-[20px] text-text-secondary transition-colors hover:border-text-faint hover:text-text-primary disabled:opacity-40',
              )}
            >
              ✕
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-faint">
              ← not me · sounds like me →
            </span>
            <button
              type="button"
              aria-label="Sounds like me"
              disabled={!!exiting}
              onClick={() => commit(top, 'yes')}
              className="grid h-14 w-14 place-items-center rounded-full border-2 border-primary-strong bg-primary-wash text-[20px] text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-40"
            >
              ✓
            </button>
          </div>
        </div>
      )}

      {/* Deck exhausted (all swiped). */}
      {!loading && canGenerate && cards.length > 0 && !top && (
        <Card className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <Tag tone="accent">Deck complete</Tag>
          </div>
          <p className="text-[14px] text-text-secondary">
            You swiped all {cards.length} cards and confirmed {confirmed}. Those feed your{' '}
            <Link to="/results" className="text-primary hover:text-primary-strong">
              profile
            </Link>{' '}
            when you generate it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={!ollamaReady || generating} onClick={runGenerate}>
              {generating ? (
                <>
                  <span className="spin" /> Generating…
                </>
              ) : (
                'Generate more cards'
              )}
            </Button>
            <Link className={buttonClass('primary')} to="/results">
              Go to profile →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

// The visible card stack: the active (top) card plus up to two peeking behind it
// for depth. Only the top card is draggable; a yes/no tint and stamp track the
// drag direction.
function CardStack({
  queue,
  dragX,
  dragging,
  exiting,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  queue: SwipeCard[];
  dragX: number;
  dragging: boolean;
  exiting: null | 'yes' | 'no';
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  const visible = queue.slice(0, 3);
  const dir = exiting ?? (dragX > 0 ? 'yes' : dragX < 0 ? 'no' : null);
  const intensity = Math.min(1, Math.abs(dragX) / COMMIT_PX);

  return (
    <div className="relative h-[300px] w-full max-w-[460px] select-none">
      {visible
        .map((card, depth) => {
          const isTop = depth === 0;
          const rotate = isTop ? dragX / 22 : 0;
          const translateX = isTop ? dragX : 0;
          // Cards behind sit slightly smaller and lower for a stacked look.
          const restScale = 1 - depth * 0.04;
          const restY = depth * 12;
          const style: React.CSSProperties = isTop
            ? {
                transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
                transition: dragging ? 'none' : `transform ${FLING_MS}ms ease-out`,
                zIndex: 30,
                cursor: dragging ? 'grabbing' : 'grab',
                touchAction: 'pan-y',
              }
            : {
                transform: `translateY(${restY}px) scale(${restScale})`,
                transition: 'transform 200ms ease-out',
                zIndex: 30 - depth,
              };
          return (
            <div
              key={card.id}
              style={style}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerCancel={isTop ? onPointerUp : undefined}
              className={cardClass(
                'absolute inset-0 flex flex-col items-center justify-center px-8 py-10 text-center shadow-sm',
              )}
            >
              {/* yes / no stamp on the top card while dragging */}
              {isTop && dir && (
                <span
                  style={{ opacity: intensity }}
                  className={cx(
                    'absolute top-5 rounded-md border-2 px-3 py-1 font-mono text-[13px] font-semibold uppercase tracking-[0.12em]',
                    dir === 'yes'
                      ? 'left-5 -rotate-12 border-primary-strong text-primary'
                      : 'right-5 rotate-12 border-text-secondary text-text-secondary',
                  )}
                >
                  {dir === 'yes' ? 'Me' : 'Not me'}
                </span>
              )}
              <p className="text-[20px] font-medium leading-[28px] tracking-[-0.01em] text-text-primary">
                {card.statement}
              </p>
            </div>
          );
        })
        // Render back-to-front so the top card paints last (and on top).
        .reverse()}
    </div>
  );
}
