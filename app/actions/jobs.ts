'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  getGoogleBusyDatesForUser,
  syncBookedJobToGoogleCalendar,
} from '@/lib/google-calendar/service';
import {
  buildBookingRange,
  isNswNonWorkingDate,
} from '@/lib/calendar/nsw-public-holidays';
import { buildQuoteCustomerAddress } from '@/lib/quotes';
import type {
  JobCustomerOption,
  JobDetail,
  JobListItem,
  JobQuoteOption,
} from '@/lib/jobs';
import {
  getActiveSubscriptionRequiredMessage,
  getSubscriptionSnapshotForUser,
} from '@/lib/subscription/access';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import type { Customer, Job, Quote } from '@/lib/supabase/types';
import { jobUpsertSchema, type JobUpsertInput } from '@/lib/supabase/validators';

type JoinedCustomer = Pick<
  Customer,
  'id' | 'name' | 'company_name' | 'email' | 'address_line1' | 'city' | 'state' | 'postcode'
>;

type JoinedQuote = Pick<Quote, 'id' | 'quote_number' | 'title' | 'status' | 'customer_id'>;

type QuoteCreateJobRow = Pick<JoinedQuote, 'id' | 'quote_number' | 'title' | 'customer_id'>;
type JobScheduleRecord = Pick<
  JobRow,
  'id' | 'quote_id' | 'status' | 'scheduled_date' | 'start_date' | 'end_date'
>;

type JobRow = Pick<
  Job,
  | 'id'
  | 'customer_id'
  | 'quote_id'
  | 'title'
  | 'status'
  | 'scheduled_date'
  | 'start_date'
  | 'end_date'
  | 'duration_days'
  | 'notes'
  | 'created_at'
  | 'updated_at'
  | 'google_calendar_event_id'
  | 'google_calendar_id'
  | 'google_sync_status'
  | 'google_sync_error'
>;

const JOB_LIST_SELECT =
  'id, customer_id, quote_id, title, status, scheduled_date, start_date, end_date, duration_days, notes, created_at, updated_at, google_calendar_event_id, google_calendar_id, google_sync_status, google_sync_error';
const CUSTOMER_JOIN_SELECT = 'id, name, company_name, email, address_line1, city, state, postcode';
const QUOTE_JOIN_SELECT = 'id, quote_number, title, status, customer_id';

function buildCustomerOption(customer: JoinedCustomer): JobCustomerOption {
  return {
    id: customer.id,
    name: customer.name,
    company_name: customer.company_name,
    email: customer.email,
    address: buildQuoteCustomerAddress(customer),
  };
}

