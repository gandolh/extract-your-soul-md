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
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
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
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
