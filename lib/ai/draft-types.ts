import type {
  MaintenanceJobPackId,
  QuoteJobType,
  QuoteScopeMeasurementStatus,
  QuoteScopePricingStatus,
  QuoteScopePriority,
  QuoteScopeSectionKind,
} from '@/types/quote';

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

export type AIQuoteDraftInput = {
  prompt: string;
  job_type?: QuoteJobType;
  maintenance_job_pack?: MaintenanceJobPackId;
  property_context?: string | null;
  visible_defects?: string[];
  access_notes?: string | null;
  rough_measurements?: string | null;
  photo_refs?: Array<{
    id?: string;
    storage_path?: string;
    url?: string;
    description?: string;
  }>;
};

export type AIQuoteScopeStep = {
  client_id?: string;
  step_type:
    | 'prep'
    | 'primer'
    | 'topcoat'
    | 'repair'
    | 'paint_system'
    | 'colour_note'
    | 'special_note'
    | 'exclusion_note';
  label?: string;
  description: string;
  prep_type?: string;
  paint_system?: string;
  coats_min?: number;
  coats_max?: number;
  product_name?: string;
  colour_status?: 'confirmed' | 'partial' | 'to_confirm' | 'not_applicable';
  colour?: string;
  sheen?: string;
  requires_confirmation?: boolean;
  is_customer_visible?: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown>;
};

export type AIQuoteScopeSection = {
  client_id?: string;
  section_kind: QuoteScopeSectionKind;
  title: string;
  description?: string;
  area_label?: string;
  surface_category?: string;
  is_optional?: boolean;
  is_selected?: boolean;
  pricing_status: QuoteScopePricingStatus;
  measurement_status: QuoteScopeMeasurementStatus;
  source: 'ai';
  sort_order?: number;
  metadata?: Record<string, unknown>;
  maintenance_job_pack?: MaintenanceJobPackId;
  visible_defects: string[];
  priority?: QuoteScopePriority;
  report_context?: boolean;
  unsupported_scope?: string;
  steps: AIQuoteScopeStep[];
};

export type AIQuotePricingPath =
  | 'quick_room'
  | 'advanced_interior'
  | 'exterior_surface'
  | 'day_rate'
  | 'manual_service'
  | 'optional_add_on';

export type AIQuotePricingCandidate = {
  client_id?: string;
  label: string;
  description?: string;
  pricing_path: AIQuotePricingPath;
  scope_section_client_id?: string;
  area_label?: string;
  surface_category?: string;
  quantity_label?: string;
  measurement_status: QuoteScopeMeasurementStatus;
  confidence: 'low' | 'medium' | 'high' | 'to_confirm';
  maintenance_job_pack?: MaintenanceJobPackId;
  metadata?: Record<string, unknown>;
};

export type AIQuoteClause = {
  client_id?: string;
  applies_to_section_client_id?: string;
  clause_key: string;
  category:
    | 'inclusion'
    | 'exclusion'
    | 'risk_disclosure'
    | 'warranty'
    | 'payment'
    | 'validity'
    | 'insurance'
    | 'brand_proof';
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  source: 'ai';
  is_customer_visible: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown>;
};

export type AIQuoteQuestionReason =
  | 'missing_information'
  | 'to_confirm'
  | 'refer_to_specialist'
  | 'unsupported_scope';

export type AIQuoteQuestion = {
  question: string;
  reason: AIQuoteQuestionReason;
  related_scope?: string;
  details?: string;
};

export type AIQuoteDraft = {
  job_type: QuoteJobType;
  maintenance_job_pack: MaintenanceJobPackId | null;
  scope_sections: AIQuoteScopeSection[];
  pricing_candidates: AIQuotePricingCandidate[];
  clauses: AIQuoteClause[];
  assumptions: string[];
  questions_for_user: AIQuoteQuestion[];
};

export type AIQuoteValidationResult = {
  draft: AIQuoteDraft;
  warnings: string[];
};

export type AIWorkspaceQuoteSurfaceDraft = {
  surface_type: 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows';
  coating_type:
    | 'refresh_1coat'
    | 'repaint_2coat'
    | 'new_plaster_3coat'
    | 'stain'
    | 'specialty';
  area_m2: number;
  rate_per_m2_cents: number;
  notes: string | null;
};

export type AIWorkspaceQuoteRoomDraft = {
  name: string;
  room_type: 'interior' | 'exterior';
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  surfaces: AIWorkspaceQuoteSurfaceDraft[];
};

export type AIWorkspaceQuoteDraft = {
  customer_id: string | null;
  title: string;
  status: 'draft' | 'sent';
  valid_until: string;
  complexity: 'standard' | 'moderate' | 'complex';
  labour_margin_percent: number;
  material_margin_percent: number;
  notes: string;
  internal_notes: string;
  rooms: AIWorkspaceQuoteRoomDraft[];
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
  quote: AIWorkspaceQuoteDraft | null;
  invoice: AIInvoiceDraft | null;
};
