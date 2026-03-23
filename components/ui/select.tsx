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
          <label htmlFor={selectId} className="block text-sm font-medium text-pm-body">
            {label}
            {required && <span className="ml-0.5 text-pm-coral">*</span>}
            {optional && (
              <span className="ml-1.5 text-xs font-normal text-pm-secondary">(optional)</span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={[
              'h-12 w-full appearance-none rounded-lg border bg-white pl-4 pr-10',
              'text-base text-pm-body transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30',
              error
                ? 'border-pm-coral focus:border-pm-coral'
                : 'border-pm-border focus:border-pm-teal-mid',
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
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-pm-secondary">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>

        {error && <p className="text-xs text-pm-coral">{error}</p>}
        {hint && !error && <p className="text-xs text-pm-secondary">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
