'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type'
> & {
  id: string;
  label: string;
  error?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ id, label, error, disabled, ...props }, ref) {
    const [isVisible, setIsVisible] = useState(false);
    const errorId = `${id}-error`;
    const toggleLabel = `${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`;

    return (
      <div>
        <label
          htmlFor={id}
          className="text-on-surface mb-1.5 block text-sm font-medium"
        >
          {label}
        </label>
        <div className="relative">
          <input
            {...props}
            ref={ref}
            id={id}
            type={isVisible ? 'text' : 'password'}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border px-4 pr-12 text-base focus:ring-2 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            aria-label={toggleLabel}
            aria-pressed={isVisible}
            title={toggleLabel}
            disabled={disabled}
            onClick={() => setIsVisible((visible) => !visible)}
            className="text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus-visible:ring-primary/30 absolute top-0.5 right-0.5 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVisible ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        {error ? (
          <p id={errorId} className="text-error mt-1.5 text-sm">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