function uniqueValues(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function toJobStatus(status: string): JobListItem['status'] {
  if (
    status === 'scheduled' ||
    status === 'in_progress' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return status;
  }

  return 'scheduled';
}

function sortUniqueDateValues(dates: string[]): string[] {
  return [...new Set(dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort();
}

function buildDateRangeValues(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDaysToDateValue(current, 1);
  }
  return dates;
}

function fallbackScheduleDates(job: Pick<JobRow, 'scheduled_date' | 'start_date' | 'end_date'>): string[] {
  const startDate = job.start_date ?? job.scheduled_date;
  const endDate = job.end_date ?? startDate;
  return buildDateRangeValues(startDate, endDate);
}

function mapJobListItem(
  job: JobRow,
  customer: JoinedCustomer | null,
  quote: JoinedQuote | null,
  scheduleDates: string[],
): JobListItem | null {
  if (!customer) {
    return null;
  }

  return {
    id: job.id,
    customer_id: job.customer_id,
    quote_id: job.quote_id,
    title: job.title,
    status: toJobStatus(job.status),
    scheduled_date: job.scheduled_date,
    start_date: job.start_date,
    end_date: job.end_date,
    schedule_dates: scheduleDates.length > 0 ? scheduleDates : fallbackScheduleDates(job),
    duration_days: job.duration_days,
    notes: job.notes,
    created_at: job.created_at,
    updated_at: job.updated_at,
    google_calendar_event_id: job.google_calendar_event_id,
    google_calendar_id: job.google_calendar_id,
    google_sync_status: job.google_sync_status,
    google_sync_error: job.google_sync_error,
    customer: buildCustomerOption(customer),
    quote: quote
      ? {
          id: quote.id,
          quote_number: quote.quote_number,
          title: quote.title,
          status: quote.status,
        }
      : null,
  };
}

async function hydrateJobListItems(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  jobs: JobRow[],
): Promise<{ data: JobListItem[]; error: string | null }> {
  const customerIds = uniqueValues(jobs.map((job) => job.customer_id));
  const quoteIds = uniqueValues(jobs.map((job) => job.quote_id));
  const jobIds = uniqueValues(jobs.map((job) => job.id));

  const [customersResult, quotesResult, scheduleDatesResult] = await Promise.all([
    customerIds.length > 0
      ? supabase
          .from('customers')
          .select(CUSTOMER_JOIN_SELECT)
          .eq('user_id', userId)
          .in('id', customerIds)
      : Promise.resolve({ data: [] as JoinedCustomer[], error: null }),
    quoteIds.length > 0
      ? supabase
          .from('quotes')
          .select(QUOTE_JOIN_SELECT)
          .eq('user_id', userId)
          .in('id', quoteIds)
      : Promise.resolve({ data: [] as JoinedQuote[], error: null }),
    jobIds.length > 0
      ? getJobScheduleDatesForJobIds(supabase, userId, jobIds)
      : Promise.resolve({ data: {} as Record<string, string[]>, error: null }),
  ]);

  const error =
    customersResult.error?.message ??
    quotesResult.error?.message ??
    scheduleDatesResult.error ??
    null;
  if (error) {
    return { data: [], error };
  }

  const customersById = new Map(
    ((customersResult.data ?? []) as JoinedCustomer[]).map((customer) => [customer.id, customer]),
  );
  const quotesById = new Map(
    ((quotesResult.data ?? []) as JoinedQuote[]).map((quote) => [quote.id, quote]),
  );

  return {
    data: jobs.flatMap((job) => {
      const mapped = mapJobListItem(
        job,
        customersById.get(job.customer_id) ?? null,
        job.quote_id ? (quotesById.get(job.quote_id) ?? null) : null,
        scheduleDatesResult.data[job.id] ?? [],
      );
      return mapped ? [mapped] : [];
    }),
    error: null,
  };
}

async function getJobScheduleDatesForJobIds(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  jobIds: string[],
): Promise<{ data: Record<string, string[]>; error: string | null }> {
  const uniqueJobIds = [...new Set(jobIds.filter(Boolean))];

  if (uniqueJobIds.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase
    .from('job_schedule_days')
    .select('job_id, date')
    .eq('user_id', userId)
    .in('job_id', uniqueJobIds)
    .order('date', { ascending: true });

  if (error) {
    return { data: {}, error: error.message };
  }

  const datesByJobId: Record<string, string[]> = {};
  for (const row of data ?? []) {
    datesByJobId[row.job_id] = [...(datesByJobId[row.job_id] ?? []), row.date];
  }

  return { data: datesByJobId, error: null };
}

function buildJobTitleFromQuote(quote: QuoteCreateJobRow): string {
  const title = quote.title?.trim();
  return title?.length ? title : `Job for ${quote.quote_number}`;
}

function getTodayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateValue(dateValue: string, days: number): string {
  const [year, month, day] = dateValue.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function summarizeScheduleDates(dates: string[]): {
  scheduledDate: string;
  startDate: string;
  endDate: string;
  durationDays: number;
} {
  const sortedDates = sortUniqueDateValues(dates);
  const firstDate = sortedDates[0] ?? getTodayDateValue();
  const lastDate = sortedDates[sortedDates.length - 1] ?? firstDate;

  return {
    scheduledDate: firstDate,
    startDate: firstDate,
    endDate: lastDate,
    durationDays: sortedDates.length || 1,
  };
}

async function replaceJobScheduleDays(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  jobId: string,
  dates: string[],
): Promise<{ error: string | null }> {
  const sortedDates = sortUniqueDateValues(dates);

  const { error: deleteError } = await supabase
    .from('job_schedule_days')
    .delete()
    .eq('job_id', jobId)
    .eq('user_id', userId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (sortedDates.length === 0) {
    return { error: null };
  }

  const { error: insertError } = await supabase.from('job_schedule_days').insert(
    sortedDates.map((date, index) => ({
      user_id: userId,
      job_id: jobId,
      date,
      sort_order: index,
    })),
  );

  if (insertError) {
    return { error: insertError.message };
  }

  return { error: null };
}

async function loadJobScheduleRecord(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  jobId: string,
): Promise<{
  data: { job: JobScheduleRecord; dates: string[] } | null;
  error: string | null;
}> {
  const { data: existingJob, error: existingJobError } = await supabase
    .from('jobs')
    .select('id, quote_id, status, scheduled_date, start_date, end_date')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingJobError) {
    return { data: null, error: existingJobError.message };
  }

  if (!existingJob) {
    return { data: null, error: 'Job not found.' };
  }

  const { data: existingDays, error: daysError } = await supabase
    .from('job_schedule_days')
    .select('date')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (daysError) {
    return { data: null, error: daysError.message };
  }

  return {
    data: {
      job: existingJob,
      dates:
        existingDays && existingDays.length > 0
          ? sortUniqueDateValues(existingDays.map((day) => day.date))
          : fallbackScheduleDates(existingJob),
    },
    error: null,
  };
}

async function persistJobScheduleDates(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  jobId: string,
  existingJob: JobScheduleRecord,
  dates: string[],
): Promise<{ error: string | null }> {
  const nextDates = sortUniqueDateValues(dates);
  if (nextDates.length < 1 || nextDates.length > 30) {
    return { error: 'Job schedule must be between 1 and 30 days.' };
  }

  const summary = summarizeScheduleDates(nextDates);
  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      scheduled_date: summary.scheduledDate,
      start_date: summary.startDate,
      end_date: summary.endDate,
      duration_days: summary.durationDays,
    })
    .eq('id', jobId)
    .eq('user_id', userId);

  if (updateError) {
    return { error: updateError.message };
  }

  const scheduleResult = await replaceJobScheduleDays(supabase, userId, jobId, nextDates);
  if (scheduleResult.error) {
    return { error: scheduleResult.error };
  }

  if (existingJob.quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, quote_number, title, customer_id')
      .eq('id', existingJob.quote_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (quote) {
      await syncBookedJobToGoogleCalendar({
        supabase,
        userId,
        jobId,
        quoteId: quote.id,
        quoteNumber: quote.quote_number,
        quoteTitle: quote.title,
        customerId: quote.customer_id,
        startDate: summary.startDate,
        endDate: summary.endDate,
      });
    }
  }

  revalidatePath('/jobs');
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/schedule');
  if (existingJob.quote_id) {
    revalidatePath(`/quotes/${existingJob.quote_id}`);
  }

  return { error: null };
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
    .select(JOB_LIST_SELECT)
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return hydrateJobListItems(supabase, user.id, data ?? []);
}

export async function getJobScheduleDatesForJobs(
  jobIds: string[],
): Promise<{ data: Record<string, string[]>; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);
  return getJobScheduleDatesForJobIds(supabase, user.id, jobIds);
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

export async function getJob(id: string): Promise<{ data: JobListItem | null; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const hydrated = await hydrateJobListItems(supabase, user.id, [data]);
  if (hydrated.error) {
    return { data: null, error: hydrated.error };
  }

  return {
    data: hydrated.data[0] ?? null,
    error: null,
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

  const { data: insertedJob, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      customer_id: validation.customerId,
      quote_id: validation.quoteId,
      title: validation.parsed.title.trim(),
      status: validation.parsed.status,
      scheduled_date: validation.parsed.scheduled_date,
      start_date: validation.parsed.scheduled_date,
      end_date: validation.parsed.scheduled_date,
      duration_days: 1,
      notes: validation.notes,
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  const scheduleResult = await replaceJobScheduleDays(
    supabase,
    user.id,
    insertedJob.id,
    [validation.parsed.scheduled_date],
  );
  if (scheduleResult.error) {
    return { error: scheduleResult.error };
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
      start_date: getTodayDateValue(),
      end_date: getTodayDateValue(),
      duration_days: 1,
      notes: null,
    })
    .select('id')
    .single();

  if (insertError) {
    return { error: insertError.message, jobId: null, existing: false };
  }

  const scheduleResult = await replaceJobScheduleDays(supabase, user.id, insertedJob.id, [
    getTodayDateValue(),
  ]);
  if (scheduleResult.error) {
    return { error: scheduleResult.error, jobId: null, existing: false };
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
      start_date: validation.parsed.scheduled_date,
      end_date: validation.parsed.scheduled_date,
      duration_days: 1,
      notes: validation.notes,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  const scheduleResult = await replaceJobScheduleDays(supabase, user.id, id, [
    validation.parsed.scheduled_date,
  ]);
  if (scheduleResult.error) {
    return { error: scheduleResult.error };
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

export async function updateJobSchedule(
  id: string,
  input: { startDate: string; endDate: string },
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

  const startDate = input.startDate.trim();
  const endDate = input.endDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { error: 'Schedule dates must use YYYY-MM-DD.' };
  }

  if (endDate < startDate) {
    return { error: 'End date must be on or after the start date.' };
  }

  const scheduleDates = buildDateRangeValues(startDate, endDate);
  const durationDays = scheduleDates.length;
  if (durationDays < 1 || durationDays > 30) {
    return { error: 'Job schedule must be between 1 and 30 days.' };
  }

  const { data: existingJob, error: existingJobError } = await supabase
    .from('jobs')
    .select('id, quote_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingJobError) {
    return { error: existingJobError.message };
  }

  if (!existingJob) {
    return { error: 'Job not found.' };
  }

  if (existingJob.status !== 'completed' && existingJob.status !== 'cancelled') {
    const { data: overlapResult, error: overlapError } = await supabase.rpc(
      'check_job_date_overlap',
      {
        p_user_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_exclude_job_id: id,
      },
    );

    if (overlapError) {
      return { error: overlapError.message };
    }

    if (overlapResult === true) {
      return { error: 'Those dates overlap another active job.' };
    }
  }

  const { error } = await supabase
    .from('jobs')
    .update({
      scheduled_date: startDate,
      start_date: startDate,
      end_date: endDate,
      duration_days: durationDays,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  const scheduleResult = await replaceJobScheduleDays(supabase, user.id, id, scheduleDates);
  if (scheduleResult.error) {
    return { error: scheduleResult.error };
  }

  if (existingJob.quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, quote_number, title, customer_id')
      .eq('id', existingJob.quote_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (quote) {
      await syncBookedJobToGoogleCalendar({
        supabase,
        userId: user.id,
        jobId: id,
        quoteId: quote.id,
        quoteNumber: quote.quote_number,
        quoteTitle: quote.title,
        customerId: quote.customer_id,
        startDate,
        endDate,
      });
    }
  }

  revalidatePath('/jobs');
  revalidatePath(`/jobs/${id}`);
  revalidatePath('/schedule');
  if (existingJob.quote_id) {
    revalidatePath(`/quotes/${existingJob.quote_id}`);
  }

  return { error: null };
}

export async function updateJobScheduleDay(
  id: string,
  input: { fromDate: string; toDate: string },
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

  const fromDate = input.fromDate.trim();
  const toDate = input.toDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return { error: 'Schedule dates must use YYYY-MM-DD.' };
  }

  if (fromDate === toDate) {
    return { error: null };
  }

  const scheduleRecord = await loadJobScheduleRecord(supabase, user.id, id);
  if (scheduleRecord.error || !scheduleRecord.data) {
    return { error: scheduleRecord.error ?? 'Job not found.' };
  }

  const { job: existingJob, dates: currentDates } = scheduleRecord.data;

  if (!currentDates.includes(fromDate)) {
    return { error: 'That job is not scheduled on the dragged date.' };
  }

  if (currentDates.includes(toDate)) {
    return { error: 'This job is already scheduled on that date.' };
  }

  if (existingJob.status !== 'completed' && existingJob.status !== 'cancelled') {
    const { data: overlapResult, error: overlapError } = await supabase.rpc(
      'check_job_date_overlap',
      {
        p_user_id: user.id,
        p_start_date: toDate,
        p_end_date: toDate,
        p_exclude_job_id: id,
      },
    );

    if (overlapError) {
      return { error: overlapError.message };
    }

    if (overlapResult === true) {
      return { error: 'That day overlaps another active job.' };
    }
  }

  const nextDates = sortUniqueDateValues(
    currentDates.map((date) => (date === fromDate ? toDate : date)),
  );
  return persistJobScheduleDates(supabase, user.id, id, existingJob, nextDates);
}

export async function addJobScheduleDay(
  id: string,
  input: { date: string },
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

  const date = input.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Schedule dates must use YYYY-MM-DD.' };
  }

  const scheduleRecord = await loadJobScheduleRecord(supabase, user.id, id);
  if (scheduleRecord.error || !scheduleRecord.data) {
    return { error: scheduleRecord.error ?? 'Job not found.' };
  }

  const { job: existingJob, dates: currentDates } = scheduleRecord.data;
  if (currentDates.includes(date)) {
    return { error: 'This job is already scheduled on that date.' };
  }

  if (existingJob.status !== 'completed' && existingJob.status !== 'cancelled') {
    const { data: overlapResult, error: overlapError } = await supabase.rpc(
      'check_job_date_overlap',
      {
        p_user_id: user.id,
        p_start_date: date,
        p_end_date: date,
        p_exclude_job_id: id,
      },
    );

    if (overlapError) {
      return { error: overlapError.message };
    }

    if (overlapResult === true) {
      return { error: 'That day overlaps another active job.' };
    }
  }

  return persistJobScheduleDates(supabase, user.id, id, existingJob, [...currentDates, date]);
}

export async function deleteJobScheduleDay(
  id: string,
  input: { date: string },
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

  const date = input.date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Schedule dates must use YYYY-MM-DD.' };
  }

  const scheduleRecord = await loadJobScheduleRecord(supabase, user.id, id);
  if (scheduleRecord.error || !scheduleRecord.data) {
    return { error: scheduleRecord.error ?? 'Job not found.' };
  }

  const { job: existingJob, dates: currentDates } = scheduleRecord.data;
  if (!currentDates.includes(date)) {
    return { error: 'That job is not scheduled on that date.' };
  }

  if (currentDates.length <= 1) {
    return { error: 'A job must keep at least one scheduled day.' };
  }

  return persistJobScheduleDates(
    supabase,
    user.id,
    id,
    existingJob,
    currentDates.filter((scheduledDate) => scheduledDate !== date),
  );
}

/**
 * Books a job from a public quote approval flow.
 * No auth required: user identity is derived from the quote's user_id via the public share token.
 */
export async function bookJobFromPublicQuote(
  token: string,
  startDate: string,
  options: { includeNonWorkingDates?: boolean } = {},
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
  const includeNonWorkingDates = options.includeNonWorkingDates === true;

  if (!includeNonWorkingDates && isNswNonWorkingDate(startDate)) {
    return {
      error: 'Weekends and NSW public holidays are unavailable unless you choose to include them.',
      jobId: null,
    };
  }

  const bookingRange = buildBookingRange(startDate, workingDays, includeNonWorkingDates);
  const endDate = bookingRange.endDate;

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

  const scheduleResult = await replaceJobScheduleDays(
    supabase,
    quote.user_id,
    insertedJob.id,
    bookingRange.scheduledDates,
  );
  if (scheduleResult.error) {
    return { error: scheduleResult.error, jobId: null };
  }

  await syncBookedJobToGoogleCalendar({
    supabase,
    userId: quote.user_id,
    jobId: insertedJob.id,
    quoteId: quote.id,
    quoteNumber: quote.quote_number,
    quoteTitle: quote.title,
    customerId: quote.customer_id,
    startDate,
    endDate,
  });

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
  const today = getTodayDateValue();

  const googleBusy = await getGoogleBusyDatesForUser({
    supabase,
    userId: quote.user_id,
    timeMin: `${today}T00:00:00.000Z`,
    timeMax: `${addDaysToDateValue(today, 365)}T23:59:59.999Z`,
  });

  const mergedBlockedDates = [...new Set([...blockedDates, ...googleBusy.blockedDates])].sort();

  return { blockedDates: mergedBlockedDates, workingDays, error: null };
}

export async function getJobDetail(id: string): Promise<{ data: JobDetail | null; error: string | null }> {
  const [supabase, user] = await Promise.all([createServerClient(), requireCurrentUser()]);

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const hydrated = await hydrateJobListItems(supabase, user.id, [data]);
  if (hydrated.error) {
    return { data: null, error: hydrated.error };
  }

  const base = hydrated.data[0];
  if (!base) return { data: null, error: null };

  const [lineItemsResult, variationsResult, invoiceResult] = await Promise.all([
    data.quote_id
      ? supabase
          .from('quote_line_items')
          .select('id, name, quantity, unit_price_cents, total_cents, is_optional, is_selected, sort_order')
          .eq('quote_id', data.quote_id)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('job_variations')
      .select('id, job_id, name, quantity, unit_price_cents, total_cents, notes, sort_order')
      .eq('job_id', data.id)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    data.quote_id
      ? supabase
          .from('invoices')
          .select('id, invoice_number, status, total_cents')
          .eq('quote_id', data.quote_id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    data: {
      ...base,
      quoteLineItems: (lineItemsResult.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity),
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
        is_optional: item.is_optional ?? false,
        is_selected: item.is_selected ?? true,
        sort_order: item.sort_order,
      })),
      variations: (variationsResult.data ?? []).map((v) => ({
        id: v.id,
        job_id: v.job_id,
        name: v.name,
        quantity: Number(v.quantity),
        unit_price_cents: v.unit_price_cents,
        total_cents: v.total_cents,
        notes: v.notes,
        sort_order: v.sort_order,
      })),
      invoice: invoiceResult.data
        ? {
            id: invoiceResult.data.id,
            invoice_number: invoiceResult.data.invoice_number,
            status: invoiceResult.data.status,
            total_cents: invoiceResult.data.total_cents,
          }
        : null,
    },
    error: null,
  };
}

export async function retryJobGoogleCalendarSync(
  id: string,
): Promise<{ error: string | null; synced: boolean }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, customer_id, quote_id, scheduled_date, start_date, end_date')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (jobError) {
    return { error: jobError.message, synced: false };
  }

  if (!job) {
    return { error: 'Job not found.', synced: false };
  }

  if (!job.quote_id) {
    return { error: 'Only jobs created from quotes can be synced to Google Calendar.', synced: false };
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, quote_number, title, customer_id')
    .eq('id', job.quote_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (quoteError) {
    return { error: quoteError.message, synced: false };
  }

  if (!quote) {
    return { error: 'Linked quote was not found.', synced: false };
  }

  const result = await syncBookedJobToGoogleCalendar({
    supabase,
    userId: user.id,
    jobId: job.id,
    quoteId: quote.id,
    quoteNumber: quote.quote_number,
    quoteTitle: quote.title,
    customerId: quote.customer_id,
    startDate: job.start_date ?? job.scheduled_date,
    endDate: job.end_date ?? job.start_date ?? job.scheduled_date,
  });

  revalidatePath(`/jobs/${job.id}`);
  revalidatePath('/schedule');

  return { error: result.error, synced: result.synced };
}

export type JobVariationInput = {
  name: string;
  quantity: number;
  unit_price_cents: number;
  notes?: string | null;
};

export async function saveJobVariations(
  jobId: string,
  variations: JobVariationInput[],
): Promise<{ error: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: existingJob } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingJob) return { error: 'Job not found.' };

  const { error: deleteError } = await supabase
    .from('job_variations')
    .delete()
    .eq('job_id', jobId)
    .eq('user_id', user.id);

  if (deleteError) return { error: deleteError.message };

  if (variations.length > 0) {
    const rows = variations.map((v, i) => ({
      job_id: jobId,
      user_id: user.id,
      name: v.name.trim(),
      quantity: v.quantity,
      unit_price_cents: v.unit_price_cents,
      total_cents: Math.round(v.quantity * v.unit_price_cents),
      notes: v.notes?.trim() || null,
      sort_order: i,
    }));

    const { error: insertError } = await supabase.from('job_variations').insert(rows);
    if (insertError) return { error: insertError.message };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/edit`);
  return { error: null };
}
