'use client';

import { useState, type InputHTMLAttributes } from 'react';

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'defaultValue' | 'onChange' | 'type' | 'value'
> & {
  value: string;
  onValueChange: (value: string) => void;
  sanitize?: (value: string) => string;
};

export function sanitizeDecimalInput(value: string): string {
  const stripped = value.replace(/[^0-9.]/g, '');
  const firstDotIndex = stripped.indexOf('.');

  if (firstDotIndex === -1) {
    return stripped;
  }

  return `${stripped.slice(0, firstDotIndex + 1)}${stripped
    .slice(firstDotIndex + 1)
    .replace(/\./g, '')}`;
}

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function NumericInput({
  value,
  onValueChange,
  sanitize,
  inputMode = 'decimal',
  onBlur,
  onFocus,
  pattern,
  ...props
}: NumericInputProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  if (!focused && draft !== value) {
    setDraft(value);
  }

  return (
    <input
      {...props}
      type="text"
      inputMode={inputMode}
      pattern={pattern ?? (inputMode === 'numeric' ? '[0-9]*' : '[0-9]*[.]?[0-9]*')}
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onChange={(event) => {
        const nextValue = sanitize ? sanitize(event.target.value) : event.target.value;
        setDraft(nextValue);
        onValueChange(nextValue);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
    />
  );
}
