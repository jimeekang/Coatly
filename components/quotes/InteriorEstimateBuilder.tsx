'use client';

import { Trash2, Plus } from 'lucide-react';
import { NumericInput, sanitizeDecimalInput, sanitizeIntegerInput } from '@/components/shared/NumericInput';
import {
  INTERIOR_APARTMENT_TYPE_LABELS,
  INTERIOR_APARTMENT_TYPES,
  INTERIOR_CONDITION_LABELS,
  INTERIOR_CONDITIONS,
  INTERIOR_DOOR_SCOPE_LABELS,
  INTERIOR_DOOR_SCOPES,
  INTERIOR_DOOR_TYPE_LABELS,
  INTERIOR_DOOR_TYPES,
  INTERIOR_PAINT_SYSTEM_LABELS,
  INTERIOR_PAINT_SYSTEMS,
  INTERIOR_ROOM_TYPES,
  INTERIOR_SCOPE_OPTIONS,
  INTERIOR_STOREY_LABELS,
  INTERIOR_STOREYS,
  INTERIOR_WALL_PAINT_SYSTEM_LABELS,
  INTERIOR_WALL_PAINT_SYSTEMS,
  INTERIOR_WINDOW_SCOPE_LABELS,
  INTERIOR_WINDOW_SCOPES,
  INTERIOR_WINDOW_TYPE_LABELS,
  INTERIOR_WINDOW_TYPES,
  type InteriorApartmentType,
  type InteriorCondition,
  type InteriorDoorScope,
  type InteriorDoorType,
  type InteriorEstimateMode,
  type InteriorPaintSystem,
  type InteriorPropertyType,
  type InteriorRoomType,
  type InteriorScope,
  type InteriorStoreys,
  type InteriorWallPaintSystem,
  type InteriorWindowScope,
  type InteriorWindowType,
} from '@/lib/interior-estimates';
import type { QuickRoomSize, UserRateSettings } from '@/lib/rate-settings';

const FIELD = 'h-12 w-full rounded-xl border border-outline-variant bg-white px-4 text-base text-on-surface';
const LABEL = 'mb-1.5 block text-sm font-medium text-on-surface';
type RoomRef = '' | `${number}`;
const INTERIOR_ADVANCED_ROOM_SNAPSHOT_VERSION = 1;

function inferAnchorRoomType(
  name: string,
  rateSettings?: UserRateSettings | null
): InteriorRoomType {
  const normalized = name.trim().toLowerCase();
  const customAnchor = Object.keys(
    rateSettings?.detailed_estimate_anchors?.interior_rooms ?? {}
  ).find((roomType) => roomType.toLowerCase() === normalized);
  if (customAnchor) return customAnchor;

  const matched = INTERIOR_ROOM_TYPES.find(
    (roomType) => roomType.toLowerCase() === normalized
  );
  return matched ?? 'Other';
}

export type InteriorEstimateRoomFormState = {
  name: string;
  anchor_room_type: InteriorRoomType;
  length_m: string;
  width_m: string;
  height_m: string;
  include_walls: boolean;
  include_ceiling: boolean;
  include_trim: boolean;
  include_doors: boolean;
  include_windows: boolean;
  condition: InteriorCondition;
  wall_paint_system: InteriorWallPaintSystem;
  trim_paint_system: InteriorPaintSystem;
  source_rate_item_id?: string;
  source_rate_item_version?: number;
  source_rate_item_label?: string;
  source_room_template_id?: string;
  source_room_template_version?: number;
  source_room_template_label?: string;
  source_room_template_size?: QuickRoomSize;
  source_room_template_surface_prices_cents?: {
    walls_cents: number;
    ceiling_cents: number;
    trim_cents: number;
  };
  source_room_template_coating_multiplier_pct?: number;
  source_room_template_condition_multiplier_pct?: number;
  rate_snapshot_version?: 1;
  source_anchor_range_cents?: {
    min: number;
    median: number;
    max: number;
  };
  source_surface_rate_multiplier?: number;
  source_scope_multiplier?: number;
  source_condition?: InteriorCondition;
  source_wall_paint_system?: InteriorWallPaintSystem;
  source_trim_paint_system?: InteriorPaintSystem;
};
export type InteriorDoorFormState = {
  door_type: InteriorDoorType;
  scope: InteriorDoorScope;
  quantity: string;
  paint_system: InteriorPaintSystem;
  room_index: RoomRef;
};
export type InteriorWindowFormState = {
  window_type: InteriorWindowType;
  scope: InteriorWindowScope;
  quantity: string;
  paint_system: InteriorPaintSystem;
  room_index: RoomRef;
};
export type InteriorTrimFormState = {
  quantity: string;
  paint_system: InteriorPaintSystem;
  room_index: RoomRef;
};
export type InteriorEstimateFormState = {
  property_type: InteriorPropertyType;
  estimate_mode: InteriorEstimateMode;
  apartment_type: InteriorApartmentType;
  apartment_sqm: string;
  house_bedrooms: string;
  house_bathrooms: string;
  house_storeys: InteriorStoreys;
  house_sqm: string;
  condition: InteriorCondition;
  scope: InteriorScope[];
  wall_paint_system: InteriorWallPaintSystem;
  trim_paint_system: InteriorPaintSystem;
  rooms: InteriorEstimateRoomFormState[];
  doors: InteriorDoorFormState[];
  windows: InteriorWindowFormState[];
  trim_items: InteriorTrimFormState[];
};

