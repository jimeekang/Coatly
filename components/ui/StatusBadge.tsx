import { STATUS_TONE_BG, type StatusTone } from '@/lib/constants/status-colors';

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * Uppercase pill badge for quote/invoice/job status.
 * Always uses MD3 tone tokens via STATUS_TONE_BG.
 */
export function StatusBadge({ tone, label, size = 'sm' }: StatusBadgeProps) {
  const sizeClass =
    size === 'md'
      ? 'px-3 py-1 text-xs tracking-wider'
      : 'px-2.5 py-0.5 text-[10px] tracking-widest';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded font-bold uppercase ${sizeClass} ${STATUS_TONE_BG[tone]}`}
    >
      {label}
    </span>
  );
}
