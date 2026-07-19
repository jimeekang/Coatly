import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LineItemPicker } from '@/modules/quotes/ui/LineItemPicker';
import type { MaterialItem } from '@/modules/materials/domain/types';
import type { QuoteLineItemFormInput } from '@/modules/quotes/domain/quote-schema';

const LIBRARY_ITEM: MaterialItem = {
  id: 'material-1',
  user_id: 'user-1',
  name: 'Interior primer',
  category: 'primer',
  unit: 'L',
  unit_price_cents: 2500,
  notes: null,
  is_active: true,
  sort_order: 0,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

function PickerHarness({
  onAdd,
}: {
  onAdd: (item: QuoteLineItemFormInput) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open item picker
      </button>
      {open && (
        <LineItemPicker
          libraryItems={[LIBRARY_ITEM]}
          onAdd={onAdd}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe('LineItemPicker', () => {
  it('uses a named modal, restores focus, and preserves item selection', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<PickerHarness onAdd={onAdd} />);

    const trigger = screen.getByRole('button', { name: 'Open item picker' });
    await user.click(trigger);

    expect(
      screen.getByRole('dialog', { name: 'Add quote item' })
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const pickerDialog = screen.getByRole('dialog', { name: 'Add quote item' });
    const backdrop = pickerDialog.previousElementSibling;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: /Interior primer/i }));

    expect(
      screen.getByRole('dialog', { name: 'Configure Interior primer' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add to Quote' }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        material_item_id: 'material-1',
        name: 'Interior primer',
        quantity: 1,
      })
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
