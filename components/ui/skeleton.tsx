import { type HTMLAttributes } from 'react';

// ── Base ─────────────────────────────────────────────────────────────

export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['animate-pulse rounded-md bg-pm-border/60', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      {...props}
    />
  );
}

// ── Composed ─────────────────────────────────────────────────────────

/** 텍스트 라인 블록 */
export function SkeletonText({
  lines = 2,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={['h-4', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'].join(' ')}
        />
      ))}
    </div>
  );
}

/** 통계 카드 1개 */
export function SkeletonStat() {
  return (
    <div className="rounded-lg bg-pm-surface p-5">
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="mb-2 h-7 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** 카드 블록 */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-pm-border bg-white p-4">
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 테이블 로우 */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className={['h-4', i === 0 ? 'w-28' : 'w-20'].join(' ')} />
        </td>
      ))}
    </tr>
  );
}

/** 전체 테이블 스켈레톤 */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-pm-border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-pm-border bg-pm-surface">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-5 py-3">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-pm-border">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 모바일 리스트 카드 스켈레톤 */
export function SkeletonListCard({ count = 5 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="rounded-xl border border-pm-border bg-white px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="mt-1 h-5 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── 페이지별 스켈레톤 ─────────────────────────────────────────────────

/** Dashboard 페이지 */
export function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-8 h-4 w-80" />

      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
      </section>

      <SkeletonCard rows={4} />
    </div>
  );
}

/** 리스트 페이지 (Quotes / Customers / Invoices) */
export function ListPageSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {/* 검색 + 필터 영역 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* 모바일 리스트 */}
      <div className="sm:hidden">
        <SkeletonListCard count={5} />
      </div>

      {/* 데스크탑 테이블 */}
      <div className="hidden sm:block">
        <SkeletonTable rows={6} cols={cols} />
      </div>
    </div>
  );
}

/** 상세 페이지 (Quote/Invoice detail) */
export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <SkeletonCard rows={5} />
      <SkeletonCard rows={3} />
    </div>
  );
}
