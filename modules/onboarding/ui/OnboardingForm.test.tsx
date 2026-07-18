import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingForm from './OnboardingForm';

const { useAbnLookupMock } = vi.hoisted(() => ({
  useAbnLookupMock: vi.fn(),
}));

vi.mock('@/hooks/useAbnLookup', () => ({
  useAbnLookup: useAbnLookupMock,
}));

vi.mock('@/components/forms/GoogleAddressAutocomplete', () => ({
  GoogleAddressAutocomplete: ({
    id,
    value,
    onChange,
    className,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    className?: string;
  }) => (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    />
  ),
}));

const EMPTY_DEFAULTS = {
  businessName: '',
  abn: '',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  postcode: '',
};

describe('OnboardingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAbnLookupMock.mockReturnValue({
      status: 'idle',
      data: null,
      error: null,
    });
  });

  it('submits with only business name and a valid 11-digit ABN', async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn().mockResolvedValue(undefined);
    render(
      <OnboardingForm
        defaultValues={EMPTY_DEFAULTS}
        completeOnboarding={completeOnboarding}
      />
    );

    await user.type(screen.getByLabelText(/Business Name/), 'Alex Painting');
    await user.type(screen.getByLabelText(/ABN/), '12345678901');
    await user.click(screen.getByRole('button', { name: 'Save & continue' }));

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledWith({
        businessName: 'Alex Painting',
        abn: '12345678901',
        phone: '',
        addressLine1: '',
        city: '',
        state: '',
        postcode: '',
        createExampleData: false,
      });
    });
  });

  it('validates an optional postcode only when it is supplied', async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn().mockResolvedValue(undefined);
    render(
      <OnboardingForm
        defaultValues={EMPTY_DEFAULTS}
        completeOnboarding={completeOnboarding}
      />
    );

    await user.type(screen.getByLabelText(/Business Name/), 'Alex Painting');
    await user.type(screen.getByLabelText(/ABN/), '12345678901');
    await user.click(screen.getByText('Optional business details'));
    await user.type(screen.getByLabelText('Postcode'), '123');
    await user.click(screen.getByRole('button', { name: 'Save & continue' }));

    expect(
      await screen.findByText('Postcode must be 4 digits')
    ).toBeInTheDocument();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it('keeps canonical input sizing and focus treatment', () => {
    render(
      <OnboardingForm
        defaultValues={EMPTY_DEFAULTS}
        completeOnboarding={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Business Name/)).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'focus:border-primary',
      'focus:ring-primary/20'
    );
  });

  it('preserves the optional sample-data selection', async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn().mockResolvedValue(undefined);
    render(
      <OnboardingForm
        defaultValues={EMPTY_DEFAULTS}
        completeOnboarding={completeOnboarding}
      />
    );

    await user.type(screen.getByLabelText(/Business Name/), 'Alex Painting');
    await user.type(screen.getByLabelText(/ABN/), '12345678901');
    const sampleDataCheckbox = screen.getByRole('checkbox');
    const sampleDataLabel = sampleDataCheckbox.closest('label');

    expect(sampleDataLabel).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-within:ring-2'
    );
    expect(sampleDataLabel?.parentElement).toHaveClass('rounded-2xl');

    await user.click(sampleDataCheckbox);
    await user.click(screen.getByRole('button', { name: 'Save & continue' }));

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({ createExampleData: true })
      );
    });
  });

  it('keeps ABN business and address autofill behavior', async () => {
    useAbnLookupMock.mockReturnValue({
      status: 'success',
      error: null,
      data: {
        abn: '12345678901',
        businessName: 'ABR Painting Pty Ltd',
        entityStatus: 'Active',
        addressLine1: '12 Paint Street',
        addressLine2: '',
        suburb: 'Manly',
        state: 'NSW',
        postcode: '2095',
        formattedAddress: '12 Paint Street, Manly NSW 2095',
      },
    });

    render(
      <OnboardingForm
        defaultValues={{ ...EMPTY_DEFAULTS, abn: '12345678901' }}
        completeOnboarding={vi.fn()}
      />
    );

    expect(await screen.findByLabelText(/Business Name/)).toHaveValue(
      'ABR Painting Pty Ltd'
    );
    expect(screen.getByLabelText('Postcode')).toHaveValue('2095');
  });

  it('shows server failures through the canonical error alert', async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi
      .fn()
      .mockResolvedValue({ error: 'Business profile could not be saved.' });
    render(
      <OnboardingForm
        defaultValues={EMPTY_DEFAULTS}
        completeOnboarding={completeOnboarding}
      />
    );

    await user.type(screen.getByLabelText(/Business Name/), 'Alex Painting');
    await user.type(screen.getByLabelText(/ABN/), '12345678901');
    await user.click(screen.getByRole('button', { name: 'Save & continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Business profile could not be saved.'
    );
  });
});
