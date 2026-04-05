import type { RatePreset as UserRatePreset } from '@/lib/rate-settings';
import type { AppDatabase } from '@/types/app-database';
import type { Json as GeneratedJson } from '@/types/database';

export type Json = GeneratedJson;
export type Database = AppDatabase;

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Business = Tables<'businesses'>;
export type Customer = Tables<'customers'>;
export type Invoice = Tables<'invoices'>;
export type InvoiceLineItem = Tables<'invoice_line_items'>;
export type Job = Tables<'jobs'>;
export type JobInsert = Insert<'jobs'>;
export type JobUpdate = Update<'jobs'>;
export type Quote = Tables<'quotes'>;
export type QuoteInsert = Insert<'quotes'>;
export type QuoteUpdate = Update<'quotes'>;
export type QuoteRoom = Tables<'quote_rooms'>;
export type QuoteRoomInsert = Insert<'quote_rooms'>;
export type QuoteRoomUpdate = Update<'quote_rooms'>;
export type QuoteRoomSurface = Tables<'quote_room_surfaces'>;
export type QuoteRoomSurfaceInsert = Insert<'quote_room_surfaces'>;
export type QuoteRoomSurfaceUpdate = Update<'quote_room_surfaces'>;

// "QuoteLineItem" is the app-level name for rows stored in quote_estimate_items.
export type QuoteLineItem = Tables<'quote_estimate_items'>;
export type QuoteLineItemInsert = Insert<'quote_estimate_items'>;
export type QuoteLineItemUpdate = Update<'quote_estimate_items'>;
export type QuoteEstimateItem = QuoteLineItem;
export type QuoteTemplate = Tables<'quote_templates'>;
export type QuoteTemplateInsert = Insert<'quote_templates'>;
export type QuoteTemplateUpdate = Update<'quote_templates'>;

export type RatePreset = UserRatePreset;
export type RatePresetJson = Database['public']['Tables']['businesses']['Row']['default_rates'];
