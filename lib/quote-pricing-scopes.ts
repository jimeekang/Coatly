import type { PricingMethodInputs, QuickInputs } from '@/types/quote';

type ScopeSurface = 'walls' | 'ceiling' | 'trim';
type PricingScopeRole =
  | 'priced_scope'
  | 'addon'
  | 'material'
  | 'optional_addon';

type PricingScopeLineItem = {
  name: string;
  is_optional?: boolean | null;
  is_selected?: boolean | null;
  pricing_scope_key?: string | null;
  pricing_role?: PricingScopeRole | null;
};

type RoomScopeInput = {
  name: string;
  surfaces: Array<{
    surface_type: 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows';
  }>;
};

type InteriorScopeRoomInput = {
  name?: string;
  anchor_room_type?: string;
  include_walls?: boolean;
  include_ceiling?: boolean;
  include_trim?: boolean;
  source_rate_item_id?: string;
  source_room_template_id?: string;
};

type InteriorScopeInput = {
  estimate_mode?: 'entire_property' | 'specific_areas';
  scope?: ScopeSurface[];
  rooms?: InteriorScopeRoomInput[];
  trim_items?: Array<{
    trim_type?: 'skirting';
    room_index?: number | null;
  }>;
};

type ExteriorScopeInput = {
  surfaces?: Record<string, number | undefined> | null;
  custom_surfaces?: Record<string, number | undefined> | null;
};

type QuotePricingScopeInput = {
  pricing_method?: string | null;
  pricing_method_inputs?: PricingMethodInputs | Record<string, unknown> | null;
  interior_estimate?: InteriorScopeInput | null;
  exterior_estimate?: ExteriorScopeInput | null;
  rooms?: RoomScopeInput[];
  line_items?: PricingScopeLineItem[];
};

export type QuotePricingScopeIssue = {
  line_item_name: string;
  pricing_scope_key?: string;
  scope_label: string;
  message: string;
};

type ScopeDescriptor = {
  key: string;
  label: string;
  roomLabel?: string;
  surface?: ScopeSurface;
};

const SURFACE_LABELS: Record<ScopeSurface, string> = {
  walls: 'walls',
  ceiling: 'ceiling',
  trim: 'trim',
};

const SURFACE_TERMS: Record<ScopeSurface, string[]> = {
  walls: ['wall', 'walls'],
  ceiling: ['ceiling', 'ceilings'],
  trim: ['trim', 'trims', 'skirting', 'skirtings'],
};

export function normalizePricingScopeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function normalizePricingScopeKey(value: string) {
  return value
    .split(':')
    .map((part) => normalizePricingScopeToken(part))
    .filter(Boolean)
    .join(':');
}

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesWordOrPhrase(text: string, phrase: string) {
  const normalizedPhrase = normalizeWords(phrase);
  if (!normalizedPhrase) return false;
  return ` ${text} `.includes(` ${normalizedPhrase} `);
}

export function buildQuickRoomScopeKey(roomId: string, surface: ScopeSurface) {
  return `quick:${normalizePricingScopeToken(roomId)}:${surface}`;
}

export function buildInteriorRoomScopeKey(
  roomKey: string,
  surface: ScopeSurface
) {
  return `interior:room:${normalizePricingScopeToken(roomKey)}:${surface}`;
}

export function buildInteriorPropertyScopeKey(surface: ScopeSurface) {
  return `interior:property:${surface}`;
}

export function buildManualRoomScopeKey(roomKey: string, surface: ScopeSurface) {
  return `manual:room:${normalizePricingScopeToken(roomKey)}:${surface}`;
}

export function buildExteriorSurfaceScopeKey(surfaceKey: string) {
  return `exterior:${normalizePricingScopeToken(surfaceKey)}`;
}

function addScope(
  scopes: ScopeDescriptor[],
  descriptor: ScopeDescriptor | null
) {
  if (!descriptor) return;
  if (scopes.some((scope) => scope.key === descriptor.key)) return;
  scopes.push(descriptor);
}

function isQuickInputs(value: unknown): value is QuickInputs {
  return (
    value != null &&
    typeof value === 'object' &&
    Array.isArray((value as QuickInputs).rooms)
  );
}

