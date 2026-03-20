export type SurfaceType = 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows' | 'exterior';
export type CoatingType = 'touch_up_2coat' | 'repaint_2coat' | 'new_plaster_3coat';

export interface PaintRate {
  /** Rate in AUD cents per m² */
  ratePerSqm: number;
  /** Coverage in m² per litre */
  coveragePerLitre: number;
}

/**
 * Default paint rates for Australian painters (AUD per m²).
 * Painters can override these in their settings.
 */
export const PAINT_RATES: Record<SurfaceType, Record<CoatingType, PaintRate>> = {
  walls: {
    touch_up_2coat: { ratePerSqm: 1200, coveragePerLitre: 12 },   // $12/m²
    repaint_2coat: { ratePerSqm: 1800, coveragePerLitre: 12 },     // $18/m²
    new_plaster_3coat: { ratePerSqm: 2800, coveragePerLitre: 10 }, // $28/m²
  },
  ceiling: {
    touch_up_2coat: { ratePerSqm: 1400, coveragePerLitre: 12 },   // $14/m²
    repaint_2coat: { ratePerSqm: 2000, coveragePerLitre: 12 },     // $20/m²
    new_plaster_3coat: { ratePerSqm: 3000, coveragePerLitre: 10 }, // $30/m²
  },
  trim: {
    touch_up_2coat: { ratePerSqm: 2500, coveragePerLitre: 14 },   // $25/m²
    repaint_2coat: { ratePerSqm: 3500, coveragePerLitre: 14 },     // $35/m²
    new_plaster_3coat: { ratePerSqm: 5000, coveragePerLitre: 12 }, // $50/m²
  },
  doors: {
    touch_up_2coat: { ratePerSqm: 3000, coveragePerLitre: 14 },   // $30/m² (~$60/door)
    repaint_2coat: { ratePerSqm: 4500, coveragePerLitre: 14 },     // $45/m² (~$90/door)
    new_plaster_3coat: { ratePerSqm: 6000, coveragePerLitre: 12 }, // $60/m²
  },
  windows: {
    touch_up_2coat: { ratePerSqm: 3500, coveragePerLitre: 14 },   // $35/m²
    repaint_2coat: { ratePerSqm: 5000, coveragePerLitre: 14 },     // $50/m²
    new_plaster_3coat: { ratePerSqm: 7000, coveragePerLitre: 12 }, // $70/m²
  },
  exterior: {
    touch_up_2coat: { ratePerSqm: 2000, coveragePerLitre: 10 },   // $20/m²
    repaint_2coat: { ratePerSqm: 3000, coveragePerLitre: 10 },     // $30/m²
    new_plaster_3coat: { ratePerSqm: 4500, coveragePerLitre: 8 },  // $45/m²
  },
};

export const SURFACE_TYPE_LABELS: Record<SurfaceType, string> = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim / Skirting',
  doors: 'Doors',
  windows: 'Windows',
  exterior: 'Exterior',
};

export const COATING_TYPE_LABELS: Record<CoatingType, string> = {
  touch_up_2coat: 'Touch-up (2 coat)',
  repaint_2coat: 'Full Repaint (2 coat)',
  new_plaster_3coat: 'New Plaster (3 coat)',
};
