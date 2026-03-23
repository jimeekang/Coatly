export const APP_NAME = 'Coatly';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
export const APP_DESCRIPTION =
  'Job management for Australian painters — quote, invoice, and manage customers faster.';

/** Australian GST rate */
export const GST_RATE = 0.1;

/** Default paint coverage in m² per litre (Dulux Wash & Wear) */
export const DEFAULT_COVERAGE_PER_LITRE = 12;

/** Standard door dimensions in metres for area deduction */
export const STANDARD_DOOR_AREA_M2 = 1.8; // 0.9m × 2.0m

/** Standard window dimensions in metres for area deduction */
export const STANDARD_WINDOW_AREA_M2 = 1.2; // 1.2m × 1.0m

/** Quote validity in days */
export const QUOTE_VALID_DAYS = 30;

/** Invoice payment terms in days */
export const INVOICE_PAYMENT_TERMS_DAYS = 14;
