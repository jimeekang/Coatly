import type { Metadata } from 'next';
import { ErrorPage } from '@/components/ui/error-page';

export const metadata: Metadata = { title: 'Page Not Found' };

export default function NotFound() {
  return (
    <ErrorPage
      code={404}
      title="Page not found"
      description="We couldn't find what you were looking for. It may have been moved or deleted."
      showHome
    />
  );
}
