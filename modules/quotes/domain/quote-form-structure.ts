export type QuoteScopeStepView = {
  id: string;
  section_id: string;
  step_type: string;
  label: string | null;
  description: string;
  prep_type: string | null;
  paint_system: string | null;
  coats_min: number | null;
  coats_max: number | null;
  product_name: string | null;
  colour_status: string | null;
  colour: string | null;
  sheen: string | null;
  requires_confirmation: boolean;
  is_customer_visible: boolean;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type QuoteScopeSectionView = {
  id: string;
  quote_id: string;
  section_kind: string;
  title: string;
  description: string | null;
  area_label: string | null;
  surface_category: string | null;
  is_optional: boolean;
  is_selected: boolean;
  pricing_status: string;
  measurement_status: string;
  source: string;
  metadata: Record<string, unknown>;
  maintenance_job_pack: string | null;
  visible_defects: string[];
  priority: string | null;
  report_context: boolean;
  unsupported_scope: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  steps: QuoteScopeStepView[];
};

export type QuoteClauseItemView = {
  id: string;
  quote_id: string;
  section_id: string | null;
  clause_key: string;
  category: string;
  title: string;
  body: string;
  severity: string;
  source: string;
  is_customer_visible: boolean;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type QuoteScopeSectionRow = Omit<
  QuoteScopeSectionView,
  | 'steps'
  | 'maintenance_job_pack'
  | 'visible_defects'
  | 'priority'
  | 'report_context'
  | 'unsupported_scope'
> & {
  metadata: unknown;
};

type QuoteScopeStepRow = QuoteScopeStepView & {
  metadata: unknown;
};

type QuoteClauseItemRow = QuoteClauseItemView & {
  metadata: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value == null || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim() !== ''
  );
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function compareSortOrder<T extends { sort_order: number; id: string }>(
  left: T,
  right: T
) {
  return left.sort_order - right.sort_order || left.id.localeCompare(right.id);
}

export function mapQuoteScopeSections(
  sectionRows: QuoteScopeSectionRow[],
  stepRows: QuoteScopeStepRow[]
): QuoteScopeSectionView[] {
  const visibleSteps = stepRows
    .filter((step) => step.is_customer_visible)
    .map((step) => ({
      ...step,
      metadata: asRecord(step.metadata),
    }))
    .sort(compareSortOrder);

  return sectionRows
    .map((section) => {
      const metadata = asRecord(section.metadata);

      return {
        ...section,
        metadata,
        maintenance_job_pack: asString(metadata.maintenance_job_pack),
        visible_defects: asStringArray(metadata.visible_defects),
        priority: asString(metadata.priority),
        report_context: asBoolean(metadata.report_context),
        unsupported_scope: asString(metadata.unsupported_scope),
        steps: visibleSteps.filter((step) => step.section_id === section.id),
      };
    })
    .sort(compareSortOrder);
}

export function mapQuoteClauseItems(
  clauseRows: QuoteClauseItemRow[]
): QuoteClauseItemView[] {
  return clauseRows
    .filter((clause) => clause.is_customer_visible)
    .map((clause) => ({
      ...clause,
      metadata: asRecord(clause.metadata),
    }))
    .sort(compareSortOrder);
}
