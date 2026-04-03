import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMaterialItemMock,
  updateMaterialItemMock,
  deleteMaterialItemMock,
} = vi.hoisted(() => ({
  createMaterialItemMock: vi.fn(),
  updateMaterialItemMock: vi.fn(),
  deleteMaterialItemMock: vi.fn(),
}));

vi.mock('@/app/actions/materials', () => ({
  createMaterialItem: createMaterialItemMock,
  updateMaterialItem: updateMaterialItemMock,
  deleteMaterialItem: deleteMaterialItemMock,
}));

import { MaterialItemList } from '@/components/materials/MaterialItemList';

const CREATED_ITEM = {
  id: 'db-item-1',
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

describe('MaterialItemList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMaterialItemMock.mockResolvedValue({ data: CREATED_ITEM });
    updateMaterialItemMock.mockResolvedValue({});
    deleteMaterialItemMock.mockResolvedValue({});
  });

  it('keeps the created database id for follow-up edit and delete actions', async () => {
    const user = userEvent.setup();

    render(<MaterialItemList initialItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Add First Item' }));
    await user.type(screen.getByLabelText('Item Name'), CREATED_ITEM.name);
    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    await waitFor(() =>
      expect(createMaterialItemMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: CREATED_ITEM.name })
      )
    );

    await waitFor(() =>
      expect(screen.getByLabelText(`Edit ${CREATED_ITEM.name}`)).toBeInTheDocument()
    );

    await user.click(screen.getByLabelText(`Edit ${CREATED_ITEM.name}`));
    await user.clear(screen.getByLabelText('Item Name'));
    await user.type(screen.getByLabelText('Item Name'), 'Ceiling Paint Updated');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(updateMaterialItemMock).toHaveBeenCalledWith(
        'db-item-1',
        expect.objectContaining({ name: 'Ceiling Paint Updated' })
      )
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Delete Ceiling Paint Updated')).toBeInTheDocument()
    );
    await user.click(screen.getByLabelText('Delete Ceiling Paint Updated'));

    await waitFor(() => expect(deleteMaterialItemMock).toHaveBeenCalledWith('db-item-1'));
  });
});
