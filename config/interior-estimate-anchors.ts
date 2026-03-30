export const INTERIOR_SCOPE_SHARE = {
  ceiling_only: 0.25,
  walls_only: 0.55,
  trim_only: 0.2,
  walls_ceiling: 0.8,
  walls_trim: 0.75,
  ceiling_trim: 0.45,
  full_repaint: 1,
} as const;

export const INTERIOR_ESTIMATE_ANCHORS = {
  apartment: {
    entire_property: {
      by_sqm_curve: [
        { sqm: 35, median: 2200 },
        { sqm: 45, median: 2800 },
        { sqm: 55, median: 3100 },
        { sqm: 65, median: 3450 },
        { sqm: 80, median: 3800 },
        { sqm: 85, median: 4350 },
        { sqm: 90, median: 4300 },
        { sqm: 105, median: 4850 },
        { sqm: 120, median: 5800 },
        { sqm: 140, median: 6900 },
        { sqm: 160, median: 7900 },
        { sqm: 200, median: 9500 },
      ],
      by_apt_type: {
        studio: { min: 2200, max: 3500, median: 2700 },
        '1_bedroom': { min: 2800, max: 4200, median: 3300 },
        '2_bedroom_standard': { min: 4300, max: 6200, median: 5000 },
        '2_bedroom_large': { min: 5000, max: 7500, median: 6000 },
        '3_bedroom': { min: 6500, max: 9500, median: 7500 },
      },
      scope_area_share: INTERIOR_SCOPE_SHARE,
    },
    specific_areas: {
      rooms: {
        'Master Bedroom': { min: 1350, max: 1700, median: 1500 },
        'Bedroom 1': { min: 980, max: 1280, median: 1130 },
        'Bedroom 2': { min: 980, max: 1280, median: 1130 },
        'Bedroom 3': { min: 980, max: 1280, median: 1130 },
        Bathroom: { min: 1400, max: 2000, median: 1700 },
        'Living Room': { min: 2200, max: 3200, median: 2650 },
        Lounge: { min: 2200, max: 3200, median: 2650 },
        Dining: { min: 1700, max: 2400, median: 2000 },
        Kitchen: { min: 1900, max: 2700, median: 2250 },
        'Study / Office': { min: 1500, max: 2100, median: 1800 },
        Laundry: { min: 1100, max: 1600, median: 1350 },
        Hallway: { min: 900, max: 1400, median: 1150 },
        Foyer: { min: 850, max: 1300, median: 1050 },
        Stairwell: { min: 1800, max: 2800, median: 2250 },
        'Walk-in Robe': { min: 800, max: 1200, median: 1000 },
        Other: { min: 1200, max: 1800, median: 1500 },
      },
      trim_items: {
        doors: {
          oil_2coat: {
            'Door & Frame': 220,
            'Door only': 160,
            'Frame only': 60,
          },
          water_3coat_white_finish: {
            'Door & Frame': 295,
            'Door only': 210,
            'Frame only': 85,
          },
        },
        windows: {
          oil_2coat: {
            Normal: { 'Window & Frame': 200, 'Window only': 150, 'Frame only': 110 },
            Awning: { 'Window & Frame': 235, 'Window only': 180, 'Frame only': 135 },
            'Double Hung': { 'Window & Frame': 300, 'Window only': 230, 'Frame only': 175 },
            French: { 'Window & Frame': 400, 'Window only': 310, 'Frame only': 240 },
          },
          water_3coat_white_finish: {
            Normal: { 'Window & Frame': 275, 'Window only': 200, 'Frame only': 135 },
            Awning: { 'Window & Frame': 310, 'Window only': 230, 'Frame only': 160 },
            'Double Hung': { 'Window & Frame': 375, 'Window only': 280, 'Frame only': 200 },
            French: { 'Window & Frame': 475, 'Window only': 360, 'Frame only': 265 },
          },
        },
        skirting_per_linear_metre: {
          oil_2coat: { min: 7, max: 10 },
          water_3coat_white_finish: { min: 8, max: 11 },
        },
        qty_scale_factor: {
          '1-3 items': 1,
          '4-7 items': 0.92,
          '8-12 items': 0.85,
          '13+ items': 0.8,
        },
      },
    },
  },
  house: {
    entire_property: {
      by_config: {
        '2_bed_1_bath': { min: 7500, max: 11000, median: 9000 },
        '3_bed_2_bath': { min: 9500, max: 14000, median: 11500 },
        '4_bed_2_bath': { min: 13000, max: 18500, median: 15500 },
        '5_bed_3_bath': { min: 17000, max: 25000, median: 20000 },
      },
      scope_area_share: INTERIOR_SCOPE_SHARE,
    },
    specific_areas: {
      rooms: {
        'Master Bedroom': { min: 1350, max: 1700, median: 1500 },
        'Bedroom 1': { min: 980, max: 1280, median: 1130 },
        'Bedroom 2': { min: 980, max: 1280, median: 1130 },
        'Bedroom 3': { min: 980, max: 1280, median: 1130 },
        Bathroom: { min: 1400, max: 2000, median: 1700 },
        'Living Room': { min: 2200, max: 3200, median: 2650 },
        Lounge: { min: 2200, max: 3200, median: 2650 },
        Dining: { min: 1700, max: 2400, median: 2000 },
        Kitchen: { min: 1900, max: 2700, median: 2250 },
        'Study / Office': { min: 1500, max: 2100, median: 1800 },
        Laundry: { min: 1100, max: 1600, median: 1350 },
        Hallway: { min: 900, max: 1400, median: 1150 },
        Foyer: { min: 850, max: 1300, median: 1050 },
        Stairwell: { min: 1800, max: 2800, median: 2250 },
        'Walk-in Robe': { min: 800, max: 1200, median: 1000 },
        Other: { min: 1200, max: 1800, median: 1500 },
      },
    },
  },
  modifiers: {
    condition: {
      apartment: {
        excellent: { min_mult: 0.95, max_mult: 1.05 },
        fair: { min_mult: 1.08, max_mult: 1.22 },
        poor: { min_mult: 1.22, max_mult: 1.55 },
      },
      house: {
        excellent: { min_mult: 1, max_mult: 1.08 },
        fair: { min_mult: 1.1, max_mult: 1.24 },
        poor: { min_mult: 1.22, max_mult: 1.4 },
      },
    },
    storeys: {
      '1_storey': 1,
      '2_storey': 1.18,
      '3_storey': 1.35,
    },
    double_storey_3b2b_uplift: {
      base_min_pct: 0.03,
      base_max_pct: 0.05,
      auto_stairwell_add_pct: 0.01,
      high_ceiling_reduction_pct: 0.02,
    },
  },
  price_caps: {
    max_total_price: 35000,
  },
} as const;

export type InteriorEstimateAnchorData = typeof INTERIOR_ESTIMATE_ANCHORS;
