export const PAINTING_ADJACENT_MAINTENANCE_PACK_IDS = [
  'wall_patch_repaint',
  'water_damage_repaint',
  'end_of_lease_touch_up',
  'pre_sale_refresh',
  'exterior_maintenance_repaint',
  'deck_stain_maintenance',
  'mould_treatment_repaint',
  'strata_common_area_touch_up',
] as const;

export type MaintenanceJobPackId =
  (typeof PAINTING_ADJACENT_MAINTENANCE_PACK_IDS)[number];

export type MaintenancePricingMethodHint =
  | 'quick'
  | 'advanced'
  | 'exterior'
  | 'manual';

export type MaintenanceJobPack = {
  id: MaintenanceJobPackId;
  label: string;
  description: string;
  allowed_surfaces: string[];
  common_prep_steps: string[];
  risk_clause_keys: string[];
  likely_pricing_methods: MaintenancePricingMethodHint[];
  visible_defect_tags: string[];
  required_confirmation_questions: string[];
};

export const MAINTENANCE_JOB_PACKS: MaintenanceJobPack[] = [
  {
    id: 'wall_patch_repaint',
    label: 'Wall patch + repaint',
    description: 'Minor wall patching followed by repainting affected areas.',
    allowed_surfaces: ['walls', 'cornice', 'skirting', 'trim'],
    common_prep_steps: ['minor_patching', 'light_sanding', 'gap_filling'],
    risk_clause_keys: ['touch_up_colour_match_limit'],
    likely_pricing_methods: ['quick', 'advanced', 'manual'],
    visible_defect_tags: ['holes', 'chips', 'cracks', 'scuffs'],
    required_confirmation_questions: [
      'Confirm patch size and whether matching paint is available.',
    ],
  },
  {
    id: 'water_damage_repaint',
    label: 'Water damage repaint',
    description:
      'Stain blocking and repainting visible water-damaged paint surfaces after the source is resolved.',
    allowed_surfaces: ['walls', 'ceiling', 'cornice', 'trim'],
    common_prep_steps: ['stain_blocking', 'cover_stain_primer', 'light_sanding'],
    risk_clause_keys: ['source_repair_excluded', 'water_damage_best_effort'],
    likely_pricing_methods: ['advanced', 'manual'],
    visible_defect_tags: ['water_stain', 'blistering', 'flaking_paint'],
    required_confirmation_questions: [
      'Confirm the water source has been repaired before repainting.',
    ],
  },
  {
    id: 'end_of_lease_touch_up',
    label: 'End-of-lease touch-up',
    description: 'Fast cosmetic repaint/touch-up before tenant handover.',
    allowed_surfaces: ['walls', 'doors', 'door_frames', 'skirting', 'trim'],
    common_prep_steps: ['light_sanding', 'minor_patching', 'gap_filling'],
    risk_clause_keys: ['touch_up_colour_match_limit'],
    likely_pricing_methods: ['quick', 'manual'],
    visible_defect_tags: ['scuffs', 'chips', 'minor_holes', 'marks'],
    required_confirmation_questions: [
      'Confirm access window and whether exact paint colour is known.',
    ],
  },
  {
    id: 'pre_sale_refresh',
    label: 'Pre-sale refresh',
    description: 'Cosmetic repaint to improve presentation before listing.',
    allowed_surfaces: ['walls', 'ceiling', 'doors', 'door_frames', 'trim'],
    common_prep_steps: ['light_sanding', 'minor_patching', 'dusting'],
    risk_clause_keys: ['touch_up_colour_match_limit', 'before_after_photo_note'],
    likely_pricing_methods: ['quick', 'advanced'],
    visible_defect_tags: ['scuffs', 'faded_paint', 'marks'],
    required_confirmation_questions: [
      'Confirm whether the quote should prioritise presentation over full restoration.',
    ],
  },
  {
    id: 'exterior_maintenance_repaint',
    label: 'Exterior maintenance repaint',
    description: 'Maintenance repaint for weathered exterior painted surfaces.',
    allowed_surfaces: [
      'rendered_walls',
      'eaves_soffits',
      'fascia_barge_boards',
      'gutters',
      'downpipes',
      'cladding_boards',
      'timber',
      'front_door',
    ],
    common_prep_steps: ['pressure_cleaning_note', 'light_sanding', 'gap_filling'],
    risk_clause_keys: ['efflorescence', 'difficult_access'],
    likely_pricing_methods: ['exterior', 'manual'],
    visible_defect_tags: ['weathering', 'peeling_paint', 'chalky_surface'],
    required_confirmation_questions: [
      'Confirm access requirements and whether any unsafe areas are excluded.',
    ],
  },
  {
    id: 'deck_stain_maintenance',
    label: 'Deck/stain maintenance',
    description: 'Deck or timber coating maintenance with prep and recoating scope.',
    allowed_surfaces: ['decking', 'timber', 'handrail'],
    common_prep_steps: ['light_sanding', 'dusting', 'masking_protection'],
    risk_clause_keys: ['difficult_access'],
    likely_pricing_methods: ['exterior', 'manual'],
    visible_defect_tags: ['faded_stain', 'weathered_timber', 'peeling_coating'],
    required_confirmation_questions: [
      'Confirm whether timber repair or board replacement is excluded.',
    ],
  },
  {
    id: 'mould_treatment_repaint',
    label: 'Mould treatment + repaint',
    description:
      'Visible mould treatment preparation followed by repainting with appropriate coating notes.',
    allowed_surfaces: ['walls', 'ceiling', 'bathroom_wet_area'],
    common_prep_steps: ['bathroom_primer', 'stain_blocking', 'light_sanding'],
    risk_clause_keys: ['mould_recurrence_risk', 'source_repair_excluded'],
    likely_pricing_methods: ['advanced', 'manual'],
    visible_defect_tags: ['mould_stain', 'wet_area', 'ventilation_issue'],
    required_confirmation_questions: [
      'Confirm ventilation or moisture source has been addressed.',
    ],
  },
  {
    id: 'strata_common_area_touch_up',
    label: 'Strata/common area touch-up',
    description: 'Small repeated touch-up work for shared areas.',
    allowed_surfaces: ['walls', 'doors', 'door_frames', 'skirting', 'handrail'],
    common_prep_steps: ['light_sanding', 'minor_patching', 'dusting'],
    risk_clause_keys: [
      'strata_common_area_access',
      'before_after_photo_note',
      'touch_up_colour_match_limit',
    ],
    likely_pricing_methods: ['quick', 'manual'],
    visible_defect_tags: ['scuffs', 'chips', 'traffic_marks'],
    required_confirmation_questions: [
      'Confirm access hours and whether strata approval is required.',
    ],
  },
];

export const UNSUPPORTED_MAINTENANCE_SCOPE_KEYWORDS = [
  'plumbing',
  'electrical',
  'hvac',
  'structural',
  'roofing',
  'pest',
  'asbestos',
  'waterproofing',
] as const;

export function isMaintenanceJobPackId(
  value: string | null | undefined
): value is MaintenanceJobPackId {
  return PAINTING_ADJACENT_MAINTENANCE_PACK_IDS.includes(
    value as MaintenanceJobPackId
  );
}
