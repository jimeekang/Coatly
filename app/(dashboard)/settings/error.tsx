'use client';

import { useEffect } from 'react';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SettingsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[SettingsError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <ErrorAlert className="max-w-md">
        Something went wrong loading your settings. Your data is safe — please try again.
      </ErrorAlert>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-on-primary transition-colors hover:bg-primary/90 active:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
