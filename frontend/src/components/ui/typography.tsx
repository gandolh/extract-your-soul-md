// Eyebrow + Headline — the Clinical Voice Instrument's text markers
// (corpus/wiki/sources-raw/design.md): monospace eyebrows, tight sans headlines.
import { type ReactNode } from 'react';
import { cx } from './cx';

/* --- Eyebrow: monospace section marker ----------------------------- */
// `as` lets a section eyebrow render as a heading (e.g. h2) so the document
// outline stays gapless under a Headline (h1) without changing the look.
export function Eyebrow({
  children,
  className,
  as: Tag = 'p',
}: {
  children: ReactNode;
  className?: string;
  as?: 'p' | 'h2' | 'h3';
}) {
  return (
    <Tag
      className={cx(
        'flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary',
        className,
      )}
    >
      <span aria-hidden className="inline-block h-px w-5 bg-primary" />
      {children}
    </Tag>
  );
}

/* --- Headline ------------------------------------------------------ */
// `lg` is the headline-lg scale (28px); `xl` is the home-hero step (32px).
const HEADLINE_SIZE = {
  lg: 'text-[28px] leading-[34px]',
  xl: 'text-[32px] leading-[38px]',
} as const;

export function Headline({
  children,
  className,
  size = 'lg',
}: {
  children: ReactNode;
  className?: string;
  size?: keyof typeof HEADLINE_SIZE;
}) {
  return (
    <h1
      className={cx(
        'font-sans font-semibold tracking-[-0.02em] text-text-primary',
        HEADLINE_SIZE[size],
        className,
      )}
    >
      {children}
    </h1>
  );
}
