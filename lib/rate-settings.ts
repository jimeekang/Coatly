import {
  PAINT_RATES,
} from '@/config/paint-rates';
import { z } from 'zod';

// ─── Surface / coating types ──────────────────────────────────────────────────

export const SURFACE_TYPES = ['walls', 'ceiling', 'trim', 'doors', 'windows'] as const;
/** Surfaces priced per m² in the rate table */
export const SQM_SURFACE_TYPES = ['walls', 'ceiling', 'trim'] as const;
export const COATING_TYPES = ['touch_up_2coat', 'repaint_2coat', 'new_plaster_3coat'] as const;

export type RatePresetSurfaceType = (typeof SURFACE_TYPES)[number];
export type SqmSurfaceType = (typeof SQM_SURFACE_TYPES)[number];
export type RatePresetCoatingType = (typeof COATING_TYPES)[number];

// ─── Per-unit door / window types ────────────────────────────────────────────

export const TRIM_PAINT_SYSTEMS = ['oil_2coat', 'water_3coat_white_finish'] as const;
export type TrimPaintSystem = (typeof TRIM_PAINT_SYSTEMS)[number];

/** Door types (mirrors INTERIOR_DOOR_TYPES in interior-estimates.ts) */
export const RATE_DOOR_TYPES = ['standard', 'flush', 'panelled', 'french', 'sliding', 'bi_fold'] as const;
export type RateDoorType = (typeof RATE_DOOR_TYPES)[number];

export const DOOR_SCOPES = ['door_and_frame', 'door_only', 'frame_only'] as const;
export type DoorScope = (typeof DOOR_SCOPES)[number];

export const WINDOW_TYPES = ['normal', 'awning', 'double_hung', 'french'] as const;
export type WindowType = (typeof WINDOW_TYPES)[number];

export const WINDOW_SCOPES = ['window_and_frame', 'window_only', 'frame_only'] as const;
export type WindowScope = (typeof WINDOW_SCOPES)[number];

export type DoorUnitRates = {
  [PS in TrimPaintSystem]: {
    [DT in RateDoorType]: {
      [S in DoorScope]: number; // AUD cents per door
    };
  };
};

export type WindowUnitRates = {
  [PS in TrimPaintSystem]: {
    [T in WindowType]: {
      [S in WindowScope]: number; // AUD cents per window
    };
  };
};

// ─── Labels ───────────────────────────────────────────────────────────────────

export const TRIM_PAINT_SYSTEM_LABELS: Record<TrimPaintSystem, string> = {
  oil_2coat: 'Oil Base',
  water_3coat_white_finish: 'Water Base',
};

export const RATE_DOOR_TYPE_LABELS: Record<RateDoorType, string> = {
  standard: 'Standard',
  flush: 'Flush',
  panelled: 'Panelled',
  french: 'French',
  sliding: 'Sliding',
  bi_fold: 'Bi-fold',
};

export const DOOR_SCOPE_LABELS: Record<DoorScope, string> = {
  door_and_frame: 'Door & Frame',
  door_only: 'Door Only',
  frame_only: 'Frame Only',
};

export const WINDOW_TYPE_LABELS: Record<WindowType, string> = {
  normal: 'Normal',
  awning: 'Awning',
  double_hung: 'Double Hung',
  french: 'French',
};

export const WINDOW_SCOPE_LABELS: Record<WindowScope, string> = {
  window_and_frame: 'Window & Frame',
  window_only: 'Window Only',
  frame_only: 'Frame Only',
};

// ─── Defaults (Sydney Northern Beaches anchor pricing) ────────────────────────

/**
 * Default door rates by paint system × door type × scope.
 * Derived from anchor prices × door-type multipliers (standard=1.0, flush=0.96,
 * panelled=1.08, french=1.28, sliding=1.12, bi_fold=1.22).
 */
export const DEFAULT_DOOR_UNIT_RATES: DoorUnitRates = {
  oil_2coat: {
    standard: { door_and_frame: 22000, door_only: 16000, frame_only:  6000 },
    flush:    { door_and_frame: 21100, door_only: 15400, frame_only:  5800 },
    panelled: { door_and_frame: 23800, door_only: 17300, frame_only:  6500 },
    french:   { door_and_frame: 28200, door_only: 20500, frame_only:  7700 },
    sliding:  { door_and_frame: 24600, door_only: 17900, frame_only:  6700 },
    bi_fold:  { door_and_frame: 26800, door_only: 19500, frame_only:  7300 },
  },
  water_3coat_white_finish: {
    standard: { door_and_frame: 29500, door_only: 21000, frame_only:  8500 },
    flush:    { door_and_frame: 28300, door_only: 20200, frame_only:  8200 },
    panelled: { door_and_frame: 31900, door_only: 22700, frame_only:  9200 },
    french:   { door_and_frame: 37800, door_only: 26900, frame_only: 10900 },
    sliding:  { door_and_frame: 33000, door_only: 23500, frame_only:  9500 },
    bi_fold:  { door_and_frame: 36000, door_only: 25600, frame_only: 10400 },
  },
};

