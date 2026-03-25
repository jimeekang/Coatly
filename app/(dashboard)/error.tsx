'use client';

import { useEffect } from 'react';
import { ErrorPage } from '@/components/ui/error-page';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 프로덕션에서 에러 리포팅 서비스로 전달
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <ErrorPage
      code={500}
      title="Something went wrong"
      description="We hit an unexpected error loading this page. Your data is safe — please try again."
      onRetry={reset}
      showHome
    />
  );
}
