'use client';

import { useEffect } from 'react';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function InvoicesError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[InvoicesError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <ErrorAlert className="max-w-md">
        Something went wrong loading your invoices. Your data is safe — please
        try again.
      </ErrorAlert>
      <button
        type="button"
        onClick={reset}
        className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 active:bg-primary/90 inline-flex min-h-11 items-center justify-center rounded-xl px-6 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Try again
      </button>
    </div>
  );
}
