'use client';

import { useEffect } from 'react';
import { ErrorPage } from '@/components/ui/error-page';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[RootError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white">
      <ErrorPage
        code={500}
        title="Something went wrong"
        description="An unexpected error occurred. Please try again or return to the dashboard."
        onRetry={reset}
        showHome
      />
    </div>
  );
}
