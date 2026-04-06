import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMaterialItemMock,
  updateMaterialItemMock,
  deleteMaterialItemMock,
  importMaterialItemsMock,
} = vi.hoisted(() => ({
  createMaterialItemMock: vi.fn(),
  updateMaterialItemMock: vi.fn(),
  deleteMaterialItemMock: vi.fn(),
  importMaterialItemsMock: vi.fn(),
}));

vi.mock('@/app/actions/materials', () => ({
  createMaterialItem: createMaterialItemMock,
  updateMaterialItem: updateMaterialItemMock,
  deleteMaterialItem: deleteMaterialItemMock,
  importMaterialItems: importMaterialItemsMock,
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

const FILTER_ITEMS = [
  CREATED_ITEM,
  {
    id: 'db-item-2',
    user_id: 'user-1',
    name: 'Zinsser Primer',
    category: 'primer' as const,
    unit: '10L',
    unit_price_cents: 7900,
    notes: 'Bonding primer',
    is_active: true,
    sort_order: 1,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'db-item-3',
    user_id: 'user-1',
    name: 'Ceiling repaint',
    category: 'service' as const,
    unit: 'item',
    unit_price_cents: 22500,
    notes: 'Two-coat ceiling repaint service',
    is_active: true,
    sort_order: 2,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  },
];

describe('MaterialItemList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMaterialItemMock.mockResolvedValue({ data: CREATED_ITEM });
    updateMaterialItemMock.mockResolvedValue({});
    deleteMaterialItemMock.mockResolvedValue({});
    importMaterialItemsMock.mockResolvedValue({ data: [] });
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

  it('combines brand and litres into saved paint items', async () => {
    const user = userEvent.setup();

    render(<MaterialItemList initialItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Add First Item' }));
    await user.selectOptions(screen.getByLabelText('Category'), 'paint');
    await user.type(screen.getByLabelText('Brand (optional)'), 'Dulux');
    await user.type(screen.getByLabelText('Item Name'), 'Wash & Wear');
    await user.type(screen.getByLabelText(/Size \(L\)/i), '10');
    await user.clear(screen.getByLabelText('Price (AUD)'));
    await user.type(screen.getByLabelText('Price (AUD)'), '89.50');
    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    await waitFor(() =>
      expect(createMaterialItemMock).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'paint',
          name: 'Dulux Wash & Wear',
          unit: '10L',
          unit_price_cents: 8950,
          notes: undefined,
        })
      )
    );
  });

  it('requires a service title and saves optional notes for service items', async () => {
    const user = userEvent.setup();

    render(<MaterialItemList initialItems={[]} />);

    await user.click(screen.getByRole('button', { name: 'Add First Item' }));
    await user.selectOptions(screen.getByLabelText('Category'), 'service');

    expect(screen.getByLabelText('Service Title')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Brand \(optional\)/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Service Title'), 'Ceiling repaint');
    await user.type(screen.getByLabelText('Notes (optional)'), 'Two-coat ceiling repaint service');
    await user.clear(screen.getByLabelText('Price (AUD)'));
    await user.type(screen.getByLabelText('Price (AUD)'), '225');
    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    await waitFor(() =>
      expect(createMaterialItemMock).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'service',
          name: 'Ceiling repaint',
          notes: 'Two-coat ceiling repaint service',
          unit: 'item',
          unit_price_cents: 22500,
        })
      )
    );
  });

  it('filters items by category button and search query', async () => {
    const user = userEvent.setup();

    render(<MaterialItemList initialItems={FILTER_ITEMS} />);

    expect(screen.getByText('Showing 3 of 3 items')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Service - 1' }));

    expect(screen.getByText('Showing 1 of 3 items')).toBeInTheDocument();
    expect(screen.getByText('Ceiling repaint')).toBeInTheDocument();
    expect(screen.queryByText('Zinsser Primer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All - 3' }));
    await user.type(screen.getByLabelText('Search items'), 'primer');

    expect(screen.getByText('Showing 1 of 3 items')).toBeInTheDocument();
    expect(screen.getByText('Zinsser Primer')).toBeInTheDocument();
    expect(screen.queryByText('Ceiling repaint')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search items'));
    await user.type(screen.getByLabelText('Search items'), 'no-match');

    expect(screen.getByText('No matching items')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));

    expect(screen.getByText('Showing 3 of 3 items')).toBeInTheDocument();
    expect(screen.getByText('Ceiling Paint')).toBeInTheDocument();
    expect(screen.getByText('Zinsser Primer')).toBeInTheDocument();
    expect(screen.getByText('Ceiling repaint')).toBeInTheDocument();
  });
});
