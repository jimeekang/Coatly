import {
  FORBIDDEN_QUOTE_FORM_PRICE_FIELDS,
  QUOTE_CLAUSE_CATEGORIES,
  QUOTE_CLAUSE_SEVERITIES,
  QUOTE_JOB_TYPES,
  QUOTE_SCOPE_MEASUREMENT_STATUSES,
  QUOTE_SCOPE_PRICING_STATUSES,
  QUOTE_SCOPE_PRIORITIES,
  QUOTE_SCOPE_SECTION_KINDS,
  QUOTE_SCOPE_STEP_TYPES,
} from '@/config/quote-form-taxonomy';
import {
  UNSUPPORTED_MAINTENANCE_SCOPE_KEYWORDS,
  isMaintenanceJobPackId,
} from '@/config/maintenance-job-packs';
import type {
  AIQuoteClause,
  AIQuoteDraft,
  AIQuotePricingCandidate,
  AIQuotePricingPath,
  AIQuoteQuestion,
  AIQuoteQuestionReason,
  AIQuoteScopeSection,
  AIQuoteScopeStep,
  AIQuoteValidationResult,
} from '@/modules/ai/domain/draft-types';
// Structural copies of quote taxonomy unions. Kept local so ai/domain stays
// decoupled from quotes/domain type ownership (domain modules must not import
// each other's types).
type QuoteJobType = 'interior' | 'exterior' | 'both' | 'maintenance';
type MaintenanceJobPackId =
  | 'wall_patch_repaint'
  | 'water_damage_repaint'
  | 'end_of_lease_touch_up'
  | 'pre_sale_refresh'
  | 'exterior_maintenance_repaint'
  | 'deck_stain_maintenance'
  | 'mould_treatment_repaint'
  | 'strata_common_area_touch_up';
type QuoteScopeSectionKind =
  | 'interior'
  | 'exterior'
  | 'maintenance'
  | 'general'
  | 'optional';
type QuoteScopePricingStatus =
  | 'unpriced'
  | 'priced'
  | 'included'
  | 'excluded'
  | 'allowance'
  | 'to_confirm';
type QuoteScopeMeasurementStatus =
  | 'confirmed'
  | 'rough'
  | 'photo_hint'
  | 'to_confirm';

const MAX_SCOPE_SECTIONS = 8;

const PRICING_PATHS = [
  'quick_room',
  'advanced_interior',
  'exterior_surface',
  'day_rate',
  'manual_service',
  'optional_add_on',
] as const satisfies readonly AIQuotePricingPath[];

const CONFIDENCE_VALUES = ['low', 'medium', 'high', 'to_confirm'] as const;

const QUESTION_REASONS = [
  'missing_information',
  'to_confirm',
  'refer_to_specialist',
  'unsupported_scope',
] as const satisfies readonly AIQuoteQuestionReason[];

type WarningSink = {
  warnings: string[];
  warningSet: Set<string>;
};

function addWarning(sink: WarningSink, warning: string) {
  if (sink.warningSet.has(warning)) return;
  sink.warningSet.add(warning);
  sink.warnings.push(warning);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  return readString(record[key]) ?? undefined;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function readEnum<T extends string>(
  values: readonly T[],
  value: unknown
): T | null {
  const stringValue = readString(value);
  if (!stringValue) return null;
  return values.find((item) => item === stringValue) ?? null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const stringValue = readString(item);
    return stringValue ? [stringValue] : [];
  });
}

function readArray(
  value: unknown,
  fieldName: string,
  sink: WarningSink
): unknown[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;

  addWarning(sink, `${fieldName} was ignored because it was not an array.`);
  return [];
}

