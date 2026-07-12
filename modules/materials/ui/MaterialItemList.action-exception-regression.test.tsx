import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteMaterialItemMock,
  importMaterialItemsMock,
} = vi.hoisted(() => ({
  deleteMaterialItemMock: vi.fn(),
  importMaterialItemsMock: vi.fn(),
}));

vi.mock('@/modules/materials/application/actions', () => ({
  createMaterialItem: vi.fn(),
  updateMaterialItem: vi.fn(),
  deleteMaterialItem: deleteMaterialItemMock,
  importMaterialItems: importMaterialItemsMock,
}));

import { MaterialItemList } from '@/modules/materials/ui/MaterialItemList';

const ITEM = {
  id: 'item-1',
  user_id: 'user-1',
  name: 'Ceiling Paint',
  category: 'paint' as const,
  unit: 'item',
  unit_price_cents: 2500,
  notes: null,
  is_active: true,
  sort_order: 0,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

describe('MaterialItemList action exception handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteMaterialItemMock.mockResolvedValue({});
    importMaterialItemsMock.mockResolvedValue({ data: [] });
  });

  it('shows a rejected delete error and exits the deleting state', async () => {
    const user = userEvent.setup();
    let rejectDelete: (reason?: unknown) => void = () => undefined;
    deleteMaterialItemMock.mockReturnValue(
      new Promise((_, reject) => {
        rejectDelete = reject;
      })
    );

    render(<MaterialItemList initialItems={[ITEM]} />);

    const deleteButtons = screen.getAllByLabelText('Delete Ceiling Paint');
    await user.click(deleteButtons[0]);
    await waitFor(() => expect(deleteMaterialItemMock).toHaveBeenCalledWith('item-1'));
    await waitFor(() => expect(deleteButtons[0]).toBeDisabled());

    rejectDelete(new Error('Delete service unavailable.'));

    expect(await screen.findByText('Delete service unavailable.')).toBeVisible();
    await waitFor(() => expect(deleteButtons[0]).toBeEnabled());
    expect(screen.getAllByText('Ceiling Paint').length).toBeGreaterThan(0);
  });

  it('shows a rejected import error and exits the importing state', async () => {
    const user = userEvent.setup();
    let rejectImport: (reason?: unknown) => void = () => undefined;
    importMaterialItemsMock.mockReturnValue(
      new Promise((_, reject) => {
        rejectImport = reject;
      })
    );

    render(<MaterialItemList initialItems={[ITEM]} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(
      fileInput as HTMLInputElement,
      new File(
        ['category,brand,title,size_l,price_aud,notes,is_active\npaint,,Ceiling Paint,,25.00,,true'],
        'materials.csv',
        { type: 'text/csv' }
      )
    );

    await waitFor(() => expect(importMaterialItemsMock).toHaveBeenCalledTimes(1));
    const importingButton = screen.getByRole('button', { name: 'Importing...' });
    expect(importingButton).toBeDisabled();

    rejectImport(new Error('Import service unavailable.'));

    expect(await screen.findByText('Import service unavailable.')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Import CSV' })).toBeEnabled());
  });
});