export const createEmptyInteriorRoom = (): InteriorEstimateRoomFormState => ({
  name: '',
  anchor_room_type: 'Living Room',
  length_m: '',
  width_m: '',
  height_m: '',
  include_walls: true,
  include_ceiling: true,
  include_trim: false,
  include_doors: false,
  include_windows: false,
  condition: 'fair',
  wall_paint_system: 'repaint_2coat',
  trim_paint_system: 'oil_2coat',
});
export const createEmptyInteriorDoor = (): InteriorDoorFormState => ({
  door_type: 'standard',
  scope: 'door_and_frame',
  quantity: '1',
  paint_system: 'oil_2coat',
  room_index: '',
});
export const createEmptyInteriorWindow = (): InteriorWindowFormState => ({
  window_type: 'normal',
  scope: 'window_and_frame',
  quantity: '1',
  paint_system: 'oil_2coat',
  room_index: '',
});
export const createEmptyInteriorTrim = (): InteriorTrimFormState => ({
  quantity: '',
  paint_system: 'oil_2coat',
  room_index: '',
});

export function createEmptyInteriorEstimateState(): InteriorEstimateFormState {
  return {
    property_type: 'apartment',
    estimate_mode: 'specific_areas',
    apartment_type: '2_bedroom_standard',
    apartment_sqm: '',
    house_bedrooms: '3',
    house_bathrooms: '2',
    house_storeys: '1_storey',
    house_sqm: '',
    condition: 'fair',
    scope: ['walls', 'ceiling', 'trim'],
    wall_paint_system: 'repaint_2coat',
    trim_paint_system: 'oil_2coat',
    rooms: [],
    doors: [],
    windows: [],
    trim_items: [],
  };
}

