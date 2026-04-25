import type { JobUpsertInput } from '@/lib/supabase/validators';

export type JobVariation = {
  id: string;
  job_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  notes: string | null;
  sort_order: number;
};

export type JobQuoteLineItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  is_optional: boolean;
  is_selected: boolean;
  sort_order: number;
};

export type JobInvoiceSummary = {
  id: string;
  invoice_number: string;
  status: string;
  total_cents: number;
};

export type JobDetail = JobListItem & {
  quoteLineItems: JobQuoteLineItem[];
  variations: JobVariation[];
  invoice: JobInvoiceSummary | null;
};

export const JOB_STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

export type JobStatus = keyof typeof JOB_STATUS_LABELS;

export type JobListItem = {
  id: string;
  customer_id: string;
  quote_id: string | null;
  title: string;
  status: JobStatus;
  scheduled_date: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  google_calendar_event_id: string | null;
  google_calendar_id: string | null;
  google_sync_status: string;
  google_sync_error: string | null;
  customer: {
    id: string;
    name: string;
    company_name: string | null;
    email: string | null;
    address: string | null;
  };
  quote: {
    id: string;
    quote_number: string;
    title: string | null;
    status: string;
  } | null;
};

export type JobCustomerOption = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  address: string | null;
};

export type JobQuoteOption = {
  id: string;
  quote_number: string;
  title: string | null;
  customer_id: string;
  status: string;
};

export type JobFormInput = JobUpsertInput;
