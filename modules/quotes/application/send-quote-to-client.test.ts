import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getHydratedQuoteDetailForUserMock,
  redirectMock,
  revalidatePathMock,
  requireCurrentUserMock,
  sendQuoteDocumentEmailMock,
  updateMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getHydratedQuoteDetailForUserMock: vi.fn(),
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  sendQuoteDocumentEmailMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/modules/quotes/infrastructure/quote-repository', () => ({
  getHydratedQuoteDetailForUser: getHydratedQuoteDetailForUserMock,
}));

vi.mock('@/modules/quotes/application/document-email-service', () => ({
  sendQuoteDocumentEmail: sendQuoteDocumentEmailMock,
}));

import { sendQuoteToClient } from '@/modules/quotes/application/actions';

const DRAFT_QUOTE = {
  id: 'quote-1',
  status: 'draft',
  customer_email: 'snapshot@example.com',
  customer: { email: 'primary@example.com' },
};

describe('sendQuoteToClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userFilterMock = vi.fn().mockResolvedValue({ error: null });
    const idFilterMock = vi.fn().mockReturnValue({ eq: userFilterMock });
    updateMock.mockReturnValue({ eq: idFilterMock });
    createServerClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    });
    requireCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });
    getHydratedQuoteDetailForUserMock.mockResolvedValue({
      data: DRAFT_QUOTE,
      error: null,
    });
    sendQuoteDocumentEmailMock.mockResolvedValue({ error: null });
  });

  it('reuses the document email workflow with the quote snapshot email', async () => {
    await sendQuoteToClient('quote-1');

    expect(sendQuoteDocumentEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: 'quote-1',
        to: 'snapshot@example.com',
        userId: 'user-1',
      })
    );
  });

  it('marks a draft quote as sent after email delivery', async () => {
    await sendQuoteToClient('quote-1');

    expect(updateMock).toHaveBeenCalledWith({ status: 'sent' });
  });

  it('redirects to the existing sent-email success banner', async () => {
    await sendQuoteToClient('quote-1');

    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-1?emailSent=1');
  });

  it('resends a sent quote without rewriting its status', async () => {
    getHydratedQuoteDetailForUserMock.mockResolvedValue({
      data: { ...DRAFT_QUOTE, status: 'sent' },
      error: null,
    });

    await sendQuoteToClient('quote-1');

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('returns the existing customer-email guidance when no email exists', async () => {
    getHydratedQuoteDetailForUserMock.mockResolvedValue({
      data: {
        ...DRAFT_QUOTE,
        customer_email: null,
        customer: { email: null },
      },
      error: null,
    });

    const result = await sendQuoteToClient('quote-1');

    expect(result).toEqual({
      error: 'Add a customer email before sending this quote.',
    });
  });
});