export function InteriorEstimateBuilder({
  value,
  onChange,
  rateSettings,
}: {
  value: InteriorEstimateFormState;
  onChange: (next: InteriorEstimateFormState) => void;
  rateSettings?: UserRateSettings | null;
}) {
  function setValue<K extends keyof InteriorEstimateFormState>(key: K, nextValue: InteriorEstimateFormState[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  function setRoom(index: number, patch: Partial<InteriorEstimateRoomFormState>) {
    setValue('rooms', value.rooms.map((room, roomIndex) => (roomIndex === index ? { ...room, ...patch } : room)));
  }

  function setRoomPricing(
    index: number,
    patch: Partial<
      Pick<
        InteriorEstimateRoomFormState,
        'condition' | 'wall_paint_system' | 'trim_paint_system'
      >
    >
  ) {
    setRoom(index, {
      ...patch,
      source_surface_rate_multiplier: undefined,
      source_room_template_coating_multiplier_pct: undefined,
      source_room_template_condition_multiplier_pct: undefined,
    });
  }

  function setTrimPaintSystem(nextPaintSystem: InteriorPaintSystem) {
    onChange({
      ...value,
      trim_paint_system: nextPaintSystem,
      doors: value.doors.map((door) => ({
        ...door,
        paint_system: nextPaintSystem,
      })),
      windows: value.windows.map((windowItem) => ({
        ...windowItem,
        paint_system: nextPaintSystem,
      })),
      trim_items: value.trim_items.map((trimItem) => ({
        ...trimItem,
        paint_system: nextPaintSystem,
      })),
    });
  }

  function isEmptyPlaceholderRoom(room: InteriorEstimateRoomFormState) {
    return (
      room.name.trim() === '' &&
      room.length_m.trim() === '' &&
      room.width_m.trim() === '' &&
      room.height_m.trim() === '' &&
      room.include_walls &&
      room.include_ceiling &&
      !room.include_trim &&
      !room.include_doors &&
      !room.include_windows &&
      room.condition === 'fair' &&
      room.wall_paint_system === 'repaint_2coat' &&
      room.trim_paint_system === 'oil_2coat'
    );
  }

  function createRoomFromLibraryItem(
    item: NonNullable<UserRateSettings['detailed_estimate_items']>['advanced_rooms'][number]
  ): InteriorEstimateRoomFormState {
    const template = rateSettings?.quick_estimate.rooms.find(
      (room) => room.id === item.source_room_template_id
    );

    return {
      ...createEmptyInteriorRoom(),
      name: item.label,
      anchor_room_type: item.anchor_room_type || template?.label || item.label,
      include_walls: item.include_walls,
      include_ceiling: item.include_ceiling,
      include_trim: item.include_trim,
      source_rate_item_id: item.id,
      source_rate_item_version: item.version ?? 1,
      source_rate_item_label: item.label,
      source_room_template_id: template?.id ?? item.source_room_template_id,
      source_room_template_version:
        template?.version ?? item.source_room_template_version,
      source_room_template_label: template?.label,
      source_room_template_size: item.default_size ?? 'medium',
      rate_snapshot_version: INTERIOR_ADVANCED_ROOM_SNAPSHOT_VERSION,
    };
  }

  function addRoomFromLibraryItem(
    item: NonNullable<UserRateSettings['detailed_estimate_items']>['advanced_rooms'][number]
  ) {
    const room = createRoomFromLibraryItem(item);
    const shouldReplaceOnlyRoom =
      value.rooms.length === 1 && isEmptyPlaceholderRoom(value.rooms[0]);
    setValue('rooms', shouldReplaceOnlyRoom ? [room] : [...value.rooms, room]);
  }

  function toggleScope(scope: InteriorScope) {
    const next = value.scope.includes(scope) ? value.scope.filter((item) => item !== scope) : [...value.scope, scope];
    setValue('scope', next.length > 0 ? next : [scope]);
  }

  const availableDoorTypes = (
    rateSettings?.enabled_door_types?.length
      ? INTERIOR_DOOR_TYPES.filter((type) => rateSettings.enabled_door_types.includes(type))
      : [...INTERIOR_DOOR_TYPES]
  ) as InteriorDoorType[];

  const availableDoorScopes = (
    rateSettings?.enabled_door_scopes?.length
      ? INTERIOR_DOOR_SCOPES.filter((scope) => rateSettings.enabled_door_scopes.includes(scope))
      : [...INTERIOR_DOOR_SCOPES]
  ) as InteriorDoorScope[];

  const availableWindowTypes = (
    rateSettings?.enabled_window_types?.length
      ? INTERIOR_WINDOW_TYPES.filter((type) => rateSettings.enabled_window_types.includes(type))
      : [...INTERIOR_WINDOW_TYPES]
  ) as InteriorWindowType[];
  const advancedRoomItems = [
    ...(rateSettings?.detailed_estimate_items?.advanced_rooms ?? []),
  ].sort((a, b) => a.sort_order - b.sort_order);
  const roomPriceTemplates = [
    ...(rateSettings?.quick_estimate?.rooms ?? []),
  ].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section className="space-y-4 rounded-2xl border border-outline-variant bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={LABEL}>Property Type</label>
          <div className="flex rounded-xl border border-outline-variant bg-surface-container p-1">
            {(['apartment', 'house'] as const).map((propertyType) => (
              <button key={propertyType} type="button" onClick={() => setValue('property_type', propertyType)} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${value.property_type === propertyType ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>
                {propertyType === 'apartment' ? 'Apartment' : 'House'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={LABEL}>Estimate Mode</label>
          <div className="flex rounded-xl border border-outline-variant bg-surface-container p-1">
            {(['specific_areas', 'entire_property'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setValue('estimate_mode', mode)} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${value.estimate_mode === mode ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>
                {mode === 'specific_areas' ? 'Specific Areas' : 'Entire Property'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {value.estimate_mode === 'entire_property' && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="interior-condition" className={LABEL}>Condition</label>
              <select id="interior-condition" value={value.condition} onChange={(event) => setValue('condition', event.target.value as InteriorCondition)} className={FIELD}>
                {INTERIOR_CONDITIONS.map((condition) => <option key={condition} value={condition}>{INTERIOR_CONDITION_LABELS[condition]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Scope</label>
              <div className="flex flex-wrap gap-2">
                {INTERIOR_SCOPE_OPTIONS.map((scope) => (
                  <button key={scope} type="button" onClick={() => toggleScope(scope)} className={`min-h-11 rounded-full border px-4 text-sm font-medium ${value.scope.includes(scope) ? 'border-primary bg-primary text-white' : 'border-outline-variant bg-white text-on-surface'}`}>
                    {scope === 'trim' ? 'Trim / Skirting' : scope.charAt(0).toUpperCase() + scope.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL}>Wall &amp; Ceiling Coating</label>
            <div className="grid gap-2 md:grid-cols-3">
              {INTERIOR_WALL_PAINT_SYSTEMS.map((paintSystem) => (
                <button
                  key={paintSystem}
                  type="button"
                  onClick={() => setValue('wall_paint_system', paintSystem)}
                  aria-pressed={value.wall_paint_system === paintSystem}
                  className={`min-h-11 rounded-xl border px-4 py-3 text-left text-sm font-medium ${
                    value.wall_paint_system === paintSystem
                      ? 'border-primary bg-primary text-white'
                      : 'border-outline-variant bg-white text-on-surface'
                  }`}
                >
                  {INTERIOR_WALL_PAINT_SYSTEM_LABELS[paintSystem]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Trim Base</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTERIOR_PAINT_SYSTEMS.map((paintSystem) => (
                <button
                  key={paintSystem}
                  type="button"
                  onClick={() => setTrimPaintSystem(paintSystem)}
                  aria-pressed={value.trim_paint_system === paintSystem}
                  className={`min-h-11 rounded-xl border px-4 py-3 text-left text-sm font-medium ${
                    value.trim_paint_system === paintSystem
                      ? 'border-primary bg-primary text-white'
                      : 'border-outline-variant bg-white text-on-surface'
                  }`}
                >
                  {INTERIOR_PAINT_SYSTEM_LABELS[paintSystem]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {value.estimate_mode === 'entire_property' && (
        <div className="grid gap-4 md:grid-cols-2">
          {value.property_type === 'apartment' ? (
            <>
              <div><label htmlFor="apartment-type" className={LABEL}>Apartment Type</label><select id="apartment-type" value={value.apartment_type} onChange={(event) => setValue('apartment_type', event.target.value as InteriorApartmentType)} className={FIELD}>{INTERIOR_APARTMENT_TYPES.map((apartmentType) => <option key={apartmentType} value={apartmentType}>{INTERIOR_APARTMENT_TYPE_LABELS[apartmentType]}</option>)}</select></div>
              <div><label htmlFor="apartment-sqm" className={LABEL}>Apartment Size (sqm)</label><NumericInput id="apartment-sqm" inputMode="decimal" value={value.apartment_sqm} sanitize={sanitizeDecimalInput} onValueChange={(nextValue) => setValue('apartment_sqm', nextValue)} className={FIELD} /></div>
            </>
          ) : (
            <>
              <div><label htmlFor="house-bedrooms" className={LABEL}>Bedrooms</label><NumericInput id="house-bedrooms" inputMode="numeric" value={value.house_bedrooms} sanitize={sanitizeIntegerInput} onValueChange={(nextValue) => setValue('house_bedrooms', nextValue)} className={FIELD} /></div>
              <div><label htmlFor="house-bathrooms" className={LABEL}>Bathrooms</label><NumericInput id="house-bathrooms" inputMode="numeric" value={value.house_bathrooms} sanitize={sanitizeIntegerInput} onValueChange={(nextValue) => setValue('house_bathrooms', nextValue)} className={FIELD} /></div>
              <div><label htmlFor="house-storeys" className={LABEL}>Storeys</label><select id="house-storeys" value={value.house_storeys} onChange={(event) => setValue('house_storeys', event.target.value as InteriorStoreys)} className={FIELD}>{INTERIOR_STOREYS.map((storeys) => <option key={storeys} value={storeys}>{INTERIOR_STOREY_LABELS[storeys]}</option>)}</select></div>
              <div><label htmlFor="house-sqm" className={LABEL}>House Size (sqm)</label><NumericInput id="house-sqm" inputMode="decimal" value={value.house_sqm} sanitize={sanitizeDecimalInput} onValueChange={(nextValue) => setValue('house_sqm', nextValue)} className={FIELD} /></div>
            </>
          )}
        </div>
      )}

      {value.estimate_mode === 'specific_areas' ? (
        <>
          <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-on-surface">Rooms</p>
              {advancedRoomItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {advancedRoomItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addRoomFromLibraryItem(item)}
                      className="min-h-11 rounded-full border border-outline-variant bg-white px-4 text-sm font-medium text-on-surface hover:border-primary"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {value.rooms.map((room, index) => (
              <div key={`room-${index}`} className="space-y-3 rounded-xl border border-outline-variant bg-white p-3">
                {/* Row 1: Room name + delete */}
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Room Name"
                    value={room.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setRoom(index, {
                        name,
                        anchor_room_type: inferAnchorRoomType(
                          name,
                          rateSettings
                        ),
                      });
                    }}
                    className={`${FIELD} flex-1`}
                    placeholder="e.g. Master Bedroom"
                  />
                  <button
                    type="button"
                    aria-label="Remove room"
                    onClick={() => setValue('rooms', value.rooms.filter((_, roomIndex) => roomIndex !== index))}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {roomPriceTemplates.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px]">
                    <div>
                      <label
                        htmlFor={`room-price-source-${index}`}
                        className="mb-1 block text-xs text-on-surface-variant"
                      >
                        Room Price Library Source
                      </label>
                      <select
                        id={`room-price-source-${index}`}
                        value={room.source_room_template_id ?? ''}
                        onChange={(event) => {
                          const template = roomPriceTemplates.find(
                            (item) => item.id === event.target.value
                          );
                          setRoom(index, {
                            source_room_template_id: template?.id,
                            source_room_template_version: template
                              ? (template.version ?? 1)
                              : undefined,
                            source_room_template_label: template?.label,
                            source_room_template_size:
                              room.source_room_template_size ?? 'medium',
                            anchor_room_type:
                              template?.label ?? room.anchor_room_type,
                            rate_snapshot_version: template
                              ? INTERIOR_ADVANCED_ROOM_SNAPSHOT_VERSION
                              : undefined,
                          });
                        }}
                        className={FIELD}
                      >
                        <option value="">Legacy anchor / manual</option>
                        {roomPriceTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`room-price-size-${index}`}
                        className="mb-1 block text-xs text-on-surface-variant"
                      >
                        Size
                      </label>
                      <select
                        id={`room-price-size-${index}`}
                        value={room.source_room_template_size ?? 'medium'}
                        onChange={(event) =>
                          setRoom(index, {
                            source_room_template_size:
                              event.target.value as QuickRoomSize,
                            rate_snapshot_version:
                              room.source_room_template_id != null
                                ? INTERIOR_ADVANCED_ROOM_SNAPSHOT_VERSION
                                : room.rate_snapshot_version,
                          })
                        }
                        className={FIELD}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor={`room-condition-${index}`} className="mb-1 block text-xs text-on-surface-variant">Condition</label>
                  <select
                    id={`room-condition-${index}`}
                    aria-label={`Condition for Room ${index + 1}`}
                    value={room.condition}
                    onChange={(event) =>
                      setRoomPricing(index, {
                        condition: event.target.value as InteriorCondition,
                      })
                    }
                    className={FIELD}
                  >
                    {INTERIOR_CONDITIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {INTERIOR_CONDITION_LABELS[condition]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 4: Surface type toggles */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-on-surface-variant">Scope</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'include_walls', label: 'Walls' },
                        { key: 'include_ceiling', label: 'Ceiling' },
                        { key: 'include_trim', label: 'Trim' },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRoom(index, { [key]: !room[key] })}
                        className={`h-11 rounded-full border px-4 text-sm font-medium ${room[key] ? 'border-primary bg-primary text-white' : 'border-outline-variant bg-white text-on-surface'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {!room.include_walls &&
                    !room.include_ceiling &&
                    !room.include_trim && (
                      <p className="mt-2 text-xs font-medium text-red-700">
                        Select at least one surface for Room {index + 1}.
                      </p>
                    )}
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-on-surface-variant">Wall &amp; Ceiling Coating</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {INTERIOR_WALL_PAINT_SYSTEMS.map((paintSystem) => (
                      <button
                        key={paintSystem}
                        type="button"
                        onClick={() =>
                          setRoomPricing(index, {
                            wall_paint_system: paintSystem,
                          })
                        }
                        aria-pressed={room.wall_paint_system === paintSystem}
                        className={`min-h-11 rounded-xl border px-4 py-3 text-left text-sm font-medium ${
                          room.wall_paint_system === paintSystem
                            ? 'border-primary bg-primary text-white'
                            : 'border-outline-variant bg-white text-on-surface'
                        }`}
                      >
                        {INTERIOR_WALL_PAINT_SYSTEM_LABELS[paintSystem]}
                      </button>
                    ))}
                  </div>
                </div>

                {room.include_trim && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-on-surface-variant">Trim Base</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {INTERIOR_PAINT_SYSTEMS.map((paintSystem) => (
                        <button
                          key={paintSystem}
                          type="button"
                          onClick={() =>
                            setRoomPricing(index, {
                              trim_paint_system: paintSystem,
                            })
                          }
                          aria-pressed={room.trim_paint_system === paintSystem}
                          className={`min-h-11 rounded-xl border px-4 py-3 text-left text-sm font-medium ${
                            room.trim_paint_system === paintSystem
                              ? 'border-primary bg-primary text-white'
                              : 'border-outline-variant bg-white text-on-surface'
                          }`}
                        >
                          {INTERIOR_PAINT_SYSTEM_LABELS[paintSystem]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Room — full-width, bottom */}
            <button
              type="button"
              onClick={() => setValue('rooms', [...value.rooms, createEmptyInteriorRoom()])}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant bg-white text-sm font-medium text-on-surface"
            >
              <Plus size={16} />
              Add Room
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container/50 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-on-surface">Doors</p><button type="button" onClick={() => setValue('doors', [...value.doors, { ...createEmptyInteriorDoor(), paint_system: value.trim_paint_system }])} className="min-h-11 rounded-xl border border-outline-variant bg-white px-4 text-sm font-medium text-on-surface">Add Door</button></div>
            {value.doors.map((door, index) => {
              const activeDoorType = availableDoorTypes.includes(door.door_type) ? door.door_type : availableDoorTypes[0];
              const activeDoorScope = availableDoorScopes.includes(door.scope) ? door.scope : availableDoorScopes[0];
              return <div key={`door-${index}`} className="grid gap-3 md:grid-cols-4"><select value={activeDoorType} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, door_type: event.target.value as InteriorDoorType } : item))} className={FIELD}>{availableDoorTypes.map((type) => <option key={type} value={type}>{INTERIOR_DOOR_TYPE_LABELS[type]}</option>)}</select><select value={activeDoorScope} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value as InteriorDoorScope } : item))} className={FIELD}>{availableDoorScopes.map((scope) => <option key={scope} value={scope}>{INTERIOR_DOOR_SCOPE_LABELS[scope]}</option>)}</select><input type="number" min="1" step="1" value={door.quantity} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className={FIELD} /><button type="button" onClick={() => setValue('doors', value.doors.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 rounded-xl border border-outline-variant px-4 text-sm font-medium text-on-surface-variant">Remove</button></div>;
            })}
          </div>

          <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container/50 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-on-surface">Windows</p><button type="button" onClick={() => setValue('windows', [...value.windows, { ...createEmptyInteriorWindow(), paint_system: value.trim_paint_system }])} className="min-h-11 rounded-xl border border-outline-variant bg-white px-4 text-sm font-medium text-on-surface">Add Window</button></div>
            {value.windows.map((windowItem, index) => {
              const activeWindowType = availableWindowTypes.includes(windowItem.window_type) ? windowItem.window_type : availableWindowTypes[0];
              return <div key={`window-${index}`} className="grid gap-3 md:grid-cols-4"><select value={activeWindowType} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, window_type: event.target.value as InteriorWindowType } : item))} className={FIELD}>{availableWindowTypes.map((type) => <option key={type} value={type}>{INTERIOR_WINDOW_TYPE_LABELS[type]}</option>)}</select><select value={windowItem.scope} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value as InteriorWindowScope } : item))} className={FIELD}>{INTERIOR_WINDOW_SCOPES.map((scope) => <option key={scope} value={scope}>{INTERIOR_WINDOW_SCOPE_LABELS[scope]}</option>)}</select><input type="number" min="1" step="1" value={windowItem.quantity} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className={FIELD} /><button type="button" onClick={() => setValue('windows', value.windows.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 rounded-xl border border-outline-variant px-4 text-sm font-medium text-on-surface-variant">Remove</button></div>;
            })}
          </div>

          <div><label htmlFor="skirting-lm" className={LABEL}>Skirting Linear Metres</label><input id="skirting-lm" type="number" min="0" step="0.1" value={value.trim_items[0]?.quantity ?? ''} onChange={(event) => setValue('trim_items', event.target.value ? [{ quantity: event.target.value, paint_system: value.trim_paint_system, room_index: '' }] : [])} className={FIELD} /></div>
        </>
      ) : null}
    </section>
  );
}
