'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { buildQuoteCustomerAddress } from '@/lib/quotes';
import type { JobCustomerOption, JobListItem, JobQuoteOption } from '@/lib/jobs';
import {
  getActiveSubscriptionRequiredMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { jobUpsertSchema, type JobUpsertInput } from '@/lib/supabase/validators';

type JoinedCustomer = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
};

type JoinedQuote = {
  id: string;
  quote_number: string;
  title: string | null;
  status: string;
  customer_id: string;
};

type QuoteCreateJobRow = Pick<JoinedQuote, 'id' | 'quote_number' | 'title' | 'customer_id'>;

type JobListRow = {
  id: string;
  customer_id: string;
  quote_id: string | null;
  title: string;
  status: JobListItem['status'];
  scheduled_date: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer: JoinedCustomer | JoinedCustomer[] | null;
  quote: JoinedQuote | JoinedQuote[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function buildCustomerOption(customer: JoinedCustomer): JobCustomerOption {
  return {
    id: customer.id,
    name: customer.name,
    company_name: customer.company_name,
    email: customer.email,
    address: buildQuoteCustomerAddress(customer),
  };
}

function buildJobTitleFromQuote(quote: QuoteCreateJobRow): string {
  const title = quote.title?.trim();
  return title?.length ? title : `Job for ${quote.quote_number}`;
}

function getTodayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

async function validateJobLinks(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  input: JobUpsertInput,
): Promise<
  | { error: string }
  | {
      customerId: string;
      quoteId: string | null;
      notes: string | null;
      parsed: ReturnType<typeof jobUpsertSchema.parse>;
    }
> {
  const parsed = jobUpsertSchema.safeParse(input);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? 'Job details are invalid.' };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', parsed.data.customer_id)
    .eq('user_id', userId)
    .eq('is_archived', false)
    .maybeSingle();

  if (customerError) {
    return { error: customerError.message };
  }

  if (!customer) {
    return { error: 'Selected customer was not found.' };
  }

  if (parsed.data.quote_id) {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, customer_id')
      .eq('id', parsed.data.quote_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (quoteError) {
      return { error: quoteError.message };
    }

    if (!quote) {
      return { error: 'Selected quote was not found.' };
    }

    if (quote.customer_id !== parsed.data.customer_id) {
      return { error: 'Quote customer does not match the selected customer.' };
    }
  }

  return {
    customerId: parsed.data.customer_id,
    quoteId: parsed.data.quote_id ?? null,
    notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    parsed: parsed.data,
  };
}

export async function getJobs(): Promise<{
  data: JobListItem[];
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id, customer_id, quote_id, title, status, scheduled_date, start_date, end_date, duration_days, notes, created_at, updated_at, customer:customers!jobs_customer_user_fk(id, name, company_name, email, address_line1, city, state, postcode), quote:quotes!jobs_quote_id_fkey(id, quote_number, title, status, customer_id)'
    )
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: ((data as JobListRow[] | null) ?? []).flatMap((job) => {
      const customer = firstRelation(job.customer);
      if (!customer) {
        return [];
      }

      const quote = firstRelation(job.quote);

      return [
        {
          id: job.id,
          customer_id: job.customer_id,
          quote_id: job.quote_id,
          title: job.title,
          status: job.status,
          scheduled_date: job.scheduled_date,
          start_date: job.start_date,
          end_date: job.end_date,
          duration_days: job.duration_days,
          notes: job.notes,
          created_at: job.created_at,
          updated_at: job.updated_at,
          customer: buildCustomerOption(customer),
          quote: quote
            ? {
                id: quote.id,
                quote_number: quote.quote_number,
                title: quote.title,
                status: quote.status,
              }
            : null,
        },
      ];
    }),
    error: null,
  };
}

