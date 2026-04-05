import type { JobUpsertInput } from '@/lib/supabase/validators';

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
  notes: string | null;
  created_at: string;
  updated_at: string;
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
