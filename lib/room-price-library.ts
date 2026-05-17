import type {
  AdvancedEstimateRoomItem,
  QuickEstimateRoom,
  QuickRoomSize,
  QuickRoomSurface,
  QuickRoomSurfacePriceSnapshot,
  UserRateSettings,
} from '@/lib/rate-settings';

type RoomLike = {
  name?: string;
  anchor_room_type?: string;
  include_walls?: boolean;
  include_ceiling?: boolean;
  include_trim?: boolean;
  source_room_template_id?: string;
  source_room_template_version?: number;
  source_room_template_label?: string;
  source_room_template_size?: QuickRoomSize;
  default_size?: QuickRoomSize;
  source_room_template_surface_prices_cents?: QuickRoomSurfacePriceSnapshot;
};

export type RoomPriceLibraryIssueCode =
  | 'missing_room_template'
  | 'disabled_room_template_surface'
  | 'missing_legacy_anchor';

export type RoomPriceLibraryIssue = {
  code: RoomPriceLibraryIssueCode;
  message: string;
  source_id?: string;
  source_label?: string;
};

export type ResolvedAdvancedRoomPriceSource =
  | {
      ok: true;
      kind: 'room_template';
      room_template_id: string;
      room_template_version: number;
      room_template_label: string;
      size: QuickRoomSize;
      surfaces: QuickRoomSurface[];
      surface_prices_cents: QuickRoomSurfacePriceSnapshot;
      range_cents: { min: number; median: number; max: number };
      total_cents: number;
    }
  | {
      ok: true;
      kind: 'legacy_anchor';
      anchor_room_type: string;
      range_cents: { min: number; median: number; max: number };
    }
  | {
      ok: false;
      issue: RoomPriceLibraryIssue;
    };

export function getRoomTemplateById(
  settings: UserRateSettings,
  id: string
): QuickEstimateRoom | null {
  return settings.quick_estimate.rooms.find((room) => room.id === id) ?? null;
}

function enabledSurfaceSet(room: QuickEstimateRoom) {
  return new Set(room.enabled_surfaces);
}

function centsForSurface(
  room: QuickEstimateRoom,
  size: QuickRoomSize,
  surface: QuickRoomSurface
) {
  return room.sizes[size][`${surface}_cents`];
}

export function getRoomTemplateSurfaceTotalCents(
  room: QuickEstimateRoom,
  size: QuickRoomSize,
  surfaces: QuickRoomSurface[]
): number {
  const enabled = enabledSurfaceSet(room);
  return surfaces.reduce((sum, surface) => {
    if (!enabled.has(surface)) {
      throw new Error(`${room.label} does not enable ${surface}.`);
    }
    return sum + centsForSurface(room, size, surface);
  }, 0);
}

export function deriveAnchorRangeFromRoomTemplate(
  room: QuickEstimateRoom,
  surfaces: QuickRoomSurface[]
) {
  return {
    min: getRoomTemplateSurfaceTotalCents(room, 'small', surfaces),
    median: getRoomTemplateSurfaceTotalCents(room, 'medium', surfaces),
    max: getRoomTemplateSurfaceTotalCents(room, 'large', surfaces),
  };
}

export function getIncludedRoomSurfaces(room: {
  include_walls?: boolean;
  include_ceiling?: boolean;
  include_trim?: boolean;
}): QuickRoomSurface[] {
  const surfaces: QuickRoomSurface[] = [];
  if (room.include_walls) surfaces.push('walls');
  if (room.include_ceiling) surfaces.push('ceiling');
  if (room.include_trim) surfaces.push('trim');
  return surfaces;
}

export function pickRoomTemplateSurfacePrices(
  room: QuickEstimateRoom,
  size: QuickRoomSize,
  surfaces: QuickRoomSurface[]
): QuickRoomSurfacePriceSnapshot {
  const enabled = enabledSurfaceSet(room);
  const prices: QuickRoomSurfacePriceSnapshot = {
    walls_cents: 0,
    ceiling_cents: 0,
    trim_cents: 0,
  };

  surfaces.forEach((surface) => {
    if (!enabled.has(surface)) {
      throw new Error(`${room.label} does not enable ${surface}.`);
    }
    prices[`${surface}_cents`] = centsForSurface(room, size, surface);
  });

  return prices;
}

