import type {
  QuickEstimateRoom,
  QuickRoomSize,
  QuickRoomSurface,
  UserRateSettings,
} from '@/lib/rate-settings';
import {
  calculateQuickEstimateRoomTotal,
  QUICK_ESTIMATE_RATE_SNAPSHOT_VERSION,
} from '@/utils/calculations';
import type {
  MaintenanceJobPackId,
  QuickInputs,
  QuickTrimPaintSystem,
  SelectedQuickRoom,
} from '@/types/quote';

export type AIQuotePricingCandidateStatus =
  | 'accepted'
  | 'reviewable'
  | 'to_confirm'
  | 'unresolved'
  | 'rejected';

export type AIQuotePricingCandidateType =
  | 'quick_room'
  | 'maintenance'
  | 'advanced'
  | 'exterior'
  | 'manual'
  | 'day_rate'
  | 'optional_addon';

export type AIQuotePricingPath =
  | 'quick'
  | 'quick_room'
  | 'advanced'
  | 'exterior'
  | 'manual'
  | 'day_rate'
  | 'optional_addon'
  | 'maintenance';

export type AIQuotePricingCandidate = {
  id?: string;
  type: AIQuotePricingCandidateType;
  status?: AIQuotePricingCandidateStatus;
  pricing_path?: AIQuotePricingPath;
  suggested_pricing_method?: AIQuotePricingPath;
  title?: string;
  scope_section_index?: number;
  surface_category?: string;
  quantity?: number;
  quantity_status?: 'confirmed' | 'rough' | 'missing';
  room_template_id?: string;
  room_template_label?: string;
  suggested_size?: QuickRoomSize;
  selected_surfaces?: string[];
  global_coating?: QuickInputs['global_coating'];
  global_condition?: QuickInputs['global_condition'];
  trim_paint_system?: QuickTrimPaintSystem;
  maintenance_job_pack?: MaintenanceJobPackId;
  confidence?: 'low' | 'medium' | 'high';
  questions_for_user?: string[];
  rate?: unknown;
  rates?: unknown;
  rate_cents?: unknown;
  unit_price?: unknown;
  unit_price_cents?: unknown;
  price?: unknown;
  price_cents?: unknown;
  subtotal?: unknown;
  subtotal_cents?: unknown;
  gst?: unknown;
  gst_cents?: unknown;
  total?: unknown;
  total_cents?: unknown;
  daily_rate?: unknown;
  daily_rate_cents?: unknown;
};

export type SanitizedAIQuotePricingCandidate = Omit<
  AIQuotePricingCandidate,
  | 'rate'
  | 'rates'
  | 'rate_cents'
  | 'unit_price'
  | 'unit_price_cents'
  | 'price'
  | 'price_cents'
  | 'subtotal'
  | 'subtotal_cents'
  | 'gst'
  | 'gst_cents'
  | 'total'
  | 'total_cents'
  | 'daily_rate'
  | 'daily_rate_cents'
>;

export type DeterministicQuickRoomPricingPayload = {
  pricing_path: 'quick_estimate_room';
  pricing_method: 'detailed_quick';
  source_candidate_id: string | null;
  room: SelectedQuickRoom;
};

export type DeterministicPricingResultStatus =
  | 'priced'
  | 'to_confirm'
  | 'ignored';

export type DeterministicPricingReason =
  | 'not_reviewable'
  | 'missing_quick_room_template'
  | 'missing_quick_room_rate'
  | 'unsupported_pricing_path'
  | 'unsupported_maintenance_pricing_path';

export type DeterministicPricingCandidateResult = {
  candidate_id: string | null;
  candidate: SanitizedAIQuotePricingCandidate;
  status: DeterministicPricingResultStatus;
  pricing_path: 'quick_estimate_room' | null;
  reason: DeterministicPricingReason | null;
  priced_payload: DeterministicQuickRoomPricingPayload | null;
};

export type ApplyDeterministicPricingResult = {
  candidates: DeterministicPricingCandidateResult[];
  priced_payloads: DeterministicQuickRoomPricingPayload[];
};

