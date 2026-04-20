import type { Database as BaseDatabase, Json as GeneratedJson } from '@/types/database';
import type { MaterialItemCategory } from '@/lib/supabase/validators';

type BaseSubscriptionsTable = BaseDatabase['public']['Tables']['subscriptions'];

type ExtendedSubscriptionsRow = Omit<
  BaseSubscriptionsTable['Row'],
  'cancel_at' | 'cancel_at_period_end'
> & {
  cancel_at: string | null;
  cancel_at_period_end: boolean;
};

type ExtendedSubscriptionsInsert = Omit<
  BaseSubscriptionsTable['Insert'],
  'cancel_at' | 'cancel_at_period_end'
> & {
  cancel_at?: string | null;
  cancel_at_period_end?: boolean;
};

type ExtendedSubscriptionsUpdate = Omit<
  BaseSubscriptionsTable['Update'],
  'cancel_at' | 'cancel_at_period_end'
> & {
  cancel_at?: string | null;
  cancel_at_period_end?: boolean;
};

type MaterialItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: MaterialItemCategory;
  unit: string;
  unit_price_cents: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type MaterialItemInsert = {
  id?: string;
  user_id: string;
  name: string;
  category?: MaterialItemCategory;
  unit?: string;
  unit_price_cents?: number;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

type MaterialItemUpdate = Partial<Omit<MaterialItemInsert, 'user_id'>>;

type QuoteLineItemRow = {
  id: string;
  quote_id: string;
  material_item_id: string | null;
  name: string;
  category: MaterialItemCategory;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  notes: string | null;
  is_optional: boolean;
  is_selected: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type QuoteLineItemInsert = {
  id?: string;
  quote_id: string;
  material_item_id?: string | null;
  name: string;
  category?: MaterialItemCategory;
  unit?: string;
  quantity?: number;
  unit_price_cents?: number;
  total_cents?: number;
  notes?: string | null;
  is_optional?: boolean;
  is_selected?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

type QuoteLineItemUpdate = Partial<Omit<QuoteLineItemInsert, 'quote_id'>>;

type QuoteTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  payload: GeneratedJson;
  created_at: string;
  updated_at: string;
};

type QuoteTemplateInsert = {
  id?: string;
  user_id: string;
  name: string;
  payload?: GeneratedJson;
  created_at?: string;
  updated_at?: string;
};

type QuoteTemplateUpdate = Partial<Omit<QuoteTemplateInsert, 'user_id'>>;

type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

type JobRow = {
  id: string;
  user_id: string;
  customer_id: string;
  quote_id: string | null;
  title: string;
  status: JobStatus;
  scheduled_date: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  google_calendar_event_id: string | null;
  google_calendar_id: string | null;
  schedule_source: 'manual' | 'google_booking_sync';
  google_sync_status: 'not_synced' | 'synced' | 'failed';
  google_sync_error: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type JobInsert = {
  id?: string;
  user_id: string;
  customer_id: string;
  quote_id?: string | null;
  title: string;
  status?: JobStatus;
  scheduled_date: string;
  start_date?: string | null;
  end_date?: string | null;
  duration_days?: number | null;
  google_calendar_event_id?: string | null;
  google_calendar_id?: string | null;
  schedule_source?: 'manual' | 'google_booking_sync';
  google_sync_status?: 'not_synced' | 'synced' | 'failed';
  google_sync_error?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type JobUpdate = Partial<Omit<JobInsert, 'user_id'>>;

type GoogleCalendarConnectionRow = {
  user_id: string;
  google_account_email: string;
  google_account_subject: string;
  encrypted_refresh_token: string;
  granted_scopes: string[];
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

type GoogleCalendarConnectionInsert = {
  user_id: string;
  google_account_email: string;
  google_account_subject: string;
  encrypted_refresh_token: string;
  granted_scopes?: string[];
  is_active?: boolean;
  last_sync_at?: string | null;
  last_sync_error?: string | null;
  created_at?: string;
  updated_at?: string;
};

type GoogleCalendarConnectionUpdate = Partial<GoogleCalendarConnectionInsert>;

type GoogleCalendarSettingsRow = {
  user_id: string;
  display_calendar_id: string;
  availability_calendar_id: string;
  event_destination_calendar_id: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

type GoogleCalendarSettingsInsert = {
  user_id: string;
  display_calendar_id?: string;
  availability_calendar_id?: string;
  event_destination_calendar_id?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
};

type GoogleCalendarSettingsUpdate = Partial<Omit<GoogleCalendarSettingsInsert, 'user_id'>>;

export type AppDatabase = Omit<BaseDatabase, 'public'> & {
  public: Omit<BaseDatabase['public'], 'Tables'> & {
    Tables: Omit<BaseDatabase['public']['Tables'], 'subscriptions'> & {
      subscriptions: Omit<BaseSubscriptionsTable, 'Row' | 'Insert' | 'Update'> & {
        Row: ExtendedSubscriptionsRow;
        Insert: ExtendedSubscriptionsInsert;
        Update: ExtendedSubscriptionsUpdate;
      };
      material_items: {
        Row: MaterialItemRow;
        Insert: MaterialItemInsert;
        Update: MaterialItemUpdate;
        Relationships: [];
      };
      quote_line_items: {
        Row: QuoteLineItemRow;
        Insert: QuoteLineItemInsert;
        Update: QuoteLineItemUpdate;
        Relationships: [];
      };
      quote_templates: {
        Row: QuoteTemplateRow;
        Insert: QuoteTemplateInsert;
        Update: QuoteTemplateUpdate;
        Relationships: [];
      };
      jobs: {
        Row: JobRow;
        Insert: JobInsert;
        Update: JobUpdate;
        Relationships: [
          {
            foreignKeyName: 'jobs_customer_user_fk';
            columns: ['customer_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'jobs_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      google_calendar_connections: {
        Row: GoogleCalendarConnectionRow;
        Insert: GoogleCalendarConnectionInsert;
        Update: GoogleCalendarConnectionUpdate;
        Relationships: [];
      };
      google_calendar_settings: {
        Row: GoogleCalendarSettingsRow;
        Insert: GoogleCalendarSettingsInsert;
        Update: GoogleCalendarSettingsUpdate;
        Relationships: [];
      };
    };
  };
};
