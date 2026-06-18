import { type ReactNode } from 'react';
import { cx } from './cx';

/* --- Notice (inline status) ---------------------------------------- */
export function Notice({
  children,
  tone = 'err',
  className,
}: {
  children: ReactNode;
  tone?: 'ok' | 'err';
  className?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-md px-3 py-2 font-mono text-[12px]',
        tone === 'err'
          ? 'bg-error-container text-on-error-container'
          : 'bg-tertiary-container text-on-tertiary-fixed',
        className,
      )}
    >
      {children}
    </div>
  );
}
