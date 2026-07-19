import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMaterialItemMock,
  createServerClientMock,
  getBusinessRateSettingsMock,
  getMaterialItemsMock,
  importMaterialItemsMock,
  priceRatesFormMock,
  updateRateSettingsActionMock,
} = vi.hoisted(() => ({
  createMaterialItemMock: vi.fn(),
  createServerClientMock: vi.fn(),
  getBusinessRateSettingsMock: vi.fn(),
  getMaterialItemsMock: vi.fn(),
  importMaterialItemsMock: vi.fn(),
  priceRatesFormMock: vi.fn(() => <div data-testid="price-rates-form" />),
  updateRateSettingsActionMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/modules/settings/infrastructure/businesses', () => ({
  getBusinessRateSettings: getBusinessRateSettingsMock,
}));

vi.mock('@/modules/materials/application/actions', () => ({
  createMaterialItem: createMaterialItemMock,
  getMaterialItems: getMaterialItemsMock,
  importMaterialItems: importMaterialItemsMock,
}));

vi.mock('@/modules/settings/application/settings-actions', () => ({
  updateRateSettingsAction: updateRateSettingsActionMock,
}));

vi.mock('@/modules/price-rates/ui/PriceRatesForm', () => ({
  PriceRatesForm: priceRatesFormMock,
}));

import PriceRatesPage from './page';

describe('PriceRatesPage load failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    });
    getBusinessRateSettingsMock.mockResolvedValue({
      data: null,
      error: 'Rate settings are temporarily unavailable.',
    });
    getMaterialItemsMock.mockResolvedValue({ data: [], error: null });
  });

  it('surfaces the load error without rendering an editable form', async () => {
    render(await PriceRatesPage());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Rate settings are temporarily unavailable.'
    );
    expect(screen.queryByTestId('price-rates-form')).not.toBeInTheDocument();
    expect(priceRatesFormMock).not.toHaveBeenCalled();
  });
});