export const DEFAULT_WINDOW_UNIT_RATES: WindowUnitRates = {
  oil_2coat: {
    normal:      { window_and_frame: 20000, window_only: 15000, frame_only: 11000 },
    awning:      { window_and_frame: 23500, window_only: 18000, frame_only: 13500 },
    double_hung: { window_and_frame: 30000, window_only: 23000, frame_only: 17500 },
    french:      { window_and_frame: 40000, window_only: 31000, frame_only: 24000 },
  },
  water_3coat_white_finish: {
    normal:      { window_and_frame: 27500, window_only: 20000, frame_only: 13500 },
    awning:      { window_and_frame: 31000, window_only: 23000, frame_only: 16000 },
    double_hung: { window_and_frame: 37500, window_only: 28000, frame_only: 20000 },
    french:      { window_and_frame: 47500, window_only: 36000, frame_only: 26500 },
  },
};

// ─── UserRateSettings ─────────────────────────────────────────────────────────

/**
 * User-defined rate overrides stored in businesses.default_rates (JSONB).
 *
 * - walls/ceiling/trim: per-m² rates for area surfaces
 * - doors/windows: per-m² legacy rates (kept for old quote surface system)
 * - door_unit_rates: per-door rates by paint system × door type × scope
 * - window_unit_rates: per-window rates by paint system × window type × scope
 * - enabled_door_types: which door types the painter offers
 * - enabled_door_scopes: which door scopes the painter offers
 * - enabled_window_types: which window types the painter offers
 */
export type UserRateSettings = {
  [S in RatePresetSurfaceType]: {
    [C in RatePresetCoatingType]: number; // AUD cents per m²
  };
} & {
  door_unit_rates: DoorUnitRates;
  window_unit_rates: WindowUnitRates;
  enabled_door_types: RateDoorType[];
  enabled_door_scopes: DoorScope[];
  enabled_window_types: WindowType[];
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ratePresetSurfaceSchema = z.object({
  touch_up_2coat: z.number().int().min(0),
  repaint_2coat: z.number().int().min(0),
  new_plaster_3coat: z.number().int().min(0),
});

const partialRatePresetSurfaceSchema = ratePresetSurfaceSchema.partial();

// Door scopes schema (reusable)
const doorScopeRatesSchema = z.object({
  door_and_frame: z.number().int().min(0),
  door_only: z.number().int().min(0),
  frame_only: z.number().int().min(0),
});

// Door type → scope rates (one paint system)
const doorTypeRatesSchema = z.object({
  standard: doorScopeRatesSchema,
  flush: doorScopeRatesSchema,
  panelled: doorScopeRatesSchema,
  french: doorScopeRatesSchema,
  sliding: doorScopeRatesSchema,
  bi_fold: doorScopeRatesSchema,
});

const doorUnitRatesSchema = z.object({
  oil_2coat: doorTypeRatesSchema,
  water_3coat_white_finish: doorTypeRatesSchema,
});

const windowScopeRatesSchema = z.object({
  window_and_frame: z.number().int().min(0),
  window_only: z.number().int().min(0),
  frame_only: z.number().int().min(0),
});

const windowTypeRatesSchema = z.object({
  normal: windowScopeRatesSchema,
  awning: windowScopeRatesSchema,
  double_hung: windowScopeRatesSchema,
  french: windowScopeRatesSchema,
});

const windowUnitRatesSchema = z.object({
  oil_2coat: windowTypeRatesSchema,
  water_3coat_white_finish: windowTypeRatesSchema,
});

export const ratePresetSchema = z.object({
  walls: ratePresetSurfaceSchema,
  ceiling: ratePresetSurfaceSchema,
  trim: ratePresetSurfaceSchema,
  doors: ratePresetSurfaceSchema,
  windows: ratePresetSurfaceSchema,
  door_unit_rates: doorUnitRatesSchema.optional(),
  window_unit_rates: windowUnitRatesSchema.optional(),
  enabled_door_types: z.array(z.enum(RATE_DOOR_TYPES)).optional(),
  enabled_door_scopes: z.array(z.enum(DOOR_SCOPES)).optional(),
  enabled_window_types: z.array(z.enum(WINDOW_TYPES)).optional(),
});

const partialRatePresetSchema = z
  .object({
    walls: partialRatePresetSurfaceSchema,
    ceiling: partialRatePresetSurfaceSchema,
    trim: partialRatePresetSurfaceSchema,
    doors: partialRatePresetSurfaceSchema,
    windows: partialRatePresetSurfaceSchema,
    door_unit_rates: doorUnitRatesSchema.optional(),
    window_unit_rates: windowUnitRatesSchema.optional(),
    enabled_door_types: z.array(z.enum(RATE_DOOR_TYPES)).optional(),
    enabled_door_scopes: z.array(z.enum(DOOR_SCOPES)).optional(),
    enabled_window_types: z.array(z.enum(WINDOW_TYPES)).optional(),
  })
  .partial();

export type RatePresetInput = z.input<typeof ratePresetSchema>;
export type RatePreset = z.output<typeof ratePresetSchema>;

// ─── Labels ───────────────────────────────────────────────────────────────────

export const COATING_LABELS: Record<RatePresetCoatingType, string> = {
  touch_up_2coat: '1 Coat Touch-up',
  repaint_2coat: '2 Coat Repaint',
  new_plaster_3coat: '3 Coat New Plaster',
};

export const SQM_SURFACE_TYPE_LABELS: Record<SqmSurfaceType, string> = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim / Skirting',
};

