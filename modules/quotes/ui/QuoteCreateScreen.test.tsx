import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteCreateScreen } from '@/modules/quotes/ui/QuoteCreateScreen';
import { buildDefaultRateSettings } from '@/modules/price-rates/domain/rate-settings';

const { generateAIDraftMock, quoteFormSpy } = vi.hoisted(() => ({
  generateAIDraftMock: vi.fn(),
  quoteFormSpy: vi.fn(),
}));

vi.mock('@/app/actions/ai-drafts', () => ({
  generateAIDraft: generateAIDraftMock,
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  createQuote: vi.fn(),
}));

vi.mock('@/modules/quotes/application/template-actions', () => ({
  saveQuoteTemplate: vi.fn(),
}));

vi.mock('@/components/ai/AIDraftPanel', () => ({
  AIDraftPanel: (props: {
    onGenerate: () => void;
    onApply: () => void;
    canApply: boolean;
  }) => (
    <div>
      <button type="button" onClick={props.onGenerate}>
        Generate Draft
      </button>
      <button type="button" onClick={props.onApply} disabled={!props.canApply}>
        Apply to Form
      </button>
    </div>
  ),
}));

vi.mock('@/modules/quotes/ui/TemplatePicker', () => ({
  TemplatePicker: () => <div>Template Picker</div>,
}));

vi.mock('@/components/subscription/UpgradePrompt', () => ({
  UpgradePrompt: () => <div>Upgrade Prompt</div>,
}));

vi.mock('@/modules/quotes/ui/QuoteForm', () => ({
  QuoteForm: (props: unknown) => {
    quoteFormSpy(props);
    return <div data-testid="quote-form">Quote Form</div>;
  },
}));

const CUSTOMERS = [
  {
    id: 'customer-1',
    name: 'Sarah Johnson',
    company_name: 'Harbor Cafe',
    email: 'sarah@example.com',
    emails: ['sarah@example.com'],
    phone: '0412 555 012',
    address: '128 Beach Street, Manly, NSW 2095',
    properties: [],
  },
];

describe('QuoteCreateScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateAIDraftMock.mockResolvedValue({
      data: null,
      error: 'AI unavailable',
    });
  });

  it('preselects the requested customer when opened from the customer workflow', () => {
    render(
      <QuoteCreateScreen
        customers={CUSTOMERS}
        canUseAI={false}
        initialCustomerId="customer-1"
      />
    );

    expect(screen.getByTestId('quote-form')).toBeInTheDocument();
    expect(quoteFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultValues: expect.objectContaining({
          customer_id: 'customer-1',
        }),
      })
    );
  });

  it('keeps manual quote building before the Pro AI upsell on Starter', () => {
    render(
      <QuoteCreateScreen
        customers={CUSTOMERS}
        canUseAI={false}
        initialCustomerId="customer-1"
      />
    );

    const form = screen.getByTestId('quote-form');
    const upgrade = screen.getByText('Upgrade Prompt');

    expect(
      form.compareDocumentPosition(upgrade) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('starts new quotes on Manual pricing even when saved rates prefer Quick Estimate', () => {
    const rateSettings = buildDefaultRateSettings();
    rateSettings.pricing.preferred_pricing_method = 'detailed_quick';

    render(
      <QuoteCreateScreen
        customers={CUSTOMERS}
        canUseAI={false}
        initialCustomerId="customer-1"
        rateSettings={rateSettings}
      />
    );

    expect(quoteFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultValues: expect.objectContaining({
          customer_id: 'customer-1',
          pricing_method: 'manual',
          pricing_method_inputs: expect.objectContaining({
            method: 'manual',
          }),
        }),
      })
    );
  });

  it('applies AI quote drafts as scope, clauses, and intake snapshot without priced rooms', async () => {
    const user = userEvent.setup();
    generateAIDraftMock.mockResolvedValueOnce({
      data: {
        entity: 'quote',
        summary: 'Prepared a quote draft.',
        warnings: [],
        customer: null,
        quote: {
          job_type: 'maintenance',
          maintenance_job_pack: 'water_damage_repaint',
          scope_sections: [
            {
              client_id: 'scope-1',
              section_kind: 'maintenance',
              title: 'Water stain repaint',
              description: 'Stain block and repaint the visible ceiling mark.',
              pricing_status: 'to_confirm',
              measurement_status: 'to_confirm',
              source: 'ai',
              maintenance_job_pack: 'water_damage_repaint',
              visible_defects: ['water_stain'],
              steps: [
                {
                  step_type: 'primer',
                  description: 'Apply stain-blocking primer.',
                },
              ],
            },
          ],
          pricing_candidates: [],
          clauses: [
            {
              clause_key: 'source_repair_excluded',
              category: 'exclusion',
              title: 'Source repair excluded',
              body: 'Plumbing and source repairs are excluded.',
              severity: 'warning',
              source: 'ai',
              is_customer_visible: true,
            },
          ],
          assumptions: ['Water source is already repaired.'],
          questions_for_user: [
            {
              question: 'Confirm the water source has been repaired.',
              reason: 'to_confirm',
            },
          ],
        },
        invoice: null,
      },
      error: null,
    });

    render(
      <QuoteCreateScreen
        customers={CUSTOMERS}
        canUseAI
        initialCustomerId="customer-1"
      />
    );

    await user.click(screen.getByRole('button', { name: /Generate Draft/i }));
    await waitFor(() => expect(generateAIDraftMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Apply to Form/i })).toBeEnabled()
    );
    await user.click(screen.getByRole('button', { name: /Apply to Form/i }));

    await waitFor(() =>
      expect(quoteFormSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          defaultValues: expect.objectContaining({
            customer_id: 'customer-1',
            job_type: 'maintenance',
            rooms: [],
            scope_sections: expect.arrayContaining([
              expect.objectContaining({
                title: 'Water stain repaint',
                maintenance_job_pack: 'water_damage_repaint',
              }),
            ]),
            clause_items: expect.arrayContaining([
              expect.objectContaining({
                clause_key: 'source_repair_excluded',
              }),
            ]),
            ai_intake_snapshot: expect.objectContaining({
              provider: 'alibaba-qwen',
              model: 'qwen3-vl-flash',
              prompt_version: 'v1-task6-quote-form',
            }),
          }),
        })
      )
    );
  });
});
