import type { InteriorEstimateInput } from '@/modules/quotes/domain/interior-estimates';
import {
  getRoomTemplateSurfaceSnapshotTotalCents,
  resolveAdvancedRoomPriceSource,
} from '@/modules/price-rates/domain/room-price-library';
import {
  INTERIOR_DOOR_SCOPE_LABELS,
  INTERIOR_DOOR_TYPE_LABELS,
  INTERIOR_WINDOW_SCOPE_LABELS,
  INTERIOR_WINDOW_TYPE_LABELS,
} from '@/modules/price-rates/domain/paint-openings';
import {
  DOOR_SCOPES,
  RATE_DOOR_TYPES,
  TRIM_PAINT_SYSTEMS,
  WINDOW_SCOPES,
  WINDOW_TYPES,
  type UserRateSettings,
} from '@/modules/price-rates/domain/rate-settings';
import type { QuickInputs, SelectedQuickRoom } from '@/types/quote';

export type RateSetupIssue = {
  area: 'quick' | 'advanced';
  severity: 'warning' | 'blocking';
  code:
    | 'missing_quick_rooms'
    | 'zero_quick_surface_price'
    | 'missing_advanced_room_items'
    | 'missing_advanced_anchor'
    | 'missing_room_template'
    | 'zero_advanced_anchor'
    | 'zero_room_template_source'
    | 'zero_door_unit_rate'
    | 'zero_window_unit_rate'
    | 'no_advanced_room_surfaces';
  message: string;
  source_id?: string;
  source_label?: string;
};

const QUICK_SURFACE_LABELS: Record<
  'walls' | 'ceiling' | 'trim',
  string
> = {
  walls: 'walls',
  ceiling: 'ceiling',
  trim: 'trim',
};

const QUICK_SIZE_LABELS: Record<SelectedQuickRoom['size'], string> = {
  small: 'small',
  medium: 'medium',
  large: 'large',
};

function quickRoomSurfaceCents(
  room: SelectedQuickRoom,
  surface: 'walls' | 'ceiling' | 'trim'
) {
  if (surface === 'walls') return room.walls_cents;
  if (surface === 'ceiling') return room.ceiling_cents;
  return room.trim_cents;
}

export function getQuickEstimateSetupIssues(
  settings: UserRateSettings
): RateSetupIssue[] {
  const issues: RateSetupIssue[] = [];
  const rooms = settings.quick_estimate.rooms;

  if (rooms.length === 0) {
    issues.push({
      area: 'quick',
      severity: 'blocking',
      code: 'missing_quick_rooms',
      message: 'Quick Estimate needs at least one room template before it can be used.',
    });
  }

  rooms.forEach((room) => {
    (['small', 'medium', 'large'] as const).forEach((size) => {
      room.enabled_surfaces.forEach((surface) => {
        const cents = room.sizes[size][`${surface}_cents`];
        if (cents === 0) {
          issues.push({
            area: 'quick',
            severity: 'warning',
            code: 'zero_quick_surface_price',
            source_id: `${room.id}:${size}:${surface}`,
            source_label: room.label,
            message: `${room.label} ${QUICK_SIZE_LABELS[size]} ${QUICK_SURFACE_LABELS[surface]} is A$0. Keep it only if this source is intentionally free.`,
          });
        }
      });
    });
  });

  return issues;
}

export function getSelectedQuickEstimateIssues(
  inputs: QuickInputs,
  _settings?: UserRateSettings | null
): RateSetupIssue[] {
  void _settings;

  const issues: RateSetupIssue[] = [];

  inputs.rooms.forEach((room) => {
    room.selected_surfaces.forEach((surface) => {
      if (quickRoomSurfaceCents(room, surface) === 0) {
        const sourceId = room.source_rate_item_id ?? room.room_id;
        issues.push({
          area: 'quick',
          severity: 'blocking',
          code: 'zero_quick_surface_price',
          source_id: `${sourceId}:${surface}`,
          source_label: room.source_rate_item_label ?? room.label,
          message: `${room.label} ${QUICK_SURFACE_LABELS[surface]} is A$0. Update Price Rates or remove that surface before saving this quote.`,
        });
      }
    });
  });

  return issues;
}

function getAdvancedAnchor(
  settings: UserRateSettings,
  anchorRoomType: string
) {
  return settings.detailed_estimate_anchors.interior_rooms[anchorRoomType];
}