function readSafeMetadata(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function forbiddenFieldSet(): ReadonlySet<string> {
  return new Set(FORBIDDEN_QUOTE_FORM_PRICE_FIELDS);
}

export function stripForbiddenQuotePriceFields(value: unknown): unknown {
  const forbidden = forbiddenFieldSet();

  function stripNested(nested: unknown): unknown {
    if (Array.isArray(nested)) {
      return nested.map((item) => stripNested(item));
    }

    if (!isRecord(nested)) {
      return nested;
    }

    return Object.fromEntries(
      Object.entries(nested).flatMap(([key, child]) =>
        forbidden.has(key) ? [] : [[key, stripNested(child)]]
      )
    );
  }

  return stripNested(value);
}

function collectText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => collectText(item)).join(' ');
  if (!isRecord(value)) return '';

  return Object.values(value)
    .map((item) => collectText(item))
    .join(' ');
}

function findUnsupportedKeyword(value: unknown): string | null {
  const lowerText = collectText(value).toLowerCase();
  return (
    UNSUPPORTED_MAINTENANCE_SCOPE_KEYWORDS.find((keyword) =>
      lowerText.includes(keyword)
    ) ?? null
  );
}

function isPhotoOnlyExactClaim(value: unknown): boolean {
  const lowerText = collectText(value).toLowerCase();
  const mentionsPhoto =
    lowerText.includes('photo') ||
    lowerText.includes('image') ||
    lowerText.includes('pictured');

  if (!mentionsPhoto) return false;

  return (
    lowerText.includes('exact') ||
    lowerText.includes('fixed price') ||
    lowerText.includes('firm price') ||
    lowerText.includes('final price') ||
    lowerText.includes('measured from photo') ||
    /\b\d+(?:\.\d+)?\s*(?:sqm|m2|square metres?|square meters?)\b/u.test(
      lowerText
    )
  );
}

function addQuestion(
  questions: AIQuoteQuestion[],
  question: AIQuoteQuestion
) {
  const key = `${question.reason}:${question.question}`;
  if (
    questions.some((existing) => `${existing.reason}:${existing.question}` === key)
  ) {
    return;
  }

  questions.push(question);
}

function specialistQuestion(keyword: string, label: string): AIQuoteQuestion {
  return {
    reason: 'refer_to_specialist',
    related_scope: label,
    question: `Confirm whether ${keyword} work in "${label}" should be referred to a licensed specialist and excluded from this painting quote.`,
    details: 'The AI draft cannot price specialist trade work.',
  };
}

function photoConfirmationQuestion(label: string): AIQuoteQuestion {
  return {
    reason: 'to_confirm',
    related_scope: label,
    question: `Confirm measurements and price basis for "${label}" because photo-only details cannot support exact measurements or fixed pricing.`,
    details: 'Use site measurements or painter-confirmed notes before pricing.',
  };
}

function normalizeJobType(value: unknown, sink: WarningSink): QuoteJobType {
  const jobType = readEnum(QUOTE_JOB_TYPES, value);
  if (jobType) return jobType;

  if (value != null) {
    addWarning(sink, `Unsupported job type was defaulted to maintenance.`);
  }

  return 'maintenance';
}

function normalizeTopLevelMaintenancePack(
  value: unknown,
  sink: WarningSink
): MaintenanceJobPackId | null {
  const pack = readString(value);
  if (!pack) return null;
  if (isMaintenanceJobPackId(pack)) return pack;

  addWarning(sink, `Unsupported maintenance job pack was removed: ${pack}`);
  return null;
}

function normalizeOptionalMaintenancePack(
  value: unknown,
  sink: WarningSink
): MaintenanceJobPackId | undefined {
  const pack = readString(value);
  if (!pack) return undefined;
  if (isMaintenanceJobPackId(pack)) return pack;

  addWarning(sink, `Unsupported maintenance job pack was removed: ${pack}`);
  return undefined;
}

function deriveDefaultSectionKind(jobType: QuoteJobType): QuoteScopeSectionKind {
  if (jobType === 'interior' || jobType === 'exterior' || jobType === 'maintenance') {
    return jobType;
  }

  return 'general';
}

function normalizePricingStatus(
  value: unknown,
  fallback: QuoteScopePricingStatus = 'unpriced'
): QuoteScopePricingStatus {
  return readEnum(QUOTE_SCOPE_PRICING_STATUSES, value) ?? fallback;
}

