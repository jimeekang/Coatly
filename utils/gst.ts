import { GST_RATE } from '@/config/constants';

/**
 * Add GST to an ex-GST amount.
 * @param amountCents - Amount in cents (ex-GST)
 * @returns Total amount in cents (inc-GST)
 */
export function addGST(amountCents: number): number {
  return Math.round(amountCents * (1 + GST_RATE));
}

/**
 * Remove GST from a GST-inclusive amount.
 * @param amountCents - Amount in cents (inc-GST)
 * @returns Ex-GST amount in cents
 */
export function removeGST(amountCents: number): number {
  return Math.round(amountCents / (1 + GST_RATE));
}

/**
 * Get the GST component from a GST-inclusive amount.
 * @param amountCents - Amount in cents (inc-GST)
 * @returns GST amount in cents
 */
export function getGSTAmount(amountCents: number): number {
  return amountCents - removeGST(amountCents);
}

/**
 * Get the GST component from an ex-GST amount.
 * @param amountCents - Amount in cents (ex-GST)
 * @returns GST amount in cents
 */
export function getGSTFromExAmount(amountCents: number): number {
  return Math.round(amountCents * GST_RATE);
}
