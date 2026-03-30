import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceAssistant } from '@/components/dashboard/WorkspaceAssistant';

const { runWorkspaceAssistantMock } = vi.hoisted(() => ({
  runWorkspaceAssistantMock: vi.fn(),
}));

vi.mock('@/app/actions/workspace-assistant', () => ({
  runWorkspaceAssistant: runWorkspaceAssistantMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

describe('WorkspaceAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runWorkspaceAssistantMock.mockResolvedValue({
      data: null,
      error: 'Assistant unavailable',
    });
  });

  it('submits a single unified prompt and renders answer results', async () => {
    const user = userEvent.setup();

    runWorkspaceAssistantMock.mockResolvedValueOnce({
      data: {
        intent: 'answer',
        summary: 'Found the latest invoice for Shara.',
        answer: "Shara's invoice INV-0012 is due on 2026-04-10.",
        warnings: [],
        matches: [
          {
            type: 'invoice',
            id: 'invoice-1',
            title: 'INV-0012',
            subtitle: 'Shara Studio',
            description: 'Final invoice',
            href: '/invoices/invoice-1',
            badge: 'Sent',
            amount_cents: 230000,
            date_label: 'Due 2026-04-10',
            reason: 'Latest invoice for Shara Studio',
          },
        ],
        customer: null,
        quote: null,
        invoice: null,
      },
      error: null,
    });

    render(
      <WorkspaceAssistant
        customers={[
          {
            id: 'customer-1',
            name: 'Shara Adams',
            company_name: 'Shara Studio',
            email: 'shara@example.com',
            phone: '0412 555 012',
            address: '128 Beach Street, Manly, NSW 2095',
          },
        ]}
        quotes={[
          {
            id: 'quote-1',
            customer_id: 'customer-1',
            quote_number: 'QUO-0007',
            title: 'Studio repaint',
            total_cents: 79695,
            status: 'draft',
            valid_until: '2026-04-10',
          },
        ]}
      />
    );

    await user.type(
      screen.getByLabelText(/Dashboard AI prompt/i),
      "When is Shara's invoice due date?"
    );
    await user.click(screen.getByRole('button', { name: /Run Prompt/i }));

    await waitFor(() =>
      expect(runWorkspaceAssistantMock).toHaveBeenCalledWith({
        prompt: "When is Shara's invoice due date?",
      })
    );

    expect(
      screen.getByText("Shara's invoice INV-0012 is due on 2026-04-10.")
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /INV-0012/i })).toHaveAttribute(
      'href',
      '/invoices/invoice-1'
    );
  });

  it('runs the prompt when Enter is pressed without Shift', async () => {
    const user = userEvent.setup();

    render(<WorkspaceAssistant customers={[]} quotes={[]} />);

    const promptInput = screen.getByLabelText(/Dashboard AI prompt/i);
    await user.type(promptInput, "When is Shara's invoice due date?");
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(runWorkspaceAssistantMock).toHaveBeenCalledWith({
        prompt: "When is Shara's invoice due date?",
      })
    );
  });

  it('renders the matching draft form for create intents', async () => {
    const user = userEvent.setup();

    runWorkspaceAssistantMock.mockResolvedValueOnce({
      data: {
        intent: 'create_quote',
        summary: 'Prepared a quote draft for Mark.',
        answer: null,
        warnings: ['Customer match was inferred from Mark Johnson.'],
        matches: [
          {
            type: 'customer',
            id: 'customer-1',
            title: 'Mark Johnson',
            subtitle: 'mark@example.com',
            description: '12 Harbour Street, Bondi, NSW 2026',
            href: '/customers/customer-1',
            badge: 'Customer',
            amount_cents: null,
            date_label: null,
            reason: 'Matched the existing customer Mark Johnson.',
          },
        ],
        customer: null,
        quote: {
          customer_id: 'customer-1',
          title: 'Living room and ceiling repaint',
          status: 'draft',
          valid_until: '2026-04-10',
          tier: 'better',
          labour_margin_percent: 10,
          material_margin_percent: 5,
          notes: 'Client wants a weekday start.',
          internal_notes: '',
          rooms: [
            {
              name: 'Living Room',
              room_type: 'interior',
              length_m: 5,
              width_m: 4,
              height_m: 2.7,
              surfaces: [
                {
                  surface_type: 'walls',
                  coating_type: 'repaint_2coat',
                  area_m2: 30,
                  rate_per_m2_cents: 1800,
                  notes: null,
                },
              ],
            },
          ],
        },
        invoice: null,
      },
      error: null,
    });

    render(
      <WorkspaceAssistant
        customers={[
          {
            id: 'customer-1',
            name: 'Mark Johnson',
            company_name: null,
            email: 'mark@example.com',
            phone: '0412 555 012',
            address: '12 Harbour Street, Bondi, NSW 2026',
          },
        ]}
        quotes={[]}
      />
    );

    await user.click(
      screen.getByRole('button', { name: /Create a better quote for Mark's living room/i })
    );
    await user.click(screen.getByRole('button', { name: /Run Prompt/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Review Quote Draft' })
      ).toBeInTheDocument()
    );

    // Form renders with AI-drafted title pre-filled (advanced mode due to pre-filled rooms)
    await waitFor(() =>
      expect(screen.getByLabelText('Title')).toHaveValue('Living room and ceiling repaint')
    );
    expect(screen.getByText('Customer match was inferred from Mark Johnson.')).toBeInTheDocument();
  });
});