function addQuickScopes(
  scopes: ScopeDescriptor[],
  pricingMethodInputs?: PricingMethodInputs | Record<string, unknown> | null
) {
  if (
    !pricingMethodInputs ||
    pricingMethodInputs.method !== 'detailed_quick' ||
    !isQuickInputs(pricingMethodInputs.inputs)
  ) {
    return;
  }

  pricingMethodInputs.inputs.rooms.forEach((room) => {
    room.selected_surfaces.forEach((surface) => {
      addScope(scopes, {
        key: buildQuickRoomScopeKey(room.room_id, surface),
        label: `${room.label} ${SURFACE_LABELS[surface]}`,
        roomLabel: room.label,
        surface,
      });
    });
  });
}

function getInteriorRoomKey(
  room: InteriorScopeRoomInput,
  index: number
) {
  return (
    room.source_rate_item_id ||
    room.name ||
    room.anchor_room_type ||
    `room-${index + 1}`
  );
}

function addInteriorScopes(
  scopes: ScopeDescriptor[],
  interiorEstimate?: InteriorScopeInput | null
) {
  if (!interiorEstimate) return;

  if (interiorEstimate.estimate_mode === 'entire_property') {
    (interiorEstimate.scope ?? []).forEach((surface) => {
      addScope(scopes, {
        key: buildInteriorPropertyScopeKey(surface),
        label: `Entire property ${SURFACE_LABELS[surface]}`,
        surface,
      });
    });
    return;
  }

  (interiorEstimate.rooms ?? []).forEach((room, index) => {
    const roomKey = getInteriorRoomKey(room, index);
    const roomLabel = room.name || room.anchor_room_type || `Room ${index + 1}`;
    const surfaceFlags: Array<[ScopeSurface, boolean]> = [
      ['walls', room.include_walls === true],
      ['ceiling', room.include_ceiling === true],
      ['trim', room.include_trim === true],
    ];

    surfaceFlags.forEach(([surface, included]) => {
      if (!included) return;
      if (room.source_room_template_id) {
        addScope(scopes, {
          key: buildQuickRoomScopeKey(room.source_room_template_id, surface),
          label: `${roomLabel} ${SURFACE_LABELS[surface]}`,
          roomLabel,
          surface,
        });
        return;
      }

      addScope(scopes, {
        key: buildInteriorRoomScopeKey(roomKey, surface),
        label: `${roomLabel} ${SURFACE_LABELS[surface]}`,
        roomLabel,
        surface,
      });
    });
  });
}

function findInteriorScopeErrors(
  interiorEstimate?: InteriorScopeInput | null
): QuotePricingScopeIssue[] {
  if (!interiorEstimate) return [];

  const errors: QuotePricingScopeIssue[] = [];

  if (
    interiorEstimate.estimate_mode === 'entire_property' &&
    (interiorEstimate.rooms?.length ?? 0) > 0
  ) {
    errors.push({
      line_item_name: 'Interior estimate',
      scope_label: 'entire property and specific rooms',
      message:
        'Use either an entire-property interior estimate or specific-area room anchors, not both in the same quote.',
    });
  }

  if (interiorEstimate.estimate_mode !== 'specific_areas') return errors;

  (interiorEstimate.trim_items ?? []).forEach((trimItem) => {
    if (trimItem.room_index == null) return;
    const room = interiorEstimate.rooms?.[trimItem.room_index];
    if (!room?.include_trim) return;

    const roomLabel =
      room.name || room.anchor_room_type || `Room ${trimItem.room_index + 1}`;
    errors.push({
      line_item_name: 'Skirting / Trim',
      pricing_scope_key: buildInteriorRoomScopeKey(
        getInteriorRoomKey(room, trimItem.room_index),
        'trim'
      ),
      scope_label: `${roomLabel} trim`,
      message: `${roomLabel} trim is already included in the room anchor. Remove the explicit skirting item or turn off Trim for that room.`,
    });
  });

  return errors;
}

