import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCustomerAddress } from '@/modules/customers/domain/customer-address';
import { syncBookedJobToGoogleCalendar as syncBookedJobToGoogleCalendarEvent } from '@/modules/schedule/infrastructure/google-calendar/service';
import type { AppDatabase } from '@/types/app-database';

/**
 * Application-layer wrapper that exposes the Google Calendar job-sync
 * operations to other modules (e.g. jobs) without letting them reach into
 * schedule's infrastructure directly. schedule/application is allowed to
 * call schedule/infrastructure; consumers depend on this boundary instead.
 *
 * The customer site address is composed here (application may import the
 * customers domain) and passed down as a plain value, so schedule's
 * infrastructure never depends on the customers module at runtime.
 */
export {
  deleteGoogleCalendarEventForJob,
  getGoogleBusyDatesForUser,
} from '@/modules/schedule/infrastructure/google-calendar/service';

type SyncBookedJobToGoogleCalendarInput = {
  supabase: SupabaseClient<AppDatabase>;
  userId: string;
  jobId: string;
  quoteId: string;
  quoteNumber: string;
  quoteTitle: string | null;
  customerId: string;
  startDate: string;
  endDate: string;
};

export async function syncBookedJobToGoogleCalendar(
  input: SyncBookedJobToGoogleCalendarInput
) {
  const { data: customer } = await input.supabase
    .from('customers')
    .select('address_line1, address_line2, city, state, postcode')
    .eq('id', input.customerId)
    .eq('user_id', input.userId)
    .maybeSingle();

  return syncBookedJobToGoogleCalendarEvent({
    ...input,
    customerAddress: buildCustomerAddress(customer),
  });
}
