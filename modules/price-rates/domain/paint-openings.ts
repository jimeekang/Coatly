export const TRIM_PAINT_SYSTEMS = [
  'oil_2coat',
  'water_3coat_white_finish',
] as const;
export type TrimPaintSystem = (typeof TRIM_PAINT_SYSTEMS)[number];

export const RATE_DOOR_TYPES = [
  'standard',
  'flush',
  'panelled',
  'french',
  'sliding',
  'bi_fold',
] as const;
export const INTERIOR_DOOR_TYPES = RATE_DOOR_TYPES;
export type RateDoorType = (typeof RATE_DOOR_TYPES)[number];
export type InteriorDoorType = RateDoorType;

export const DOOR_SCOPES = [
  'door_and_frame',
  'door_only',
  'frame_only',
] as const;
export const INTERIOR_DOOR_SCOPES = DOOR_SCOPES;
export type DoorScope = (typeof DOOR_SCOPES)[number];
export type InteriorDoorScope = DoorScope;

export const WINDOW_TYPES = [
  'normal',
  'awning',
  'double_hung',
  'french',
] as const;
export const INTERIOR_WINDOW_TYPES = WINDOW_TYPES;
export type WindowType = (typeof WINDOW_TYPES)[number];
export type InteriorWindowType = WindowType;

export const WINDOW_SCOPES = [
  'window_and_frame',
  'window_only',
  'frame_only',
] as const;
export const INTERIOR_WINDOW_SCOPES = WINDOW_SCOPES;
export type WindowScope = (typeof WINDOW_SCOPES)[number];
export type InteriorWindowScope = WindowScope;

export const INTERIOR_DOOR_TYPE_LABELS: Record<InteriorDoorType, string> = {
  standard: 'Standard',
  flush: 'Flush',
  panelled: 'Panelled',
  french: 'French',
  sliding: 'Sliding',
  bi_fold: 'Bi-fold',
};

export const INTERIOR_DOOR_SCOPE_LABELS: Record<InteriorDoorScope, string> = {
  door_and_frame: 'Door & Frame',
  door_only: 'Door only',
  frame_only: 'Frame only',
};

export const INTERIOR_WINDOW_TYPE_LABELS: Record<InteriorWindowType, string> = {
  normal: 'Normal',
  awning: 'Awning',
  double_hung: 'Double Hung',
  french: 'French',
};

export const INTERIOR_WINDOW_SCOPE_LABELS: Record<InteriorWindowScope, string> =
  {
    window_and_frame: 'Window & Frame',
    window_only: 'Window only',
    frame_only: 'Frame only',
  };
