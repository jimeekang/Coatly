'use client';

import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export function FormFooter({
  children,
  className,
  contentClassName,
  ...props
}: {
  children: ReactNode;
  contentClassName?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-outline-variant bg-surface-container-lowest/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-4 md:bottom-0 md:left-60 md:px-6 lg:left-64',
        className,
      )}
      {...props}
    >
      <div className={cn('mx-auto flex w-full max-w-lg gap-3', contentClassName)}>
        {children}
      </div>
    </div>
  );
}

export function FormFooterButton({
  variant = 'primary',
  className,
  ...props
}: {
  variant?: 'primary' | 'secondary';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex h-14 items-center justify-center rounded-xl px-4 text-base font-semibold transition-colors disabled:cursor-not-allowed',
        variant === 'primary'
          ? 'bg-primary text-on-primary hover:bg-primary/90 disabled:bg-surface-container-high disabled:text-outline disabled:hover:bg-surface-container-high'
          : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low disabled:text-outline',
        className,
      )}
      {...props}
    />
  );
}
