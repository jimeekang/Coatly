/**
 * Single source of truth for status → Material Design 3 token mapping.
 * Used by StatusBadge, list cards, schedule calendar, etc.
 */

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export const STATUS_TONE_BG: Record<StatusTone, string> = {
  neutral: 'bg-surface-container-highest text-on-surface-variant',
  info:    'bg-primary/10 text-primary',
  success: 'bg-success-container text-success',
  warning: 'bg-warning-container text-on-warning-container',
  error:   'bg-error-container text-error',
};

export const STATUS_TONE_BORDER: Record<StatusTone, string> = {
  neutral: 'border-l-outline',
  info:    'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  error:   'border-l-error',
};

export const STATUS_TONE_DOT: Record<StatusTone, string> = {
  neutral: 'bg-outline',
  info:    'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error:   'bg-error',
};

// ── Quote ────────────────────────────────────────────────────────────────────
export const QUOTE_STATUS_TONE = {
  draft:    'neutral',
  sent:     'info',
  approved: 'success',
  rejected: 'error',
  expired:  'neutral',
} as const satisfies Record<string, StatusTone>;

// ── Invoice ──────────────────────────────────────────────────────────────────
export const INVOICE_STATUS_TONE = {
  draft:     'neutral',
  sent:      'info',
  paid:      'success',
  overdue:   'error',
  cancelled: 'neutral',
} as const satisfies Record<string, StatusTone>;

// ── Job / Schedule ───────────────────────────────────────────────────────────
export const JOB_STATUS_TONE = {
  scheduled:   'info',
  in_progress: 'warning',
  completed:   'success',
  cancelled:   'error',
} as const satisfies Record<string, StatusTone>;
