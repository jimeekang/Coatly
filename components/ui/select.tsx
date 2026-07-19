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
    ref
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
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

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={[
              'bg-surface-container-lowest h-12 w-full appearance-none rounded-xl border pr-10 pl-4',
              'text-on-surface text-base transition-colors',
              'focus:ring-primary/20 focus:ring-2 focus:outline-none',
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
          <span className="text-on-surface-variant pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>

        {error && <p className="text-error text-xs">{error}</p>}
        {hint && !error && (
          <p className="text-on-surface-variant text-xs">{hint}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
