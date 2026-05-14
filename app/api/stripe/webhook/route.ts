import type { NextRequest } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe/webhook-handler';

export async function POST(request: NextRequest) {
  return handleStripeWebhook(request);
}
