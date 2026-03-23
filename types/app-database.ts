import type { Database as BaseDatabase } from '@/types/database';

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

export type AppDatabase = Omit<BaseDatabase, 'public'> & {
  public: Omit<BaseDatabase['public'], 'Tables'> & {
    Tables: Omit<BaseDatabase['public']['Tables'], 'subscriptions'> & {
      subscriptions: Omit<BaseSubscriptionsTable, 'Row' | 'Insert' | 'Update'> & {
        Row: ExtendedSubscriptionsRow;
        Insert: ExtendedSubscriptionsInsert;
        Update: ExtendedSubscriptionsUpdate;
      };
    };
  };
};