function normalizeMeasurementStatus(
  value: unknown,
  fallback: QuoteScopeMeasurementStatus = 'to_confirm'
): QuoteScopeMeasurementStatus {
  return readEnum(QUOTE_SCOPE_MEASUREMENT_STATUSES, value) ?? fallback;
}

function normalizeScopeStep(
  item: unknown,
  index: number
): AIQuoteScopeStep | null {
  const record = readRecord(item);
  const description = readString(record.description) ?? readString(record.label);
  if (!description) return null;

  const step: AIQuoteScopeStep = {
    step_type: readEnum(QUOTE_SCOPE_STEP_TYPES, record.step_type) ?? 'special_note',
    description,
  };

  const clientId = readOptionalString(record, 'client_id');
  const label = readOptionalString(record, 'label');
  const prepType = readOptionalString(record, 'prep_type');
  const paintSystem = readOptionalString(record, 'paint_system');
  const coatsMin = readInteger(record.coats_min);
  const coatsMax = readInteger(record.coats_max);
  const productName = readOptionalString(record, 'product_name');
  const colourStatus = readEnum(
    ['confirmed', 'partial', 'to_confirm', 'not_applicable'] as const,
    record.colour_status
  );
  const colour = readOptionalString(record, 'colour');
  const sheen = readOptionalString(record, 'sheen');
  const requiresConfirmation = readBoolean(record.requires_confirmation);
  const isCustomerVisible = readBoolean(record.is_customer_visible);
  const sortOrder = readInteger(record.sort_order) ?? index;
  const metadata = readSafeMetadata(record.metadata);

  if (clientId) step.client_id = clientId;
  if (label) step.label = label;
  if (prepType) step.prep_type = prepType;
  if (paintSystem) step.paint_system = paintSystem;
  if (coatsMin != null) step.coats_min = coatsMin;
  if (coatsMax != null) step.coats_max = coatsMax;
  if (productName) step.product_name = productName;
  if (colourStatus) step.colour_status = colourStatus;
  if (colour) step.colour = colour;
  if (sheen) step.sheen = sheen;
  if (requiresConfirmation != null) {
    step.requires_confirmation = requiresConfirmation;
  }
  if (isCustomerVisible != null) step.is_customer_visible = isCustomerVisible;
  step.sort_order = sortOrder;
  if (metadata) step.metadata = metadata;

  return step;
}

function normalizeScopeSection(
  item: unknown,
  index: number,
  jobType: QuoteJobType,
  topLevelPack: MaintenanceJobPackId | null,
  sink: WarningSink,
  questions: AIQuoteQuestion[]
): AIQuoteScopeSection | null {
  const record = readRecord(item);
  const title =
    readString(record.title) ??
    readString(record.area_label) ??
    readString(record.description) ??
    `Scope ${index + 1}`;
  const sectionKind =
    readEnum(QUOTE_SCOPE_SECTION_KINDS, record.section_kind) ??
    deriveDefaultSectionKind(jobType);
  const unsupportedKeyword = findUnsupportedKeyword(record);
  const photoExactClaim = isPhotoOnlyExactClaim(record);
  const maintenanceJobPack =
    normalizeOptionalMaintenancePack(record.maintenance_job_pack, sink) ??
    (sectionKind === 'maintenance' ? topLevelPack ?? undefined : undefined);

  let pricingStatus = normalizePricingStatus(record.pricing_status);
  let measurementStatus = normalizeMeasurementStatus(record.measurement_status);

  if (unsupportedKeyword) {
    pricingStatus = 'excluded';
    addQuestion(questions, specialistQuestion(unsupportedKeyword, title));
  }

  if (photoExactClaim) {
    pricingStatus = 'to_confirm';
    measurementStatus = 'to_confirm';
    addQuestion(questions, photoConfirmationQuestion(title));
  }

  const section: AIQuoteScopeSection = {
    section_kind: sectionKind,
    title,
    pricing_status: pricingStatus,
    measurement_status: measurementStatus,
    source: 'ai',
    visible_defects: readStringArray(record.visible_defects),
    steps: readArray(record.steps, 'scope section steps', sink).flatMap(
      (stepItem, stepIndex) => {
        const step = normalizeScopeStep(stepItem, stepIndex);
        return step ? [step] : [];
      }
    ),
  };

  const clientId = readOptionalString(record, 'client_id');
  const description = readOptionalString(record, 'description');
  const areaLabel = readOptionalString(record, 'area_label');
  const surfaceCategory = readOptionalString(record, 'surface_category');
  const isOptional = readBoolean(record.is_optional);
  const isSelected = readBoolean(record.is_selected);
  const sortOrder = readInteger(record.sort_order) ?? index;
  const metadata = readSafeMetadata(record.metadata);
  const priority = readEnum(QUOTE_SCOPE_PRIORITIES, record.priority);
  const reportContext = readBoolean(record.report_context);
  const unsupportedScope =
    readOptionalString(record, 'unsupported_scope') ?? unsupportedKeyword ?? undefined;

  if (clientId) section.client_id = clientId;
  if (description) section.description = description;
  if (areaLabel) section.area_label = areaLabel;
  if (surfaceCategory) section.surface_category = surfaceCategory;
  if (isOptional != null) section.is_optional = isOptional;
  if (isSelected != null) section.is_selected = isSelected;
  section.sort_order = sortOrder;
  if (metadata) section.metadata = metadata;
  if (maintenanceJobPack) section.maintenance_job_pack = maintenanceJobPack;
  if (priority) section.priority = priority;
  if (reportContext != null) section.report_context = reportContext;
  if (unsupportedScope) section.unsupported_scope = unsupportedScope;

  return section;
}

