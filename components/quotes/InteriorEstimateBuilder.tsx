'use client';

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

const FIELD = 'h-12 w-full rounded-xl border border-pm-border bg-white px-4 text-base text-pm-body';
const LABEL = 'mb-1.5 block text-sm font-medium text-pm-body';
type RoomRef = '' | `${number}`;

export type InteriorEstimateRoomFormState = {
  name: string;
  anchor_room_type: InteriorRoomType;
  length_m: string;
  width_m: string;
  height_m: string;
  include_walls: boolean;
  include_ceiling: boolean;
  include_trim: boolean;
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
}: {
  value: InteriorEstimateFormState;
  onChange: (next: InteriorEstimateFormState) => void;
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
            <div><label htmlFor="apartment-sqm" className={LABEL}>Apartment Size (sqm)</label><input id="apartment-sqm" type="number" min="0" step="1" inputMode="numeric" value={value.apartment_sqm} onChange={(event) => setValue('apartment_sqm', event.target.value)} className={FIELD} /></div>
          </>
        ) : (
          <>
            <div><label htmlFor="house-bedrooms" className={LABEL}>Bedrooms</label><input id="house-bedrooms" type="number" min="1" step="1" inputMode="numeric" value={value.house_bedrooms} onChange={(event) => setValue('house_bedrooms', event.target.value)} className={FIELD} /></div>
            <div><label htmlFor="house-bathrooms" className={LABEL}>Bathrooms</label><input id="house-bathrooms" type="number" min="1" step="1" inputMode="numeric" value={value.house_bathrooms} onChange={(event) => setValue('house_bathrooms', event.target.value)} className={FIELD} /></div>
            <div><label htmlFor="house-storeys" className={LABEL}>Storeys</label><select id="house-storeys" value={value.house_storeys} onChange={(event) => setValue('house_storeys', event.target.value as InteriorStoreys)} className={FIELD}>{INTERIOR_STOREYS.map((storeys) => <option key={storeys} value={storeys}>{INTERIOR_STOREY_LABELS[storeys]}</option>)}</select></div>
            <div><label htmlFor="house-sqm" className={LABEL}>House Size (sqm)</label><input id="house-sqm" type="number" min="0" step="1" inputMode="numeric" value={value.house_sqm} onChange={(event) => setValue('house_sqm', event.target.value)} className={FIELD} /></div>
          </>
        )}
      </div>

      {value.estimate_mode === 'specific_areas' ? (
        <>
          <div className="space-y-3 rounded-xl border border-pm-border bg-pm-surface/45 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-pm-body">Rooms</p><button type="button" onClick={() => setValue('rooms', [...value.rooms, createEmptyInteriorRoom()])} className="min-h-11 rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body">Add Room</button></div>
            {value.rooms.map((room, index) => (
              <div key={`room-${index}`} className="grid gap-3 rounded-xl border border-pm-border bg-white p-3 md:grid-cols-2">
                <input aria-label="Room Name" value={room.name} onChange={(event) => setRoom(index, { name: event.target.value })} className={FIELD} placeholder="Room Name" />
                <select aria-label="Room Anchor" value={room.anchor_room_type} onChange={(event) => setRoom(index, { anchor_room_type: event.target.value as InteriorRoomType })} className={FIELD}>{INTERIOR_ROOM_TYPES.map((roomType) => <option key={roomType} value={roomType}>{roomType}</option>)}</select>
                <input aria-label="Length (m)" type="number" min="0" step="0.1" value={room.length_m} onChange={(event) => setRoom(index, { length_m: event.target.value })} className={FIELD} placeholder="Length (m)" />
                <input aria-label="Width (m)" type="number" min="0" step="0.1" value={room.width_m} onChange={(event) => setRoom(index, { width_m: event.target.value })} className={FIELD} placeholder="Width (m)" />
                <input aria-label="Height (m)" type="number" min="0" step="0.1" value={room.height_m} onChange={(event) => setRoom(index, { height_m: event.target.value })} className={FIELD} placeholder="Height (m)" />
                <button type="button" onClick={() => setValue('rooms', value.rooms.length === 1 ? [createEmptyInteriorRoom()] : value.rooms.filter((_, roomIndex) => roomIndex !== index))} className="min-h-11 rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-secondary">Remove Room</button>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-pm-border bg-pm-surface/45 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-pm-body">Doors</p><button type="button" onClick={() => setValue('doors', [...value.doors, createEmptyInteriorDoor()])} className="min-h-11 rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body">Add Door</button></div>
            {value.doors.map((door, index) => <div key={`door-${index}`} className="grid gap-3 md:grid-cols-4"><select value={door.door_type} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, door_type: event.target.value as InteriorDoorType } : item))} className={FIELD}>{INTERIOR_DOOR_TYPES.map((type) => <option key={type} value={type}>{INTERIOR_DOOR_TYPE_LABELS[type]}</option>)}</select><select value={door.scope} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value as InteriorDoorScope } : item))} className={FIELD}>{INTERIOR_DOOR_SCOPES.map((scope) => <option key={scope} value={scope}>{INTERIOR_DOOR_SCOPE_LABELS[scope]}</option>)}</select><input type="number" min="1" step="1" value={door.quantity} onChange={(event) => setValue('doors', value.doors.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className={FIELD} /><button type="button" onClick={() => setValue('doors', value.doors.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-secondary">Remove</button></div>)}
          </div>

          <div className="space-y-3 rounded-xl border border-pm-border bg-pm-surface/45 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-pm-body">Windows</p><button type="button" onClick={() => setValue('windows', [...value.windows, createEmptyInteriorWindow()])} className="min-h-11 rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body">Add Window</button></div>
            {value.windows.map((windowItem, index) => <div key={`window-${index}`} className="grid gap-3 md:grid-cols-4"><select value={windowItem.window_type} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, window_type: event.target.value as InteriorWindowType } : item))} className={FIELD}>{INTERIOR_WINDOW_TYPES.map((type) => <option key={type} value={type}>{INTERIOR_WINDOW_TYPE_LABELS[type]}</option>)}</select><select value={windowItem.scope} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, scope: event.target.value as InteriorWindowScope } : item))} className={FIELD}>{INTERIOR_WINDOW_SCOPES.map((scope) => <option key={scope} value={scope}>{INTERIOR_WINDOW_SCOPE_LABELS[scope]}</option>)}</select><input type="number" min="1" step="1" value={windowItem.quantity} onChange={(event) => setValue('windows', value.windows.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className={FIELD} /><button type="button" onClick={() => setValue('windows', value.windows.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-secondary">Remove</button></div>)}
          </div>

          <div><label htmlFor="skirting-lm" className={LABEL}>Skirting Linear Metres</label><input id="skirting-lm" type="number" min="0" step="0.1" value={value.trim_items[0]?.quantity ?? ''} onChange={(event) => setValue('trim_items', event.target.value ? [{ quantity: event.target.value, paint_system: 'oil_2coat', room_index: '' }] : [])} className={FIELD} /></div>
        </>
      ) : null}
    </section>
  );
}