// ─── Build defaults ───────────────────────────────────────────────────────────

export function buildDefaultRateSettings(): UserRateSettings {
  const settings = {} as UserRateSettings;
  for (const surface of SURFACE_TYPES) {
    settings[surface] = {} as UserRateSettings[RatePresetSurfaceType];
    for (const coating of COATING_TYPES) {
      settings[surface][coating] = PAINT_RATES[surface][coating].ratePerSqm;
    }
  }
  settings.door_unit_rates = DEFAULT_DOOR_UNIT_RATES;
  settings.window_unit_rates = DEFAULT_WINDOW_UNIT_RATES;
  settings.enabled_door_types = [...RATE_DOOR_TYPES];
  settings.enabled_door_scopes = [...DOOR_SCOPES];
  settings.enabled_window_types = [...WINDOW_TYPES];
  return settings;
}

export const DEFAULT_RATE_SETTINGS: UserRateSettings = buildDefaultRateSettings();

// ─── Parse ────────────────────────────────────────────────────────────────────

/** Parse and validate rate settings from DB JSON. Falls back to defaults for missing entries. */
export function parseUserRateSettings(json: unknown): UserRateSettings {
  const result = buildDefaultRateSettings();
  const parsed = partialRatePresetSchema.safeParse(json);
  if (!parsed.success) return result;

  // Per-m² surface rates
  for (const surface of SURFACE_TYPES) {
    const surfaceData = parsed.data[surface];
    if (!surfaceData) continue;
    for (const coating of COATING_TYPES) {
      const rate = surfaceData[coating];
      if (rate != null) result[surface][coating] = rate;
    }
  }

  // Per-unit door rates
  if (parsed.data.door_unit_rates) {
    const dur = parsed.data.door_unit_rates;
    for (const ps of TRIM_PAINT_SYSTEMS) {
      for (const dt of RATE_DOOR_TYPES) {
        for (const scope of DOOR_SCOPES) {
          const rate = dur[ps]?.[dt]?.[scope];
          if (rate != null) result.door_unit_rates[ps][dt][scope] = rate;
        }
      }
    }
  }

  // Per-unit window rates
  if (parsed.data.window_unit_rates) {
    const wur = parsed.data.window_unit_rates;
    for (const ps of TRIM_PAINT_SYSTEMS) {
      for (const type of WINDOW_TYPES) {
        for (const scope of WINDOW_SCOPES) {
          const rate = wur[ps]?.[type]?.[scope];
          if (rate != null) result.window_unit_rates[ps][type][scope] = rate;
        }
      }
    }
  }

  if (parsed.data.enabled_door_types) {
    result.enabled_door_types = parsed.data.enabled_door_types as RateDoorType[];
  }
  if (parsed.data.enabled_door_scopes) {
    result.enabled_door_scopes = parsed.data.enabled_door_scopes as DoorScope[];
  }
  if (parsed.data.enabled_window_types) {
    result.enabled_window_types = parsed.data.enabled_window_types as WindowType[];
  }

  return result;
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getRatePerM2Cents(
  settings: UserRateSettings,
  surface: RatePresetSurfaceType,
  coating: RatePresetCoatingType
): number {
  return settings[surface]?.[coating] ?? DEFAULT_RATE_SETTINGS[surface][coating];
}