export function getAdvancedEstimateSetupIssues(
  settings: UserRateSettings
): RateSetupIssue[] {
  const issues: RateSetupIssue[] = [];
  const roomItems = settings.detailed_estimate_items.advanced_rooms;

  if (roomItems.length === 0) {
    issues.push({
      area: 'advanced',
      severity: 'warning',
      code: 'missing_advanced_room_items',
      message: 'Advanced mode has no reusable room items. Painters can still add rooms manually.',
    });
  }

  roomItems.forEach((item) => {
    const resolved = resolveAdvancedRoomPriceSource(settings, item);
    if (!resolved.ok && item.source_room_template_id) {
      issues.push({
        area: 'advanced',
        severity: 'warning',
        code: 'missing_room_template',
        source_id: item.id,
        source_label: item.label,
        message: resolved.issue.message,
      });
      return;
    }

    if (resolved.ok && resolved.kind === 'room_template') {
      if (resolved.total_cents === 0) {
        issues.push({
          area: 'advanced',
          severity: 'warning',
          code: 'zero_room_template_source',
          source_id: item.id,
          source_label: item.label,
          message: `${item.label} Room Price Library source is A$0 for its selected size and surfaces.`,
        });
      }
      return;
    }

    const anchor = getAdvancedAnchor(settings, item.anchor_room_type);
    if (!anchor) {
      issues.push({
        area: 'advanced',
        severity: 'warning',
        code: 'missing_advanced_anchor',
        source_id: item.id,
        source_label: item.label,
        message: `${item.label} points to missing anchor "${item.anchor_room_type}".`,
      });
    }
  });

  Object.entries(settings.detailed_estimate_anchors.interior_rooms).forEach(
    ([anchorName, range]) => {
      if (range.median === 0) {
        issues.push({
          area: 'advanced',
          severity: 'warning',
          code: 'zero_advanced_anchor',
          source_id: anchorName,
          source_label: anchorName,
          message: `${anchorName} anchor median is A$0.`,
        });
      }
    }
  );

  TRIM_PAINT_SYSTEMS.forEach((paintSystem) => {
    const doorTypes = settings.enabled_door_types.length
      ? settings.enabled_door_types
      : [...RATE_DOOR_TYPES];
    const doorScopes = settings.enabled_door_scopes.length
      ? settings.enabled_door_scopes
      : [...DOOR_SCOPES];
    doorTypes.forEach((doorType) => {
      doorScopes.forEach((doorScope) => {
        if (
          settings.door_unit_rates[paintSystem][doorType][doorScope] === 0
        ) {
          issues.push({
            area: 'advanced',
            severity: 'warning',
            code: 'zero_door_unit_rate',
            source_id: `${paintSystem}:${doorType}:${doorScope}`,
            source_label: `${INTERIOR_DOOR_TYPE_LABELS[doorType]} ${INTERIOR_DOOR_SCOPE_LABELS[doorScope]}`,
            message: `${INTERIOR_DOOR_TYPE_LABELS[doorType]} ${INTERIOR_DOOR_SCOPE_LABELS[doorScope]} is A$0.`,
          });
        }
      });
    });

    const windowTypes = settings.enabled_window_types.length
      ? settings.enabled_window_types
      : [...WINDOW_TYPES];
    windowTypes.forEach((windowType) => {
      WINDOW_SCOPES.forEach((windowScope) => {
        if (
          settings.window_unit_rates[paintSystem][windowType][windowScope] === 0
        ) {
          issues.push({
            area: 'advanced',
            severity: 'warning',
            code: 'zero_window_unit_rate',
            source_id: `${paintSystem}:${windowType}:${windowScope}`,
            source_label: `${INTERIOR_WINDOW_TYPE_LABELS[windowType]} ${INTERIOR_WINDOW_SCOPE_LABELS[windowScope]}`,
            message: `${INTERIOR_WINDOW_TYPE_LABELS[windowType]} ${INTERIOR_WINDOW_SCOPE_LABELS[windowScope]} is A$0.`,
          });
        }
      });
    });
  });

  return issues;
}

