'use client';

import Link from 'next/link';

interface ErrorPageProps {
  code?: string | number;
  title: string;
  description: string;
  /** 재시도 버튼 (error boundary에서 reset 전달) */
  onRetry?: () => void;
  /** 홈으로 이동 링크 표시 여부 */
  showHome?: boolean;
}

export function ErrorPage({
  code,
  title,
  description,
  onRetry,
  showHome = true,
}: ErrorPageProps) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      {/* 코드 */}
      {code && (
        <p className="text-primary mb-2 text-6xl font-extrabold tracking-tight opacity-20 select-none">
          {code}
        </p>
      )}

      {/* 아이콘 */}
      <div className="border-outline bg-surface-container-low text-on-surface-variant mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2">
        {code === 404 || code === '404' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>

      <h1 className="text-on-surface mb-2 text-xl font-bold">{title}</h1>
      <p className="text-on-surface-variant mb-8 max-w-xs text-sm leading-relaxed">
        {description}
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/90 focus-visible:ring-primary focus-visible:ring-offset-surface h-12 rounded-xl px-6 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Try again
          </button>
        )}
        {showHome && (
          <Link
            href="/dashboard"
            className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low active:bg-surface-container-low focus-visible:ring-primary focus-visible:ring-offset-surface inline-flex h-12 items-center rounded-xl border px-6 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
