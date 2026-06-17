import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { cx } from './ui';

type Tone = 'ok' | 'err' | 'info';
interface Toast { id: number; message: string; tone: Tone; }

const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});

const TONE: Record<Tone, string> = {
  info: 'bg-inverse-surface text-inverse-on-surface',
  ok: 'bg-tertiary text-on-tertiary',
  err: 'bg-error text-on-error',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, message, tone }]);
    // Scale dwell with reading time (~10 chars/sec) so long messages aren't
    // gone before a slow reader finishes; clamp to a 4–9s window.
    const ms = Math.min(9000, Math.max(4000, message.length * 100));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-toast flex flex-col gap-2">
        {/* Errors announce assertively; ok/info politely. Two regions so a
            screen reader interrupts for failures but not for confirmations. */}
        {(['err', 'polite'] as const).map((channel) => (
          <div
            key={channel}
            role={channel === 'err' ? 'alert' : 'status'}
            aria-live={channel === 'err' ? 'assertive' : 'polite'}
            className="contents"
          >
            {toasts
              .filter((t) => (channel === 'err' ? t.tone === 'err' : t.tone !== 'err'))
              .map((t) => (
                <div
                  key={t.id}
                  className={cx(
                    'min-w-[220px] rounded-md px-4 py-3 font-mono text-[12px] shadow-card',
                    TONE[t.tone],
                  )}
                >
                  {t.message}
                </div>
              ))}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
