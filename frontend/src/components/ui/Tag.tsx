import { type ReactNode } from 'react';
import { cx } from './cx';

/* --- Tag / chip ---------------------------------------------------- */
export function Tag({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-surface-container text-text-faint',
    accent: 'bg-primary-wash text-primary',
    success: 'bg-tertiary-container text-on-tertiary-fixed',
  } as const;
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-sm px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.06em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
