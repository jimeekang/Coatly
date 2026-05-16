'use client';

import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      required,
      optional,
      options,
      placeholder,
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-on-surface">
            {label}
            {required && <span className="ml-0.5 text-error">*</span>}
            {optional && (
              <span className="ml-1.5 text-xs font-normal text-on-surface-variant">(optional)</span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={[
              'h-12 w-full appearance-none rounded-xl border bg-white pl-4 pr-10',
              'text-base text-on-surface transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              error
                ? 'border-error focus:border-error'
                : 'border-outline-variant focus:border-primary',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>

        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
