export const QUOTE_JOB_TYPES = ['interior', 'exterior', 'both', 'maintenance'] as const;

export const QUOTE_SCOPE_SECTION_KINDS = [
  'interior',
  'exterior',
  'maintenance',
  'general',
  'optional',
] as const;

export const QUOTE_SCOPE_PRICING_STATUSES = [
  'unpriced',
  'priced',
  'included',
  'excluded',
  'allowance',
  'to_confirm',
] as const;

export const QUOTE_SCOPE_MEASUREMENT_STATUSES = [
  'confirmed',
  'rough',
  'photo_hint',
  'to_confirm',
] as const;

export const QUOTE_SCOPE_SOURCES = [
  'manual',
  'ai',
  'template',
  'legacy_quote',
] as const;

export const QUOTE_SCOPE_STEP_TYPES = [
  'prep',
  'primer',
  'topcoat',
  'repair',
  'paint_system',
  'colour_note',
  'special_note',
  'exclusion_note',
] as const;

export const QUOTE_CLAUSE_CATEGORIES = [
  'inclusion',
  'exclusion',
  'risk_disclosure',
  'warranty',
  'payment',
  'validity',
  'insurance',
  'brand_proof',
] as const;

export const QUOTE_CLAUSE_SEVERITIES = ['info', 'warning', 'critical'] as const;

export const QUOTE_SCOPE_PRIORITIES = [
  'urgent',
  'soon',
  'cosmetic',
  'to_confirm',
] as const;

export const FORBIDDEN_QUOTE_FORM_PRICE_FIELDS = [
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
] as const;

export const INTERIOR_QUOTE_FORM_AREAS = [
  'bedroom',
  'master_bedroom',
  'bathroom',
  'living_room',
  'lounge',
  'dining',
  'kitchen',
  'hallway',
  'stairway',
  'laundry',
  'wardrobe',
  'walk_in_robe',
  'study',
  'foyer',
  'other',
] as const;

export const INTERIOR_QUOTE_FORM_SURFACES = [
  'walls',
  'ceiling',
  'cornice',
  'doors',
  'door_frames',
  'windows',
  'window_frames',
  'skirting',
  'trim',
  'wardrobe_inside',
  'bathroom_wet_area',
] as const;

export const EXTERIOR_QUOTE_FORM_SURFACES = [
  'rendered_walls',
  'cladding_boards',
  'eaves_soffits',
  'fascia_barge_boards',
  'gutters',
  'downpipes',
  'gable',
  'timber',
  'front_door',
  'exterior_doors_frames',
  'windows_frames',
  'retaining_walls',
  'fence',
  'handrail',
  'poles',
  'roof',
  'concrete_overhang',
  'pool_retaining_wall',
  'decking',
  'other',
] as const;

export const QUOTE_FORM_PREP_TAGS = [
  'light_sanding',
  'dusting',
  'minor_patching',
  'gap_filling',
  'stain_blocking',
  'cover_stain_primer',
  'oil_undercoat',
  'bathroom_primer',
  'pressure_cleaning_note',
  'rust_treatment_note',
  'masking_protection',
] as const;

export const QUOTE_FORM_CONDITION_TAGS = [
  'dark_existing_colour',
  'vivid_white',
  'peeling_paint',
  'water_damage',
  'wet_area',
  'mould_stain',
  'tile_edge_gap',
  'porous_render',
  'efflorescence',
  'difficult_access',
  'unsafe_access',
  'new_timber',
  'colour_to_confirm',
  'sheen_to_confirm',
] as const;

export const QUOTE_FORM_CLAUSE_LIBRARY = [
  {
    key: 'inclusions',
    category: 'inclusion',
    title: 'Inclusions',
    severity: 'info',
  },
  {
    key: 'workmanship_warranty',
    category: 'warranty',
    title: 'Workmanship warranty',
    severity: 'info',
  },
  {
    key: 'vivid_white',
    category: 'risk_disclosure',
    title: 'Vivid White coverage',
    severity: 'warning',
  },
  {
    key: 'paint_peeling',
    category: 'risk_disclosure',
    title: 'Existing paint peeling',
    severity: 'warning',
  },
  {
    key: 'water_damage_best_effort',
    category: 'risk_disclosure',
    title: 'Water damage repaint limitation',
    severity: 'warning',
  },
  {
    key: 'source_repair_excluded',
    category: 'exclusion',
    title: 'Source repair excluded',
    severity: 'warning',
  },
  {
    key: 'mould_recurrence_risk',
    category: 'risk_disclosure',
    title: 'Mould recurrence risk',
    severity: 'warning',
  },
  {
    key: 'touch_up_colour_match_limit',
    category: 'risk_disclosure',
    title: 'Touch-up colour match limitation',
    severity: 'info',
  },
  {
    key: 'tenant_owner_access_required',
    category: 'exclusion',
    title: 'Tenant or owner access required',
    severity: 'info',
  },
  {
    key: 'strata_common_area_access',
    category: 'exclusion',
    title: 'Strata common area access',
    severity: 'info',
  },
  {
    key: 'before_after_photo_note',
    category: 'inclusion',
    title: 'Before and after photos',
    severity: 'info',
  },
  {
    key: 'efflorescence',
    category: 'risk_disclosure',
    title: 'Efflorescence',
    severity: 'warning',
  },
  {
    key: 'difficult_access',
    category: 'risk_disclosure',
    title: 'Difficult access',
    severity: 'warning',
  },
  {
    key: 'payment_deposit',
    category: 'payment',
    title: 'Payment and deposit',
    severity: 'info',
  },
  {
    key: 'quote_validity',
    category: 'validity',
    title: 'Quote validity',
    severity: 'info',
  },
] as const;
