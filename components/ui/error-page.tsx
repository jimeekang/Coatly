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
        <p className="mb-2 text-6xl font-extrabold tracking-tight text-primary opacity-20 select-none">
          {code}
        </p>
      )}

      {/* 아이콘 */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-outline bg-surface-container-low text-on-surface-variant">
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

      <h1 className="mb-2 text-xl font-bold text-on-surface">{title}</h1>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-on-surface-variant">{description}</p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-12 rounded-xl bg-primary px-6 text-base font-semibold text-on-primary transition-colors hover:bg-primary/90 active:bg-primary/90"
          >
            Try again
          </button>
        )}
        {showHome && (
          <Link
            href="/dashboard"
            className="h-12 rounded-xl border border-outline bg-white px-6 text-base font-medium text-on-surface transition-colors hover:bg-surface-container-low active:bg-surface-container-low inline-flex items-center"
          >
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
