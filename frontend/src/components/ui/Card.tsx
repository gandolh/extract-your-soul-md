// Card: pure-white, hairline, razor-thin shadow.
import { type HTMLAttributes } from 'react';
import { cx } from './cx';

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
