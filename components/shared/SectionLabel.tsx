import { createElement, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SectionLabelProps = HTMLAttributes<HTMLElement> & {
  as?: 'p' | 'span' | 'h2' | 'h3' | 'label' | 'legend';
  htmlFor?: string;
};

/**
 * Canonical overline label (micro heading) — replaces the ad-hoc
 * `text-[10px|10.5px|11px] font-bold uppercase tracking-[...]` copies.
 * See docs/DESIGN.md · Typography · 마이크로 라벨.
 */
export function SectionLabel({ as = 'p', className, ...props }: SectionLabelProps) {
  return createElement(as, {
    ...props,
    className: cn(
      'text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant',
      className,
    ),
  });
}
