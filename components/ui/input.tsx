'use client';

import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      required,
      optional,
      prefix,
      suffix,
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-on-surface">
            {label}
            {required && <span className="ml-0.5 text-error">*</span>}
            {optional && (
              <span className="ml-1.5 text-xs font-normal text-on-surface-variant">(optional)</span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {prefix && (
            <span className="pointer-events-none absolute left-3.5 flex items-center text-on-surface-variant">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'h-12 w-full rounded-xl border bg-white px-4 text-base text-on-surface',
              'placeholder:text-on-surface-variant/70 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              error
                ? 'border-error focus:border-error'
                : 'border-outline-variant focus:border-primary',
              prefix ? 'pl-10' : '',
              suffix ? 'pr-10' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3.5 flex items-center text-on-surface-variant">
              {suffix}
            </span>
          )}
        </div>

        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
