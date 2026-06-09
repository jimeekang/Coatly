import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PublicQuoteClient } from '@/modules/quotes/ui/public/PublicQuoteClient';
import type { PublicQuoteDetail } from '@/modules/quotes/domain/quotes';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

function buildQuote(
  overrides: Partial<PublicQuoteDetail> = {}
): PublicQuoteDetail {
  return {
    approved_at: '2026-04-02T10:00:00.000Z',
    approved_by_name: 'Sarah Johnson',
    approved_by_email: 'sarah@example.com',
    approval_signature: 'Sarah Johnson',
    quote_number: 'QUO-0004',
    title: 'Cafe repaint',
    status: 'approved',
    valid_until: '2026-04-30',
    notes: null,
    subtotal_cents: 120000,
    gst_cents: 11000,
    total_cents: 126000,
    discount_cents: 10000,
    manual_adjustment_cents: 5000,
    deposit_percent: 10,
    working_days: 3,
    job_type: 'maintenance',
    customer: {
      id: 'customer-1',
      name: 'Sarah Johnson',
      company_name: 'Harbor Cafe',
      email: 'sarah@example.com',
      phone: null,
      address: '128 Beach Street, Manly, NSW 2095',
    },
    rooms: [],
    estimate_items: [],
    scope_sections: [
      {
        id: 'scope-1',
        quote_id: 'quote-1',
        section_kind: 'maintenance',
        title: 'Water damage repaint',
        description: 'Stain block and repaint the visible ceiling damage.',
        area_label: 'Bedroom ceiling',
        surface_category: 'ceiling',
        is_optional: false,
        is_selected: true,
        pricing_status: 'to_confirm',
        measurement_status: 'photo_hint',
        source: 'manual',
        sort_order: 0,
        metadata: {},
        maintenance_job_pack: 'water_damage_repaint',
        visible_defects: ['water_stain'],
        priority: 'soon',
        report_context: true,
        unsupported_scope: null,
        created_at: '2026-04-02T10:00:00.000Z',
        updated_at: '2026-04-02T10:00:00.000Z',
        steps: [
          {
            id: 'step-1',
            section_id: 'scope-1',
            step_type: 'prep',
            label: 'Prepare stain',
            description: 'Apply stain blocker before repainting.',
            prep_type: 'stain_blocking',
            paint_system: null,
            coats_min: 1,
            coats_max: 1,
            product_name: null,
            colour_status: 'to_confirm',
            colour: null,
            sheen: null,
            requires_confirmation: true,
            is_customer_visible: true,
            metadata: {},
            sort_order: 0,
            created_at: '2026-04-02T10:00:00.000Z',
            updated_at: '2026-04-02T10:00:00.000Z',
          },
        ],
      },
    ],
    clause_items: [
      {
        id: 'clause-1',
        quote_id: 'quote-1',
        section_id: 'scope-1',
        clause_key: 'source_repair_excluded',
        category: 'exclusion',
        title: 'Source repair excluded',
        body: 'Leak repair is excluded from this painting quote.',
        severity: 'warning',
        source: 'default_library',
        is_customer_visible: true,
        metadata: {},
        sort_order: 0,
        created_at: '2026-04-02T10:00:00.000Z',
        updated_at: '2026-04-02T10:00:00.000Z',
      },
    ],
    line_items: [
      {
        id: 'line-1',
        name: 'Selected trim upgrade',
        category: 'service',
        unit: 'job',
        quantity: 1,
        unit_price_cents: 20000,
        total_cents: 20000,
        notes: null,
        is_optional: true,
        is_selected: true,
      },
      {
        id: 'line-2',
        name: 'Unselected garage door',
        category: 'service',
        unit: 'job',
        quantity: 1,
        unit_price_cents: 30000,
        total_cents: 30000,
        notes: null,
        is_optional: true,
        is_selected: false,
      },
    ],
    ...overrides,
  };
}

describe('PublicQuoteClient', () => {
  it('shows canonical public totals with discount, adjustment, and selected add-ons', () => {
    render(
      <PublicQuoteClient
        token="11111111-1111-1111-1111-111111111111"
        quote={buildQuote()}
        business={null}
      />
    );

    expect(screen.getAllByText('$1,200.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-$100.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$110.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+$50.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,260.00').length).toBeGreaterThan(0);
  });

  it('shows maintenance scope, report summary, clauses, and optional add-ons', () => {
    render(
      <PublicQuoteClient
        token="11111111-1111-1111-1111-111111111111"
        quote={buildQuote()}
        business={null}
      />
    );

    expect(screen.getByText('Maintenance Summary')).toBeInTheDocument();
    expect(screen.getAllByText('Water damage repaint').length).toBeGreaterThan(
      0
    );
    expect(
      screen.getByText('Apply stain blocker before repainting.')
    ).toBeInTheDocument();
    expect(screen.getByText('Source repair excluded')).toBeInTheDocument();
    expect(
      screen.getByText('Leak repair is excluded from this painting quote.')
    ).toBeInTheDocument();
    expect(screen.getByText('Unselected garage door')).toBeInTheDocument();
  });

  it('opens the public quote PDF in a separate downloadable tab', () => {
    render(
      <PublicQuoteClient
        token="11111111-1111-1111-1111-111111111111"
        quote={buildQuote()}
        business={null}
      />
    );

    const pdfLink = screen.getByRole('link', { name: 'PDF' });

    expect(pdfLink).toHaveAttribute(
      'href',
      '/api/pdf/quote?token=11111111-1111-1111-1111-111111111111'
    );
    expect(pdfLink).toHaveAttribute('target', '_blank');
    expect(pdfLink).toHaveAttribute('rel', 'noreferrer');
    expect(pdfLink).toHaveAttribute('download', 'quote-QUO-0004.pdf');
  });
});
