import type { Database as BaseDatabase } from '@/types/database';
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
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

type QuoteLineItemUpdate = Partial<Omit<QuoteLineItemInsert, 'quote_id'>>;

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
    };
  };
};
