import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  profileUpdateMock,
  redirectMock,
  saveBusinessProfileForUserMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  profileUpdateMock: vi.fn(),
  redirectMock: vi.fn(),
  saveBusinessProfileForUserMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));
vi.mock('@/modules/settings/infrastructure/businesses', () => ({
  saveBusinessProfileForUser: saveBusinessProfileForUserMock,
}));

import { completeOnboarding } from './profile-actions';

const MINIMUM_INPUT = {
  businessName: 'Alex Painting',
  abn: '12 345 678 901',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  postcode: '',
  createExampleData: false,
};

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const ownerFilterMock = vi.fn().mockResolvedValue({ error: null });
    profileUpdateMock.mockReturnValue({ eq: ownerFilterMock });
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'user-1', email: 'alex@example.com' },
          },
        }),
      },
      from: vi.fn().mockReturnValue({ update: profileUpdateMock }),
    });
    saveBusinessProfileForUserMock.mockResolvedValue({ error: null });
  });

  it('accepts the minimum required profile and stores optional values as null', async () => {
    await completeOnboarding(MINIMUM_INPUT);

    expect(profileUpdateMock).toHaveBeenCalledWith({
      business_name: 'Alex Painting',
      abn: '12345678901',
      phone: null,
      address_line1: null,
      city: null,
      state: null,
      postcode: null,
      onboarding_completed: true,
    });
  });

  it('passes empty optional values through the existing business infrastructure', async () => {
    await completeOnboarding(MINIMUM_INPUT);

    expect(saveBusinessProfileForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          addressLine1: '',
          city: '',
          state: '',
          postcode: '',
          phone: '',
        }),
      })
    );
  });

  it('validates postcode only when supplied', async () => {
    const result = await completeOnboarding({
      ...MINIMUM_INPUT,
      postcode: '123',
    });

    expect(result).toEqual({ error: 'Postcode must be 4 digits' });
  });

  it('validates state only when supplied', async () => {
    const result = await completeOnboarding({
      ...MINIMUM_INPUT,
      state: 'California',
    });

    expect(result).toEqual({ error: 'Select a valid Australian state' });
  });

  it('keeps business name and ABN required', async () => {
    const missingName = await completeOnboarding({
      ...MINIMUM_INPUT,
      businessName: ' ',
    });
    const invalidAbn = await completeOnboarding({
      ...MINIMUM_INPUT,
      abn: '123',
    });

    expect([missingName, invalidAbn]).toEqual([
      { error: 'Business name is required' },
      { error: 'ABN must be 11 digits' },
    ]);
  });

  it('preserves redirect to the dashboard after successful setup', async () => {
    await completeOnboarding(MINIMUM_INPUT);

    expect(redirectMock).toHaveBeenCalledWith('/dashboard');
  });
});
