'use client';

import {
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export const formLabelClassName =
  'mb-1.5 block text-sm font-semibold text-on-surface';

export const formControlClassName =
  'h-12 w-full scroll-mb-40 rounded-xl border border-outline-variant bg-white px-4 text-base text-on-surface placeholder:text-on-surface-variant transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:scroll-mb-32';

export const formTextareaClassName =
  'w-full scroll-mb-40 rounded-xl border border-outline-variant bg-white px-4 py-3 text-base text-on-surface placeholder:text-on-surface-variant transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:scroll-mb-32';

export const formDisabledControlClassName =
  'flex h-12 w-full items-center rounded-xl border border-outline-variant bg-surface-container-low px-4 text-base text-on-surface-variant';

type FormFieldBaseProps = {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
};

type FormInputFieldProps = FormFieldBaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
    as?: 'input';
  };

type FormTextareaFieldProps = FormFieldBaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> & {
    as: 'textarea';
  };

export type FormFieldProps = FormInputFieldProps | FormTextareaFieldProps;

export function FormRequiredIndicator() {
  return <span className="ml-0.5 text-error">*</span>;
}

export function FormOptionalIndicator() {
  return (
    <span className="ml-1.5 text-xs font-normal text-on-surface-variant">
      (optional)
    </span>
  );
}

export function FormLabel({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn(formLabelClassName, className)} {...props}>
      {children}
    </label>
  );
}

export function FormField(props: FormFieldProps) {
  const {
    label,
    htmlFor,
    error,
    required,
    optional,
    className,
    as = 'input',
    ...controlProps
  } = props;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div>
      <FormLabel htmlFor={htmlFor}>
        {label}
        {required && <FormRequiredIndicator />}
        {optional && <FormOptionalIndicator />}
      </FormLabel>

      {as === 'textarea' ? (
        <textarea
          id={htmlFor}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(formTextareaClassName, className)}
          {...(controlProps as Omit<
            TextareaHTMLAttributes<HTMLTextAreaElement>,
            'id' | 'className'
          >)}
        />
      ) : (
        <input
          id={htmlFor}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(formControlClassName, className)}
          {...(controlProps as Omit<
            InputHTMLAttributes<HTMLInputElement>,
            'id' | 'className'
          >)}
        />
      )}

      {error && (
        <p id={errorId} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
