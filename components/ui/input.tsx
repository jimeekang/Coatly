'use client';

import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'prefix'
> {
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
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-on-surface block text-sm font-semibold"
          >
            {label}
            {required && <span className="text-error ml-0.5">*</span>}
            {optional && (
              <span className="text-on-surface-variant ml-1.5 text-xs font-normal">
                (optional)
              </span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {prefix && (
            <span className="text-on-surface-variant pointer-events-none absolute left-3.5 flex items-center">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'bg-surface-container-lowest text-on-surface h-12 w-full rounded-xl border px-4 text-base',
              'placeholder:text-on-surface-variant/70 transition-colors',
              'focus:ring-primary/20 focus:ring-2 focus:outline-none',
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
            <span className="text-on-surface-variant pointer-events-none absolute right-3.5 flex items-center">
              {suffix}
            </span>
          )}
        </div>

        {error && <p className="text-error text-xs">{error}</p>}
        {hint && !error && (
          <p className="text-on-surface-variant text-xs">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
