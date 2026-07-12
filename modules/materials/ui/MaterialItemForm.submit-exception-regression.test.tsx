import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MaterialItemForm } from '@/modules/materials/ui/MaterialItemForm';

describe('MaterialItemForm submit exception handling', () => {
  it('shows a rejected save error and exits the saving state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save service unavailable.'));

    render(<MaterialItemForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Item Name'), 'Ceiling Paint');
    const saveButton = screen.getByRole('button', { name: 'Save Item' });
    await user.click(saveButton);

    expect(await screen.findByText('Save service unavailable.')).toBeVisible();
    await waitFor(() => expect(saveButton).toBeEnabled());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('preserves returned save errors and exits the saving state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ error: 'Duplicate item.' });

    render(<MaterialItemForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Item Name'), 'Ceiling Paint');
    const saveButton = screen.getByRole('button', { name: 'Save Item' });
    await user.click(saveButton);

    expect(await screen.findByText('Duplicate item.')).toBeVisible();
    await waitFor(() => expect(saveButton).toBeEnabled());
  });
});
