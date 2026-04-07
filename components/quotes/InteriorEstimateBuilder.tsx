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
  INTERIOR_ROOM_TYPES,
  INTERIOR_SCOPE_OPTIONS,
  INTERIOR_STOREY_LABELS,
  INTERIOR_STOREYS,
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
  type InteriorWindowScope,
  type InteriorWindowType,
} from '@/lib/interior-estimates';
import type { UserRateSettings } from '@/lib/rate-settings';

const FIELD = 'h-12 w-full rounded-xl border border-pm-border bg-white px-4 text-base text-pm-body';
const LABEL = 'mb-1.5 block text-sm font-medium text-pm-body';
type RoomRef = '' | `${number}`;

function inferAnchorRoomType(name: string): InteriorRoomType {
  const normalized = name.trim().toLowerCase();
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
  height_m: '2.7',
  include_walls: true,
  include_ceiling: true,
  include_trim: false,
  include_doors: false,
  include_windows: false,
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
    rooms: [createEmptyInteriorRoom()],
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

  return (
    <section className="space-y-4 rounded-2xl border border-pm-border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={LABEL}>Property Type</label>
          <div className="flex rounded-xl border border-pm-border bg-pm-surface p-1">
            {(['apartment', 'house'] as const).map((propertyType) => (
              <button key={propertyType} type="button" onClick={() => setValue('property_type', propertyType)} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${value.property_type === propertyType ? 'bg-pm-teal text-white' : 'text-pm-secondary'}`}>
                {propertyType === 'apartment' ? 'Apartment' : 'House'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={LABEL}>Estimate Mode</label>
          <div className="flex rounded-xl border border-pm-border bg-pm-surface p-1">
            {(['specific_areas', 'entire_property'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setValue('estimate_mode', mode)} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${value.estimate_mode === mode ? 'bg-pm-teal text-white' : 'text-pm-secondary'}`}>
                {mode === 'specific_areas' ? 'Specific Areas' : 'Entire Property'}
              </button>
            ))}
          </div>
        </div>
      </div>

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
              <button key={scope} type="button" onClick={() => toggleScope(scope)} className={`min-h-11 rounded-full border px-4 text-sm font-medium ${value.scope.includes(scope) ? 'border-pm-teal bg-pm-teal text-white' : 'border-pm-border bg-white text-pm-body'}`}>
                {scope === 'trim' ? 'Trim / Skirting' : scope.charAt(0).toUpperCase() + scope.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {value.estimate_mode === 'specific_areas' ? (
        <>
          <div className="space-y-3 rounded-xl border border-pm-border bg-pm-surface/45 p-4">
            <p className="text-sm font-semibold text-pm-body">Rooms</p>
            {value.rooms.map((room, index) => (
              <div key={`room-${index}`} className="space-y-3 rounded-xl border border-pm-border bg-white p-3">
                {/* Row 1: Room name + delete */}
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Room Name"
                    value={room.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setRoom(index, { name, anchor_room_type: inferAnchorRoomType(name) });
                    }}
                    className={`${FIELD} flex-1`}
                    placeholder="e.g. Master Bedroom"
                  />
                  <button
                    type="button"
                    aria-label="Remove room"
                    onClick={() => setValue('rooms', value.rooms.length === 1 ? [createEmptyInteriorRoom()] : value.rooms.filter((_, roomIndex) => roomIndex !== index))}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-pm-border text-pm-secondary"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Row 2: L × W × H compact 3-col */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-pm-secondary">Length (m)</label>
                    <NumericInput
                      aria-label="Length (m)"
                      inputMode="decimal"
                      value={room.length_m}
                      sanitize={sanitizeDecimalInput}
                      onValueChange={(v) => setRoom(index, { length_m: v })}
                      className={FIELD}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-pm-secondary">Width (m)</label>
                    <NumericInput
                      aria-label="Width (m)"
                      inputMode="decimal"
                      value={room.width_m}
                      sanitize={sanitizeDecimalInput}
                      onValueChange={(v) => setRoom(index, { width_m: v })}
                      className={FIELD}
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-pm-secondary">Height (m)</label>
                    <NumericInput
                      aria-label="Height (m)"
                      inputMode="decimal"
                      value={room.height_m}
                      sanitize={sanitizeDecimalInput}
                      onValueChange={(v) => setRoom(index, { height_m: v })}
                      className={FIELD}
                      placeholder="2.7"
                    />
                  </div>
                </div>

                {/* Row 4: Surface type toggles */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-pm-secondary">Surfaces</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'include_walls', label: 'Walls' },
                        { key: 'include_ceiling', label: 'Ceiling' },
                        { key: 'include_trim', label: 'Trim' },
                        { key: 'include_doors', label: 'Doors' },
                        { key: 'include_windows', label: 'Windows' },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRoom(index, { [key]: !room[key] })}
                        className={`h-11 rounded-full border px-4 text-sm font-medium ${room[key] ? 'border-pm-teal bg-pm-teal text-white' : 'border-pm-border bg-white text-pm-body'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Room — full-width, bottom */}
            <button
              type="button"
              onClick={() => setValue('rooms', [...value.rooms, createEmptyInteriorRoom()])}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pm-border bg-white text-sm font-medium text-pm-body"
            >
              <Plus size={16} />
              Add Room
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-pm-border bg-pm-surface/45 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-pm-body">Doors</p><button type="button" onClick={() => setValue('doors', [...value.doors, createEmptyInteriorDoor()])} className="min-h-11 rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body">Add Door</button></div>
            {value.doors.map((door, index) => {
              const activeDoorType = availableDoorTypes.includes(door.door_type) ? door.door_type : availableDoorTypes[0];
              const activeDoorScope = availableDoorScopes.includes(door.scope) ? door.scope : availableDoorScopes[0];
              return <div key={`door-${index}`} className="grid gap-3 md:grid-cols-4"><select value={activeDoorType} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, door_type: event.target.value as InteriorDoorType } : item))} className={FIELD}>{availableDoorTypes.map((type) => <option key={type} value={type}>{INTERIOR_DOOR_TYPE_LABELS[type]}</option>)}</select><select value={activeDoorScope} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value as InteriorDoorScope } : item))} className={FIELD}>{availableDoorScopes.map((scope) => <option key={scope} value={scope}>{INTERIOR_DOOR_SCOPE_LABELS[scope]}</option>)}</select><input type="number" min="1" step="1" value={door.quantity} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className={FIELD} /><button type="button" onClick={() => setValue('doors', value.doors.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-secondary">Remove</button></div>;
            })}
          </div>

          <div className="space-y-3 rounded-xl border border-pm-border bg-pm-surface/45 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-pm-body">Windows</p><button type="button" onClick={() => setValue('windows', [...value.windows, createEmptyInteriorWindow()])} className="min-h-11 rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body">Add Window</button></div>
            {value.windows.map((windowItem, index) => {
              const activeWindowType = availableWindowTypes.includes(windowItem.window_type) ? windowItem.window_type : availableWindowTypes[0];
              return <div key={`window-${index}`} className="grid gap-3 md:grid-cols-4"><select value={activeWindowType} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, window_type: event.target.value as InteriorWindowType } : item))} className={FIELD}>{availableWindowTypes.map((type) => <option key={type} value={type}>{INTERIOR_WINDOW_TYPE_LABELS[type]}</option>)}</select><select value={windowItem.scope} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value as InteriorWindowScope } : item))} className={FIELD}>{INTERIOR_WINDOW_SCOPES.map((scope) => <option key={scope} value={scope}>{INTERIOR_WINDOW_SCOPE_LABELS[scope]}</option>)}</select><input type="number" min="1" step="1" value={windowItem.quantity} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className={FIELD} /><button type="button" onClick={() => setValue('windows', value.windows.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-secondary">Remove</button></div>;
            })}
          </div>

          <div><label htmlFor="skirting-lm" className={LABEL}>Skirting Linear Metres</label><input id="skirting-lm" type="number" min="0" step="0.1" value={value.trim_items[0]?.quantity ?? ''} onChange={(event) => setValue('trim_items', event.target.value ? [{ quantity: event.target.value, paint_system: 'oil_2coat', room_index: '' }] : [])} className={FIELD} /></div>
        </>
      ) : null}
    </section>
  );
}