export function getRoomTemplateSurfaceSnapshotTotalCents(
  prices: QuickRoomSurfacePriceSnapshot
) {
  return prices.walls_cents + prices.ceiling_cents + prices.trim_cents;
}

function resolveRequestedTemplateId(itemOrRoom: RoomLike) {
  return itemOrRoom.source_room_template_id?.trim() || null;
}

function getRoomLikeLabel(itemOrRoom: AdvancedEstimateRoomItem | RoomLike) {
  if ('name' in itemOrRoom && itemOrRoom.name?.trim()) {
    return itemOrRoom.name.trim();
  }
  if (itemOrRoom.anchor_room_type?.trim()) {
    return itemOrRoom.anchor_room_type.trim();
  }
  if ('label' in itemOrRoom && itemOrRoom.label?.trim()) {
    return itemOrRoom.label.trim();
  }
  return 'Advanced room';
}

function resolveRequestedSize(itemOrRoom: RoomLike): QuickRoomSize {
  return (
    itemOrRoom.source_room_template_size ?? itemOrRoom.default_size ?? 'medium'
  );
}

function resolveLegacyAnchor(
  settings: UserRateSettings,
  itemOrRoom: RoomLike
): ResolvedAdvancedRoomPriceSource {
  const anchorRoomType = itemOrRoom.anchor_room_type?.trim();
  const roomLabel = getRoomLikeLabel(itemOrRoom);
  if (!anchorRoomType) {
    return {
      ok: false,
      issue: {
        code: 'missing_legacy_anchor',
        message: `${roomLabel} has no Room Price Library template or legacy anchor.`,
        source_label: roomLabel,
      },
    };
  }

  const range =
    settings.detailed_estimate_anchors.interior_rooms[anchorRoomType];
  if (!range) {
    return {
      ok: false,
      issue: {
        code: 'missing_legacy_anchor',
        message: `${roomLabel} uses missing legacy anchor "${anchorRoomType}".`,
        source_id: anchorRoomType,
        source_label: roomLabel,
      },
    };
  }

  return {
    ok: true,
    kind: 'legacy_anchor',
    anchor_room_type: anchorRoomType,
    range_cents: range,
  };
}

export function resolveAdvancedRoomPriceSource(
  settings: UserRateSettings,
  itemOrRoom: AdvancedEstimateRoomItem | RoomLike
): ResolvedAdvancedRoomPriceSource {
  const templateId = resolveRequestedTemplateId(itemOrRoom);
  const roomLabel = getRoomLikeLabel(itemOrRoom);
  if (!templateId) {
    return resolveLegacyAnchor(settings, itemOrRoom);
  }

  const template = getRoomTemplateById(settings, templateId);
  if (!template) {
    return {
      ok: false,
      issue: {
        code: 'missing_room_template',
        message: `${roomLabel} uses missing Room Price Library template "${templateId}".`,
        source_id: templateId,
        source_label: roomLabel,
      },
    };
  }

  const surfaces = getIncludedRoomSurfaces(itemOrRoom);
  const disabledSurface = surfaces.find(
    (surface) => !template.enabled_surfaces.includes(surface)
  );
  if (disabledSurface) {
    return {
      ok: false,
      issue: {
        code: 'disabled_room_template_surface',
        message: `${template.label} does not enable ${disabledSurface}. Enable it in Room Price Library or remove it from the advanced preset.`,
        source_id: template.id,
        source_label: template.label,
      },
    };
  }

  const size = resolveRequestedSize(itemOrRoom);
  const surfacePrices = pickRoomTemplateSurfacePrices(template, size, surfaces);

  return {
    ok: true,
    kind: 'room_template',
    room_template_id: template.id,
    room_template_version: template.version ?? 1,
    room_template_label: template.label,
    size,
    surfaces,
    surface_prices_cents: surfacePrices,
    range_cents: deriveAnchorRangeFromRoomTemplate(template, surfaces),
    total_cents: getRoomTemplateSurfaceSnapshotTotalCents(surfacePrices),
  };
}