export async function getJobFormOptions(): Promise<{
  data: {
    customers: JobCustomerOption[];
    quotes: JobQuoteOption[];
  };
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const [customersResult, quotesResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, company_name, email, address_line1, city, state, postcode')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('name', { ascending: true }),
    supabase
      .from('quotes')
      .select('id, quote_number, title, customer_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const error = customersResult.error?.message ?? quotesResult.error?.message ?? null;

  return {
    data: {
      customers: (customersResult.data ?? []).map(buildCustomerOption),
      quotes:
        quotesResult.data?.map((quote) => ({
          id: quote.id,
          quote_number: quote.quote_number,
          title: quote.title,
          customer_id: quote.customer_id,
          status: quote.status,
        })) ?? [],
    },
    error,
  };
}

export async function createJob(input: JobUpsertInput): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('job management') };
  }

  const validation = await validateJobLinks(supabase, user.id, input);
  if ('error' in validation) {
    return { error: validation.error };
  }

  const { error } = await supabase.from('jobs').insert({
    user_id: user.id,
    customer_id: validation.customerId,
    quote_id: validation.quoteId,
    title: validation.parsed.title.trim(),
    status: validation.parsed.status,
    scheduled_date: validation.parsed.scheduled_date,
    notes: validation.notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/jobs');
  if (validation.quoteId) {
    revalidatePath(`/quotes/${validation.quoteId}`);
  }

  return { error: null };
}

export async function createJobFromQuote(quoteId: string): Promise<{
  error: string | null;
  jobId: string | null;
  existing: boolean;
}> {
  if (!quoteId.trim()) {
    return { error: 'Quote not found.', jobId: null, existing: false };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return {
      error: getActiveSubscriptionRequiredMessage('job management'),
      jobId: null,
      existing: false,
    };
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, quote_number, title, customer_id')
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (quoteError) {
    return { error: quoteError.message, jobId: null, existing: false };
  }

  if (!quote) {
    return { error: 'Quote not found.', jobId: null, existing: false };
  }

  const { data: existingJob, error: existingJobError } = await supabase
    .from('jobs')
    .select('id')
    .eq('quote_id', quote.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingJobError) {
    return { error: existingJobError.message, jobId: null, existing: false };
  }

  if (existingJob) {
    revalidatePath('/jobs');
    revalidatePath(`/quotes/${quote.id}`);
    return { error: null, jobId: existingJob.id, existing: true };
  }

  const { data: insertedJob, error: insertError } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      title: buildJobTitleFromQuote(quote),
      status: 'scheduled',
      scheduled_date: getTodayDateValue(),
      notes: null,
    })
    .select('id')
    .single();

  if (insertError) {
    return { error: insertError.message, jobId: null, existing: false };
  }

  revalidatePath('/jobs');
  revalidatePath(`/quotes/${quote.id}`);

  return { error: null, jobId: insertedJob.id, existing: false };
}

export async function createJobFromQuoteAndRedirect(formData: FormData): Promise<void> {
  const quoteId = typeof formData.get('quoteId') === 'string' ? String(formData.get('quoteId')) : '';
  const result = await createJobFromQuote(quoteId);

  if (result.error) {
    redirect(`/quotes/${quoteId}?jobError=${encodeURIComponent(result.error)}`);
  }

  redirect('/jobs');
}

export async function updateJob(
  id: string,
  input: JobUpsertInput,
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('job management') };
  }

  const { data: existingJob, error: existingJobError } = await supabase
    .from('jobs')
    .select('id, quote_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingJobError) {
    return { error: existingJobError.message };
  }

  if (!existingJob) {
    return { error: 'Job not found.' };
  }

  const validation = await validateJobLinks(supabase, user.id, input);
  if ('error' in validation) {
    return { error: validation.error };
  }

  const { error } = await supabase
    .from('jobs')
    .update({
      customer_id: validation.customerId,
      quote_id: validation.quoteId,
      title: validation.parsed.title.trim(),
      status: validation.parsed.status,
      scheduled_date: validation.parsed.scheduled_date,
      notes: validation.notes,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/jobs');
  if (existingJob.quote_id) {
    revalidatePath(`/quotes/${existingJob.quote_id}`);
  }
  if (validation.quoteId && validation.quoteId !== existingJob.quote_id) {
    revalidatePath(`/quotes/${validation.quoteId}`);
  }

  return { error: null };
}

export async function deleteJob(id: string): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getSubscriptionSnapshotForUser(supabase, user.id);
  if (!subscription.active) {
    return { error: getActiveSubscriptionRequiredMessage('job management') };
  }

  const { data: existingJob, error: existingJobError } = await supabase
    .from('jobs')
    .select('id, quote_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingJobError) {
    return { error: existingJobError.message };
  }

  if (!existingJob) {
    return { error: 'Job not found.' };
  }

  const { error } = await supabase.from('jobs').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/jobs');
  if (existingJob.quote_id) {
    revalidatePath(`/quotes/${existingJob.quote_id}`);
  }

  return { error: null };
}

