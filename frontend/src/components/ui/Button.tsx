import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type Variant = 'primary' | 'secondary' | 'ghost';

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
