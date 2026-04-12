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
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type JobUpdate = Partial<Omit<JobInsert, 'user_id'>>;

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
    };
  };
};
