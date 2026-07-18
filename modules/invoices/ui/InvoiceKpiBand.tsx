import type { InvoiceSummary } from '@/modules/invoices/domain/invoices';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { formatAUD } from '@/utils/format';

type KpiVariant = 'warning' | 'positive' | 'neutral';

const VARIANT_STYLES: Record<KpiVariant, { tile: string; value: string }> = {
  warning: {
    tile: 'bg-warning-container border-warning/20',
    value: 'text-warning',
  },
  positive: {
    tile: 'bg-success-container border-success/20',
    value: 'text-success',
  },
  neutral: {
    tile: 'bg-surface-container-low border-transparent',
    value: 'text-on-surface',
  },
};

function KpiTile({
  label,
  value,
  hint,
  variant,
}: {
  label: string;
  value: string;
  hint: string;
  variant: KpiVariant;
}) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div className={`rounded-xl border p-5 ${styles.tile}`}>
      <SectionLabel className="mb-3.5">{label}</SectionLabel>
      <p
        className={`text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em] tabular-nums sm:text-[32px] ${styles.value}`}
      >
        {value}
      </p>
      <p className="text-on-surface-variant mt-2 text-xs">{hint}</p>
    </div>
  );
}

/**
 * "This month" KPI band shown above the invoice list.
 * Surfaces outstanding balance, overdue exposure, and money collected this month.
 */
export function InvoiceKpiBand({ summary }: { summary: InvoiceSummary }) {
  const {
    outstanding_cents,
    overdue_cents,
    overdue_count,
    paid_this_month_cents,
  } = summary;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionLabel>This month</SectionLabel>
      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3.5">
        <KpiTile
          variant="warning"
          label="Outstanding"
          value={formatAUD(outstanding_cents)}
          hint="Unpaid balance across sent & overdue invoices"
        />
        <KpiTile
          variant={overdue_cents > 0 ? 'warning' : 'neutral'}
          label="Overdue"
          value={formatAUD(overdue_cents)}
          hint={
            overdue_count > 0
              ? `${overdue_count} invoice${overdue_count === 1 ? '' : 's'} past due`
              : 'Nothing past due — nice work.'
          }
        />
        <KpiTile
          variant="positive"
          label="Paid this month"
          value={formatAUD(paid_this_month_cents)}
          hint="Settled invoices, Sydney time"
        />
      </div>
    </section>
  );
}
