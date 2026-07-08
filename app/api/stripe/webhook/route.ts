import type { NextRequest } from 'next/server';
import { handleStripeWebhook } from '@/modules/billing/application/webhook-handler';

export async function POST(request: NextRequest) {
  return handleStripeWebhook(request);
}