/**
 * Books a job from a public quote approval flow.
 * No auth required: user identity is derived from the quote's user_id via the public share token.
 */
export async function bookJobFromPublicQuote(
  token: string,
  startDate: string,
): Promise<{ error: string | null; jobId: string | null }> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { error: 'Invalid booking link.', jobId: null };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { error: 'Invalid start date format.', jobId: null };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (startDate < today) {
    return { error: 'Start date must be today or in the future.', jobId: null };
  }

  const supabase = createAdminClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, user_id, customer_id, title, quote_number, status, working_days')
    .eq('public_share_token', trimmedToken)
    .maybeSingle();

  if (quoteError) {
    return { error: quoteError.message, jobId: null };
  }

  if (!quote) {
    return { error: 'Quote not found.', jobId: null };
  }

  if (quote.status !== 'approved') {
    return { error: 'Quote must be approved before booking.', jobId: null };
  }

  const workingDays = quote.working_days ?? 1;

  // Use UTC to avoid timezone-shift issues when converting back to ISO date string
  const [sy, sm, sd] = startDate.split('-').map(Number) as [number, number, number];
  const endDate = new Date(Date.UTC(sy, sm - 1, sd + workingDays - 1))
    .toISOString()
    .slice(0, 10);

  const { data: overlapResult, error: overlapError } = await supabase.rpc(
    'check_job_date_overlap',
    { p_user_id: quote.user_id, p_start_date: startDate, p_end_date: endDate },
  );

  if (overlapError) {
    return { error: overlapError.message, jobId: null };
  }

  if (overlapResult === true) {
    return { error: 'The selected dates are not available. Please choose different dates.', jobId: null };
  }

  const title = quote.title?.trim() || `Job for ${quote.quote_number}`;

  const { data: insertedJob, error: insertError } = await supabase
    .from('jobs')
    .insert({
      user_id: quote.user_id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      title,
      status: 'scheduled' as const,
      scheduled_date: startDate,
      start_date: startDate,
      end_date: endDate,
      duration_days: workingDays,
      notes: null,
    })
    .select('id')
    .single();

  if (insertError) {
    return { error: insertError.message, jobId: null };
  }

  revalidatePath('/jobs');
  revalidatePath('/schedule');
  revalidatePath(`/quotes/${quote.id}`);

  return { error: null, jobId: insertedJob.id };
}

/**
 * Returns blocked dates and working days for a public quote booking flow.
 * No auth required: user identity is derived from the quote's user_id via the public share token.
 * Security: only returns date strings — no job details exposed.
 */
export async function getAvailableDatesForToken(
  token: string,
): Promise<{ blockedDates: string[]; workingDays: number; error: string | null }> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { blockedDates: [], workingDays: 1, error: 'Invalid booking link.' };
  }

  const supabase = createAdminClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, user_id, status, working_days')
    .eq('public_share_token', trimmedToken)
    .maybeSingle();

  if (quoteError) {
    return { blockedDates: [], workingDays: 1, error: quoteError.message };
  }

  if (!quote) {
    return { blockedDates: [], workingDays: 1, error: 'Quote not found.' };
  }

  if (quote.status !== 'approved') {
    return { blockedDates: [], workingDays: 1, error: 'Quote must be approved before booking.' };
  }

  const workingDays = quote.working_days ?? 1;

  const { data: blockedRows, error: blockedError } = await supabase.rpc(
    'get_blocked_dates_for_user',
    { p_user_id: quote.user_id },
  );

  if (blockedError) {
    return { blockedDates: [], workingDays, error: blockedError.message };
  }

  const blockedDates = (blockedRows ?? []).map(
    (row: { blocked_date: string }) => row.blocked_date,
  );

  return { blockedDates, workingDays, error: null };
}
