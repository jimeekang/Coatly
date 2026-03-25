'use client';

import { useEffect } from 'react';

/**
 * global-error.tsx — root layout 자체가 크래시할 때 렌더됩니다.
 * Next.js가 html/body를 직접 이 컴포넌트로 대체하므로, 반드시 <html><body>를 포함해야 합니다.
 * globals.css가 로드되지 않으므로 인라인 스타일로 fallback 처리합니다.
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en-AU">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#ffffff',
          color: '#2C2C2A',
          display: 'flex',
          minHeight: '100dvh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '360px' }}>
          <p
            style={{
              fontSize: '72px',
              fontWeight: 800,
              letterSpacing: '-2px',
              color: '#085041',
              opacity: 0.15,
              lineHeight: 1,
              margin: '0 0 16px',
              userSelect: 'none',
            }}
          >
            500
          </p>
          <h1
            style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}
          >
            Application error
          </h1>
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#5F5E5A',
              margin: '0 0 32px',
            }}
          >
            A critical error occurred. Please refresh the page. If the issue
            persists, contact support.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: '48px',
              padding: '0 24px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#085041',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
