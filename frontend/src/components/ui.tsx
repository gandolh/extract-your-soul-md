// Shared UI primitives for the Clinical Voice Instrument design system
// (docs/design.md). Thin wrappers over Tailwind utilities so pages read
// cleanly and the clinical vocabulary stays consistent: monospace eyebrows,
// hairline cards, oxblood accent, soft 6px corners, flat-plane interactions.

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

/* --- utility: tiny classnames join --------------------------------- */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* --- Eyebrow: monospace section marker ----------------------------- */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cx(
        'flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-primary',
        className,
      )}
    >
      <span aria-hidden className="inline-block h-px w-5 bg-primary" />
      {children}
    </p>
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

/* --- Button -------------------------------------------------------- */
type Variant = 'primary' | 'secondary' | 'ghost';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.05em] ' +
  'rounded-md px-5 py-2.5 cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-default ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const BTN_VARIANT: Record<Variant, string> = {
  primary: 'bg-primary-strong text-on-primary border border-primary-strong hover:bg-primary',
  secondary:
    'bg-primary-wash text-primary border border-primary-wash hover:border-primary/40',
  ghost:
    'bg-transparent text-text-secondary border border-hairline hover:border-text-faint hover:text-text-primary',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = 'primary', className, ...rest }, ref) {
  return <button ref={ref} className={cx(BTN_BASE, BTN_VARIANT[variant], className)} {...rest} />;
});

// For react-router <Link> styled as a button.
export function buttonClass(variant: Variant = 'primary', className?: string): string {
  return cx(BTN_BASE, BTN_VARIANT[variant], className);
}

/* --- Card: pure-white, hairline, razor-thin shadow ----------------- */
// The single source of truth for the card recipe. Use cardClass() directly
// when the element must be something other than a <div> (e.g. a <Link>) or
// needs a conditional border, so the recipe stays in one place.
export function cardClass(className?: string): string {
  return cx(
    'rounded-md border border-hairline bg-surface-card shadow-card',
    className,
  );
}

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cardClass(cx('p-6', className))} {...rest}>
      {children}
    </div>
  );
}

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

/* --- field label (monospace eyebrow above an input) ---------------- */
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

/* --- shared input/textarea classes --------------------------------- */
export const FIELD_CLASS =
  'w-full rounded-md border border-hairline bg-surface-card px-3 py-2.5 font-sans text-[14px] ' +
  'text-text-primary placeholder:text-text-faint transition-colors ' +
  'focus:border-outline focus:outline-none focus:ring-2 focus:ring-primary-wash';
