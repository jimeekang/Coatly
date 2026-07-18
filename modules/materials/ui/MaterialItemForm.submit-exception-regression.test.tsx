import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MaterialItemForm } from '@/modules/materials/ui/MaterialItemForm';

describe('MaterialItemForm submit exception handling', () => {
  it('uses the canonical form controls for item and service fields', async () => {
    const user = userEvent.setup();

    render(
      <MaterialItemForm
        onSubmit={vi.fn().mockResolvedValue({})}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Category')).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'border-outline-variant',
      'focus:border-primary',
      'focus:ring-primary/20'
    );
    expect(screen.getByLabelText('Item Name')).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'border-outline-variant',
      'focus:border-primary'
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(
      'h-12',
      'rounded-xl',
      'focus-visible:ring-2'
    );
    expect(screen.getByRole('button', { name: 'Save Item' })).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'focus-visible:ring-2'
    );

    await user.selectOptions(screen.getByLabelText('Category'), 'service');

    expect(screen.getByLabelText('Notes (optional)')).toHaveClass(
      'text-base',
      'rounded-xl',
      'border-outline-variant',
      'focus:border-primary',
      'focus:ring-primary/20'
    );
  });

  it('shows a rejected save error and exits the saving state', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('Save service unavailable.'));

    render(<MaterialItemForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Item Name'), 'Ceiling Paint');
    const saveButton = screen.getByRole('button', { name: 'Save Item' });
    await user.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Save service unavailable.'
    );
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
