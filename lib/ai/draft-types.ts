export type WorkspaceDraftEntity = 'customer' | 'quote' | 'invoice';
export type WorkspaceRecordType = WorkspaceDraftEntity;

export type WorkspaceBusinessContext = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type WorkspaceCustomerContext = {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type WorkspaceQuoteContext = {
  id: string;
  quote_number: string;
  title: string | null;
  customer_id: string;
  customer_name: string | null;
  status: string;
  total_cents: number;
  valid_until: string | null;
};

export type WorkspaceInvoiceContext = {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string | null;
  quote_id: string | null;
  quote_number: string | null;
  status: string;
  invoice_type: string;
  total_cents: number;
  due_date: string | null;
};

export type AICustomerDraft = {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postcode: string;
  notes: string;
};

export type AIQuoteSurfaceDraft = {
  surface_type: 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows';
  coating_type:
    | 'touch_up_1coat'
    | 'repaint_2coat'
    | 'new_plaster_3coat'
    | 'stain'
    | 'specialty';
  area_m2: number;
  rate_per_m2_cents: number;
  notes: string | null;
};

export type AIQuoteRoomDraft = {
  name: string;
  room_type: 'interior' | 'exterior';
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  surfaces: AIQuoteSurfaceDraft[];
};

export type AIQuoteDraft = {
  customer_id: string | null;
  title: string;
  status: 'draft' | 'sent';
  valid_until: string;
  tier: 'good' | 'better' | 'best';
  labour_margin_percent: number;
  material_margin_percent: number;
  notes: string;
  internal_notes: string;
  rooms: AIQuoteRoomDraft[];
};

export type AIInvoiceDraft = {
  customer_id: string | null;
  quote_id: string | null;
  invoice_type: 'full' | 'deposit' | 'progress' | 'final';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  notes: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
  }>;
};

export type WorkspaceDraftResult = {
  entity: WorkspaceDraftEntity;
  summary: string;
  warnings: string[];
  customer: AICustomerDraft | null;
  quote: AIQuoteDraft | null;
  invoice: AIInvoiceDraft | null;
};

export type WorkspaceAssistantIntent =
  | 'create_customer'
  | 'create_quote'
  | 'create_invoice'
  | 'search'
  | 'answer';

export type WorkspaceAssistantMatch = {
  type: WorkspaceRecordType;
  id: string;
  title: string;
  subtitle: string;
  description: string | null;
  href: string;
  badge: string | null;
  amount_cents: number | null;
  date_label: string | null;
  reason: string;
};

export type WorkspaceAssistantResult = {
  intent: WorkspaceAssistantIntent;
  summary: string;
  answer: string | null;
  warnings: string[];
  matches: WorkspaceAssistantMatch[];
  customer: AICustomerDraft | null;
  quote: AIQuoteDraft | null;
  invoice: AIInvoiceDraft | null;
};
