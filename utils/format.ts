import { format } from 'date-fns';

/**
 * Format cents to AUD currency string.
 * @param amountCents - Amount in cents
 * @returns Formatted string e.g. "$1,234.56"
 */
export function formatAUD(amountCents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

/**
 * Format a date to Australian display format (DD/MM/YYYY).
 * @param date - Date string, Date object, or null
 * @returns Formatted date string or empty string
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy');
}

/**
 * Format an Australian Business Number (ABN) with spaces.
 * ABN format: XX XXX XXX XXX
 * @param abn - Raw ABN string (digits only or already formatted)
 * @returns Formatted ABN string
 */
export function formatABN(abn: string): string {
  const digits = abn.replace(/\D/g, '');
  if (digits.length !== 11) return abn;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}

/**
 * Format m² area with 2 decimal places.
 */
export function formatArea(areaM2: number): string {
  return `${areaM2.toFixed(2)} m²`;
}

/**
 * Format litres to 1 decimal place.
 */
export function formatLitres(litres: number): string {
  return `${litres.toFixed(1)}L`;
}