const QUICK_ROOM_SURFACES = ['walls', 'ceiling', 'trim'] as const;
const FORBIDDEN_CANDIDATE_PRICE_FIELDS = new Set<string>([
  'rate',
  'rates',
  'rate_cents',
  'unit_price',
  'unit_price_cents',
  'price',
  'price_cents',
  'subtotal',
  'subtotal_cents',
  'gst',
  'gst_cents',
  'total',
  'total_cents',
  'daily_rate',
  'daily_rate_cents',
]);

function isReadyForPricing(status: AIQuotePricingCandidateStatus | undefined) {
  return status === 'accepted' || status === 'reviewable';
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isQuickRoomSurface(value: string): value is QuickRoomSurface {
  return QUICK_ROOM_SURFACES.includes(value as QuickRoomSurface);
}

function sanitizeCandidate(
  candidate: AIQuotePricingCandidate
): SanitizedAIQuotePricingCandidate {
  return Object.fromEntries(
    Object.entries(candidate).filter(
      ([key]) => !FORBIDDEN_CANDIDATE_PRICE_FIELDS.has(key)
    )
  ) as SanitizedAIQuotePricingCandidate;
}

function withUnpricedStatus(
  candidate: AIQuotePricingCandidate,
  reason: DeterministicPricingReason,
  status: DeterministicPricingResultStatus = 'to_confirm'
): DeterministicPricingCandidateResult {
  return {
    candidate_id: candidate.id ?? null,
    candidate: {
      ...sanitizeCandidate(candidate),
      status: status === 'to_confirm' ? 'to_confirm' : candidate.status,
    },
    status,
    pricing_path: null,
    reason,
    priced_payload: null,
  };
}

function findQuickRoomTemplate(
  candidate: AIQuotePricingCandidate,
  templates: QuickEstimateRoom[]
) {
  if (candidate.room_template_id) {
    const matchById = templates.find(
      (template) => template.id === candidate.room_template_id
    );
    if (matchById) return matchById;
  }

  if (!candidate.room_template_label) return null;
  const candidateLabel = normalizeLabel(candidate.room_template_label);
  return (
    templates.find(
      (template) => normalizeLabel(template.label) === candidateLabel
    ) ?? null
  );
}

function getCoatingMultiplierPct(
  candidate: AIQuotePricingCandidate,
  rateSettings: UserRateSettings
) {
  const coating = candidate.global_coating ?? 'two_coats_repaint';
  const multipliers = rateSettings.quick_estimate.coating_multipliers;
  if (coating === 'one_coat_refresh') {
    return multipliers.one_coat_refresh_pct;
  }
  if (coating === 'three_coats_new_plaster') {
    return multipliers.three_coats_new_plaster_pct;
  }
  return multipliers.two_coats_repaint_pct;
}

function getConditionMultiplierPct(
  candidate: AIQuotePricingCandidate,
  rateSettings: UserRateSettings
) {
  const condition = candidate.global_condition ?? 'average';
  const multipliers = rateSettings.quick_estimate.condition_multipliers;
  if (condition === 'good') return multipliers.good_pct;
  if (condition === 'poor') return multipliers.poor_pct;
  return multipliers.average_pct;
}

function getTrimCents(
  sizeRates: QuickEstimateRoom['sizes'][QuickRoomSize],
  trimPaintSystem: QuickTrimPaintSystem
) {
  if (trimPaintSystem === 'water_3coat_white_finish') {
    return sizeRates.trim_water_cents ?? sizeRates.trim_cents;
  }
  return sizeRates.trim_oil_cents ?? sizeRates.trim_cents;
}

function getSelectedQuickSurfaces(
  candidate: AIQuotePricingCandidate,
  template: QuickEstimateRoom
): QuickRoomSurface[] {
  const requestedSurfaces =
    candidate.selected_surfaces && candidate.selected_surfaces.length > 0
      ? candidate.selected_surfaces
      : template.enabled_surfaces;

  return requestedSurfaces.filter(
    (surface): surface is QuickRoomSurface =>
      isQuickRoomSurface(surface) && template.enabled_surfaces.includes(surface)
  );
}

function hasMissingSelectedSurfaceRate(
  selectedSurfaces: QuickRoomSurface[],
  sizeRates: QuickEstimateRoom['sizes'][QuickRoomSize],
  trimPaintSystem: QuickTrimPaintSystem
) {
  const centsBySurface: Record<QuickRoomSurface, number> = {
    walls: sizeRates.walls_cents,
    ceiling: sizeRates.ceiling_cents,
    trim: getTrimCents(sizeRates, trimPaintSystem),
  };

  return selectedSurfaces.some((surface) => centsBySurface[surface] <= 0);
}

function isQuickRoomPath(candidate: AIQuotePricingCandidate) {
  return (
    candidate.type === 'quick_room' ||
    (candidate.type === 'maintenance' &&
      (candidate.pricing_path === 'quick_room' ||
        candidate.suggested_pricing_method === 'quick' ||
        candidate.suggested_pricing_method === 'quick_room'))
  );
}

function mapQuickRoomCandidate(
  candidate: AIQuotePricingCandidate,
  rateSettings: UserRateSettings
): DeterministicPricingCandidateResult {
  const template = findQuickRoomTemplate(
    candidate,
    rateSettings.quick_estimate.rooms
  );
  if (!template) {
    return withUnpricedStatus(candidate, 'missing_quick_room_template');
  }

  const size = candidate.suggested_size ?? 'medium';
  const sizeRates = template.sizes[size];
  const trimPaintSystem = candidate.trim_paint_system ?? 'oil_2coat';
  const selectedSurfaces = getSelectedQuickSurfaces(candidate, template);

  if (
    selectedSurfaces.length === 0 ||
    hasMissingSelectedSurfaceRate(selectedSurfaces, sizeRates, trimPaintSystem)
  ) {
    return withUnpricedStatus(candidate, 'missing_quick_room_rate');
  }

  const coatingMultiplierPct = getCoatingMultiplierPct(candidate, rateSettings);
  const conditionMultiplierPct = getConditionMultiplierPct(
    candidate,
    rateSettings
  );
  const roomBase: SelectedQuickRoom = {
    room_id: template.id,
    source_rate_item_id: template.id,
    source_rate_item_version: template.version ?? 1,
    source_rate_item_label: template.label,
    rate_snapshot_version: QUICK_ESTIMATE_RATE_SNAPSHOT_VERSION,
    label: template.label,
    size,
    selected_surfaces: selectedSurfaces,
    trim_paint_system: trimPaintSystem,
    walls_cents: sizeRates.walls_cents,
    ceiling_cents: sizeRates.ceiling_cents,
    trim_cents: getTrimCents(sizeRates, trimPaintSystem),
    coating_multiplier_pct: coatingMultiplierPct,
    condition_multiplier_pct: conditionMultiplierPct,
    total_cents: 0,
  };
  const room: SelectedQuickRoom = {
    ...roomBase,
    total_cents: calculateQuickEstimateRoomTotal(
      roomBase,
      coatingMultiplierPct,
      conditionMultiplierPct
    ),
  };
  const pricedPayload: DeterministicQuickRoomPricingPayload = {
    pricing_path: 'quick_estimate_room',
    pricing_method: 'detailed_quick',
    source_candidate_id: candidate.id ?? null,
    room,
  };

  return {
    candidate_id: candidate.id ?? null,
    candidate: sanitizeCandidate(candidate),
    status: 'priced',
    pricing_path: 'quick_estimate_room',
    reason: null,
    priced_payload: pricedPayload,
  };
}

function mapCandidate(
  candidate: AIQuotePricingCandidate,
  rateSettings: UserRateSettings
): DeterministicPricingCandidateResult {
  if (!isReadyForPricing(candidate.status)) {
    return withUnpricedStatus(candidate, 'not_reviewable', 'ignored');
  }

  if (isQuickRoomPath(candidate)) {
    return mapQuickRoomCandidate(candidate, rateSettings);
  }

  if (candidate.type === 'maintenance') {
    return withUnpricedStatus(
      candidate,
      'unsupported_maintenance_pricing_path'
    );
  }

  return withUnpricedStatus(candidate, 'unsupported_pricing_path');
}

export function applyDeterministicPricing(
  candidates: AIQuotePricingCandidate[],
  rateSettings: UserRateSettings
): ApplyDeterministicPricingResult {
  const mappedCandidates = candidates.map((candidate) =>
    mapCandidate(candidate, rateSettings)
  );

  return {
    candidates: mappedCandidates,
    priced_payloads: mappedCandidates.flatMap((candidate) =>
      candidate.priced_payload ? [candidate.priced_payload] : []
    ),
  };
}
