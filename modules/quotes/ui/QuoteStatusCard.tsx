import {
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from '@/modules/quotes/domain/quotes';
import { formatDate } from '@/utils/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { QUOTE_STATUS_TONE } from '@/lib/constants/status-colors';

function getStatusMeta(
  status: QuoteStatus,
  validUntil: string | null | undefined
) {
  switch (status) {
    case 'draft':
      return validUntil
        ? `Valid until ${formatDate(validUntil)}`
        : 'Saved only';
    case 'sent':
      return validUntil
        ? `Valid until ${formatDate(validUntil)}`
        : 'Waiting for response';
    case 'approved':
      return null;
    case 'rejected':
      return null;
    case 'expired':
      return validUntil
        ? `Expired on ${formatDate(validUntil)}`
        : 'No longer valid';
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
    <div className="border-outline-variant bg-surface-container-low rounded-xl border px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-on-surface-variant text-xs font-bold tracking-wide uppercase">
          Status
        </p>
        <StatusBadge
          tone={QUOTE_STATUS_TONE[status] ?? 'neutral'}
          label={QUOTE_STATUS_LABELS[status]}
        />
      </div>
      {meta && <p className="text-on-surface-variant mt-2 text-xs">{meta}</p>}
    </div>
  );
}
