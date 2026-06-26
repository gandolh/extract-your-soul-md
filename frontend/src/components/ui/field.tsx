// FieldLabel (monospace eyebrow above an input) + shared input/textarea classes.
import type { ReactNode } from 'react';
import { cx } from './cx';

export function FieldLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx(
        'block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary',
        className,
      )}
    >
      {children}
    </label>
  );
}

export const FIELD_CLASS =
  'w-full rounded-md border border-hairline bg-surface-card px-3 py-2.5 font-sans text-[14px] ' +
  'text-text-primary placeholder:text-text-faint transition-colors ' +
  'focus:border-outline focus:outline-none focus:ring-2 focus:ring-primary-wash';