export function getSelectedAdvancedEstimateIssues(
  input: InteriorEstimateInput,
  settings: UserRateSettings
): RateSetupIssue[] {
  if (input.estimate_mode !== 'specific_areas') return [];

  const issues: RateSetupIssue[] = [];

  input.rooms.forEach((room, index) => {
    const roomLabel = room.name || `Room ${index + 1}`;
    if (!room.include_walls && !room.include_ceiling && !room.include_trim) {
      issues.push({
        area: 'advanced',
        severity: 'blocking',
        code: 'no_advanced_room_surfaces',
        source_id: room.source_rate_item_id,
        source_label: roomLabel,
        message: `Select at least one surface for ${roomLabel}.`,
      });
      return;
    }

    if (room.pricing_model === 'measured') {
      return;
    }

    const snapshotTemplateTotal = room.source_room_template_surface_prices_cents
      ? getRoomTemplateSurfaceSnapshotTotalCents(
          room.source_room_template_surface_prices_cents
        )
      : null;

    if (snapshotTemplateTotal != null) {
      if (snapshotTemplateTotal === 0) {
        issues.push({
          area: 'advanced',
          severity: 'blocking',
          code: 'zero_room_template_source',
          source_id: room.source_room_template_id ?? room.source_rate_item_id,
          source_label: roomLabel,
          message: `${roomLabel} Room Price Library source is A$0. Open Price Rates and set a non-zero room source before saving this quote.`,
        });
      }
      return;
    }

    if (room.source_room_template_id) {
      const resolved = resolveAdvancedRoomPriceSource(settings, room);
      if (!resolved.ok) {
        issues.push({
          area: 'advanced',
          severity: 'blocking',
          code: 'missing_room_template',
          source_id: room.source_room_template_id,
          source_label: roomLabel,
          message: `${roomLabel} uses missing Room Price Library source "${room.source_room_template_id}". Open Price Rates and choose a valid room template before saving this quote.`,
        });
        return;
      }
      if (resolved.kind === 'room_template' && resolved.total_cents === 0) {
        issues.push({
          area: 'advanced',
          severity: 'blocking',
          code: 'zero_room_template_source',
          source_id: room.source_room_template_id,
          source_label: roomLabel,
          message: `${roomLabel} Room Price Library source is A$0. Open Price Rates and set a non-zero room source before saving this quote.`,
        });
      }
      return;
    }

    const snapshotAnchor = room.source_anchor_range_cents;
    const currentAnchor = getAdvancedAnchor(settings, room.anchor_room_type);
    const anchor = snapshotAnchor ?? currentAnchor;

    if (!anchor) {
      issues.push({
        area: 'advanced',
        severity: 'blocking',
        code: 'missing_advanced_anchor',
        source_id: room.source_rate_item_id ?? room.anchor_room_type,
        source_label: roomLabel,
        message: `${roomLabel} uses missing anchor "${room.anchor_room_type}". Open Price Rates and set that anchor before saving this quote.`,
      });
      return;
    }

    if (anchor.median === 0) {
      issues.push({
        area: 'advanced',
        severity: 'blocking',
        code: 'zero_advanced_anchor',
        source_id: room.source_rate_item_id ?? room.anchor_room_type,
        source_label: roomLabel,
        message: `${roomLabel} anchor is A$0. Open Price Rates and set a non-zero room anchor before saving this quote.`,
      });
    }
  });

  input.opening_items.forEach((item) => {
    if (item.opening_type === 'door') {
      const doorType = item.door_type ?? 'standard';
      const doorScope = item.door_scope ?? 'door_and_frame';
      const sourcePrice =
        item.source_unit_price_cents ??
        settings.door_unit_rates[item.paint_system][doorType][doorScope];
      if (sourcePrice === 0) {
        issues.push({
          area: 'advanced',
          severity: 'blocking',
          code: 'zero_door_unit_rate',
          source_id: `${item.paint_system}:${doorType}:${doorScope}`,
          source_label: `${INTERIOR_DOOR_TYPE_LABELS[doorType]} ${INTERIOR_DOOR_SCOPE_LABELS[doorScope]}`,
          message: `${INTERIOR_DOOR_TYPE_LABELS[doorType]} ${INTERIOR_DOOR_SCOPE_LABELS[doorScope]} is A$0. Open Price Rates and set a non-zero door rate before saving this quote.`,
        });
      }
      return;
    }

    const windowType = item.window_type ?? 'normal';
    const windowScope = item.window_scope ?? 'window_and_frame';
    const sourcePrice =
      item.source_unit_price_cents ??
      settings.window_unit_rates[item.paint_system][windowType][windowScope];
    if (sourcePrice === 0) {
      issues.push({
        area: 'advanced',
        severity: 'blocking',
        code: 'zero_window_unit_rate',
        source_id: `${item.paint_system}:${windowType}:${windowScope}`,
        source_label: `${INTERIOR_WINDOW_TYPE_LABELS[windowType]} ${INTERIOR_WINDOW_SCOPE_LABELS[windowScope]}`,
        message: `${INTERIOR_WINDOW_TYPE_LABELS[windowType]} ${INTERIOR_WINDOW_SCOPE_LABELS[windowScope]} is A$0. Open Price Rates and set a non-zero window rate before saving this quote.`,
      });
    }
  });

  return issues;
}

export function getFirstBlockingRateSetupIssue(issues: RateSetupIssue[]) {
  return issues.find((issue) => issue.severity === 'blocking') ?? null;
}
