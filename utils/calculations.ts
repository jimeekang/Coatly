import { DEFAULT_COVERAGE_PER_LITRE, STANDARD_DOOR_AREA_M2, STANDARD_WINDOW_AREA_M2 } from '@/config/constants';

/**
 * Calculate total wall area for a rectangular room (4 walls).
 * @param lengthM - Room length in metres
 * @param widthM - Room width in metres
 * @param heightM - Room height in metres
 * @returns Wall area in m²
 */
export function calculateWallArea(lengthM: number, widthM: number, heightM: number): number {
  return 2 * (lengthM + widthM) * heightM;
}

/**
 * Subtract standard door and window openings from a wall area.
 * @param wallAreaM2 - Total wall area in m²
 * @param doorCount - Number of standard doors
 * @param windowCount - Number of standard windows
 * @returns Net paintable area in m²
 */
export function subtractOpenings(
  wallAreaM2: number,
  doorCount: number,
  windowCount: number
): number {
  const deduction = doorCount * STANDARD_DOOR_AREA_M2 + windowCount * STANDARD_WINDOW_AREA_M2;
  return Math.max(0, wallAreaM2 - deduction);
}

/**
 * Calculate litres of paint required for a given area.
 * @param areaM2 - Area to paint in m²
 * @param coats - Number of coats
 * @param coveragePerLitre - m² covered per litre (default: 12m²/L)
 * @returns Litres required (rounded up to nearest 0.5L)
 */
export function calculatePaintLitres(
  areaM2: number,
  coats: number = 1,
  coveragePerLitre: number = DEFAULT_COVERAGE_PER_LITRE
): number {
  const rawLitres = (areaM2 * coats) / coveragePerLitre;
  // Round up to nearest 0.5L for practical purchasing
  return Math.ceil(rawLitres * 2) / 2;
}

/**
 * Calculate ceiling area from room dimensions.
 * @param lengthM - Room length in metres
 * @param widthM - Room width in metres
 * @returns Ceiling area in m²
 */
export function calculateCeilingArea(lengthM: number, widthM: number): number {
  return lengthM * widthM;
}
