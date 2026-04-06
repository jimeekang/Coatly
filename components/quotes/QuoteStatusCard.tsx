import { QUOTE_STATUS_LABELS, type QuoteStatus } from '@/lib/quotes';
import { formatDate } from '@/utils/format';

const STATUS_STYLES: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-sky-100 text-sky-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  expired: 'bg-amber-100 text-amber-800',
};

function getStatusMeta(status: QuoteStatus, validUntil: string | null | undefined) {
  switch (status) {
    case 'draft':
      return validUntil ? `Valid until ${formatDate(validUntil)}` : 'Saved only';
    case 'sent':
      return validUntil ? `Valid until ${formatDate(validUntil)}` : 'Waiting for response';
    case 'approved':
      return null;
    case 'rejected':
      return null;
    case 'expired':
      return validUntil ? `Expired on ${formatDate(validUntil)}` : 'No longer valid';
  }
}

export function QuoteStatusCard({
  status,
  validUntil,
}: {
  status: QuoteStatus;
  validUntil?: string | null;
}) {
  const meta = getStatusMeta(status, validUntil);

  return (
    <div className="rounded-xl border border-pm-border bg-pm-surface px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
            Status
          </p>
        </div>
        <span
          className={[
            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
            STATUS_STYLES[status],
          ].join(' ')}
        >
          {QUOTE_STATUS_LABELS[status]}
        </span>
      </div>
      {meta && <p className="mt-2 text-xs text-pm-secondary">{meta}</p>}
    </div>
  );
}