function normalizePricingCandidate(
  item: unknown,
  index: number,
  sink: WarningSink,
  questions: AIQuoteQuestion[]
): AIQuotePricingCandidate | null {
  const record = readRecord(item);
  const label =
    readString(record.label) ??
    readString(record.title) ??
    readString(record.description) ??
    `Pricing candidate ${index + 1}`;
  const unsupportedKeyword = findUnsupportedKeyword(record);

  if (unsupportedKeyword) {
    addQuestion(questions, specialistQuestion(unsupportedKeyword, label));
    return null;
  }

  if (isPhotoOnlyExactClaim(record)) {
    addQuestion(questions, photoConfirmationQuestion(label));
    return null;
  }

  const measurementStatus = normalizeMeasurementStatus(record.measurement_status);
  const candidate: AIQuotePricingCandidate = {
    label,
    pricing_path: readEnum(PRICING_PATHS, record.pricing_path) ?? 'manual_service',
    measurement_status: measurementStatus,
    confidence:
      readEnum(CONFIDENCE_VALUES, record.confidence) ??
      (measurementStatus === 'to_confirm' ? 'to_confirm' : 'medium'),
  };

  const clientId = readOptionalString(record, 'client_id');
  const description = readOptionalString(record, 'description');
  const scopeSectionClientId = readOptionalString(
    record,
    'scope_section_client_id'
  );
  const areaLabel = readOptionalString(record, 'area_label');
  const surfaceCategory = readOptionalString(record, 'surface_category');
  const quantityLabel = readOptionalString(record, 'quantity_label');
  const maintenanceJobPack = normalizeOptionalMaintenancePack(
    record.maintenance_job_pack,
    sink
  );
  const metadata = readSafeMetadata(record.metadata);

  if (clientId) candidate.client_id = clientId;
  if (description) candidate.description = description;
  if (scopeSectionClientId) {
    candidate.scope_section_client_id = scopeSectionClientId;
  }
  if (areaLabel) candidate.area_label = areaLabel;
  if (surfaceCategory) candidate.surface_category = surfaceCategory;
  if (quantityLabel) candidate.quantity_label = quantityLabel;
  if (maintenanceJobPack) candidate.maintenance_job_pack = maintenanceJobPack;
  if (metadata) candidate.metadata = metadata;

  return candidate;
}

function fallbackClauseKey(title: string, index: number): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || `ai_clause_${index + 1}`
  );
}

