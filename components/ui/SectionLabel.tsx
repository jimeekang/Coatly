import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionLabelElement = 'p' | 'span' | 'div';

interface SectionLabelProps {
  as?: SectionLabelElement;
  children: ReactNode;
  className?: string;
}

/** Canonical overline label for compact sections and field groups. */
export function SectionLabel({
  as: Component = 'p',
  children,
  className,
}: SectionLabelProps) {
  return (
    <Component
      className={cn(
        'text-on-surface-variant text-[11px] font-bold tracking-[0.14em] uppercase',
        className
      )}
    >
      {children}
    </Component>
  );
}
