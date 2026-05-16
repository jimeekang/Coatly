import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return {
      emails: {
        send: sendMock,
      },
    };
  }),
}));

import { sendInvoiceEmail, sendQuoteEmail } from '@/lib/email/resend';

const quoteEmailParams = {
  to: 'customer@example.com',
  customerName: 'Customer',
  businessName: 'Coatly Painting',
  quoteNumber: 'QUO-0001',
  quoteTitle: 'Apartment repaint',
  totalFormatted: '$1,200.00',
  validUntil: null,
  approvalUrl: 'https://app.coatly.com.au/q/token',
};

const invoiceEmailParams = {
  to: 'billing@example.com',
  customerName: 'Customer',
  businessName: 'Coatly Painting',
  invoiceNumber: 'INV-0001',
  invoiceType: 'full',
  totalFormatted: '$1,200.00',
  dueDate: null,
  notes: null,
  pdfUrl: 'https://app.coatly.com.au/api/pdf/invoice?token=test-token',
};

describe('sendQuoteEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_ADDRESS;
    delete process.env.RESEND_TEST_RECIPIENT;
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('returns a setup error when the verified sender address is missing', async () => {
    process.env.RESEND_API_KEY = 're_test_key';

    const result = await sendQuoteEmail(quoteEmailParams);

    expect(result.error).toContain('RESEND_FROM_ADDRESS is not set');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends from the configured verified sender address', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_ADDRESS = 'Coatly <quotes@example.com>';

    const result = await sendQuoteEmail(quoteEmailParams);

    expect(result).toEqual({ error: null });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Coatly <quotes@example.com>',
        to: 'customer@example.com',
      })
    );
  });

  it('routes Resend sandbox quote emails to the configured test recipient', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_ADDRESS = 'Coatly <onboarding@resend.dev>';
    process.env.RESEND_TEST_RECIPIENT = 'verified@example.com';

    const result = await sendQuoteEmail(quoteEmailParams);

    expect(result).toEqual({ error: null });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Coatly <onboarding@resend.dev>',
        to: 'verified@example.com',
        subject: expect.stringContaining('[Test delivery for customer@example.com]'),
        html: expect.stringContaining('Original recipient: customer@example.com'),
      })
    );
  });

  it('routes Resend sandbox invoice emails to the configured test recipient', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_ADDRESS = 'Coatly <onboarding@resend.dev>';
    process.env.RESEND_TEST_RECIPIENT = 'verified@example.com';

    const result = await sendInvoiceEmail(invoiceEmailParams);

    expect(result).toEqual({ error: null });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Coatly <onboarding@resend.dev>',
        to: 'verified@example.com',
        subject: expect.stringContaining('[Test delivery for billing@example.com]'),
        html: expect.stringContaining('Original recipient: billing@example.com'),
      })
    );
  });

  it('requires a test recipient when using the Resend sandbox sender', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_ADDRESS = 'Coatly <onboarding@resend.dev>';

    const result = await sendQuoteEmail(quoteEmailParams);

    expect(result.error).toContain('RESEND_TEST_RECIPIENT is required');
    expect(sendMock).not.toHaveBeenCalled();
  });
});