function normalizeClause(item: unknown, index: number): AIQuoteClause | null {
  const record = readRecord(item);
  const title = readString(record.title) ?? readString(record.clause_key);
  const body = readString(record.body) ?? readString(record.description) ?? title;
  if (!title || !body) return null;

  const clause: AIQuoteClause = {
    clause_key: readString(record.clause_key) ?? fallbackClauseKey(title, index),
    category: readEnum(QUOTE_CLAUSE_CATEGORIES, record.category) ?? 'risk_disclosure',
    title,
    body,
    severity: readEnum(QUOTE_CLAUSE_SEVERITIES, record.severity) ?? 'info',
    source: 'ai',
    is_customer_visible: readBoolean(record.is_customer_visible) ?? true,
  };

  const clientId = readOptionalString(record, 'client_id');
  const appliesToSectionClientId = readOptionalString(
    record,
    'applies_to_section_client_id'
  );
  const sortOrder = readInteger(record.sort_order) ?? index;
  const metadata = readSafeMetadata(record.metadata);

  if (clientId) clause.client_id = clientId;
  if (appliesToSectionClientId) {
    clause.applies_to_section_client_id = appliesToSectionClientId;
  }
  clause.sort_order = sortOrder;
  if (metadata) clause.metadata = metadata;

  return clause;
}

function normalizeQuestion(item: unknown): AIQuoteQuestion | null {
  const record = readRecord(item);
  const question = readString(record.question) ?? readString(record.label);
  if (!question) return null;

  const normalized: AIQuoteQuestion = {
    question,
    reason: readEnum(QUESTION_REASONS, record.reason) ?? 'missing_information',
  };

  const relatedScope = readOptionalString(record, 'related_scope');
  const details = readOptionalString(record, 'details');

  if (relatedScope) normalized.related_scope = relatedScope;
  if (details) normalized.details = details;

  return normalized;
}

export function validateAIQuoteDraftOutput(
  providerOutput: unknown
): AIQuoteValidationResult {
  const sink: WarningSink = { warnings: [], warningSet: new Set<string>() };
  const strippedOutput = stripForbiddenQuotePriceFields(providerOutput);
  const root = readRecord(strippedOutput);
  const questions = readArray(
    root.questions_for_user,
    'questions_for_user',
    sink
  ).flatMap((item) => {
    const question = normalizeQuestion(item);
    return question ? [question] : [];
  });

  const jobType = normalizeJobType(root.job_type, sink);
  const maintenanceJobPack = normalizeTopLevelMaintenancePack(
    root.maintenance_job_pack,
    sink
  );

  const rawScopeSections = readArray(root.scope_sections, 'scope_sections', sink);
  if (rawScopeSections.length > MAX_SCOPE_SECTIONS) {
    addWarning(sink, `Scope sections were capped at ${MAX_SCOPE_SECTIONS}.`);
  }

  const scopeSections = rawScopeSections
    .slice(0, MAX_SCOPE_SECTIONS)
    .flatMap((item, index) => {
      const section = normalizeScopeSection(
        item,
        index,
        jobType,
        maintenanceJobPack,
        sink,
        questions
      );
      return section ? [section] : [];
    });

  const pricingCandidates = readArray(
    root.pricing_candidates,
    'pricing_candidates',
    sink
  ).flatMap((item, index) => {
    const candidate = normalizePricingCandidate(item, index, sink, questions);
    return candidate ? [candidate] : [];
  });

  const clauses = readArray(root.clauses, 'clauses', sink).flatMap(
    (item, index) => {
      const clause = normalizeClause(item, index);
      return clause ? [clause] : [];
    }
  );

  const assumptions = readArray(root.assumptions, 'assumptions', sink).flatMap(
    (item) => {
      const assumption = readString(item);
      return assumption ? [assumption] : [];
    }
  );

  const draft: AIQuoteDraft = {
    job_type: jobType,
    maintenance_job_pack: maintenanceJobPack,
    scope_sections: scopeSections,
    pricing_candidates: pricingCandidates,
    clauses,
    assumptions,
    questions_for_user: questions,
  };

  return {
    draft,
    warnings: sink.warnings,
  };
}