function addManualRoomScopes(
  scopes: ScopeDescriptor[],
  rooms?: QuotePricingScopeInput['rooms']
) {
  if (!Array.isArray(rooms)) return;

  rooms.forEach((room, index) => {
    const roomKey = room.name || `room-${index + 1}`;
    room.surfaces.forEach((surface) => {
      if (
        surface.surface_type !== 'walls' &&
        surface.surface_type !== 'ceiling' &&
        surface.surface_type !== 'trim'
      ) {
        return;
      }

      addScope(scopes, {
        key: buildManualRoomScopeKey(roomKey, surface.surface_type),
        label: `${room.name} ${SURFACE_LABELS[surface.surface_type]}`,
        roomLabel: room.name,
        surface: surface.surface_type,
      });
    });
  });
}

function addExteriorScopes(
  scopes: ScopeDescriptor[],
  exteriorEstimate?: QuotePricingScopeInput['exterior_estimate']
) {
  if (!exteriorEstimate) return;

  const standardSurfaces = exteriorEstimate.surfaces ?? {};
  Object.entries(standardSurfaces).forEach(([surfaceKey, value]) => {
    if (typeof value !== 'number' || value <= 0) return;
    addScope(scopes, {
      key: buildExteriorSurfaceScopeKey(surfaceKey),
      label: `Exterior ${surfaceKey.replace(/_/g, ' ')}`,
    });
  });

  Object.entries(exteriorEstimate.custom_surfaces ?? {}).forEach(
    ([surfaceKey, value]) => {
      if (typeof value !== 'number' || value <= 0) return;
      addScope(scopes, {
        key: buildExteriorSurfaceScopeKey(`custom:${surfaceKey}`),
        label: `Exterior ${surfaceKey}`,
      });
    }
  );
}

export function collectQuotePricedScopes(input: QuotePricingScopeInput) {
  const scopes: ScopeDescriptor[] = [];

  addQuickScopes(scopes, input.pricing_method_inputs);
  addInteriorScopes(scopes, input.interior_estimate);
  addManualRoomScopes(scopes, input.rooms);
  addExteriorScopes(scopes, input.exterior_estimate);

  return scopes;
}

function findFuzzyWarningScope(
  item: PricingScopeLineItem,
  scopes: ScopeDescriptor[]
) {
  const itemName = normalizeWords(item.name);
  if (!itemName) return null;

  return (
    scopes.find((scope) => {
      if (!scope.roomLabel || !scope.surface) return false;
      return (
        includesWordOrPhrase(itemName, scope.roomLabel) &&
        SURFACE_TERMS[scope.surface].some((term) =>
          includesWordOrPhrase(itemName, term)
        )
      );
    }) ?? null
  );
}

export function findQuotePricingScopeIssues(input: QuotePricingScopeInput): {
  errors: QuotePricingScopeIssue[];
  warnings: QuotePricingScopeIssue[];
} {
  const scopes = collectQuotePricedScopes(input);
  const scopesByKey = new Map(scopes.map((scope) => [scope.key, scope]));
  const errors: QuotePricingScopeIssue[] = [
    ...findInteriorScopeErrors(input.interior_estimate),
  ];
  const warnings: QuotePricingScopeIssue[] = [];

  (input.line_items ?? []).forEach((item) => {
    const pricingScopeKey = item.pricing_scope_key
      ? normalizePricingScopeKey(item.pricing_scope_key)
      : null;

    if (pricingScopeKey && item.pricing_role !== 'addon') {
      const duplicateScope = scopesByKey.get(pricingScopeKey);
      if (duplicateScope) {
        errors.push({
          line_item_name: item.name,
          pricing_scope_key: duplicateScope.key,
          scope_label: duplicateScope.label,
          message: `"${item.name}" duplicates ${duplicateScope.label}, which is already included in the selected pricing method. Remove it or mark it as an add-on without a priced scope key.`,
        });
        return;
      }
    }

    const warningScope = findFuzzyWarningScope(item, scopes);
    if (warningScope) {
      warnings.push({
        line_item_name: item.name,
        scope_label: warningScope.label,
        message: `The estimate already includes ${warningScope.label}. Keep "${item.name}" only if it is extra prep, repair, access, or upgrade work.`,
      });
    }
  });

  return { errors, warnings };
}

export function getFirstBlockingQuotePricingScopeError(
  input: QuotePricingScopeInput
) {
  return findQuotePricingScopeIssues(input).errors[0]?.message ?? null;
}
