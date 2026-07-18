import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/modal';

function ConfirmDialogHarness({
  onCancel = vi.fn(),
}: {
  onCancel?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open confirmation
      </button>
      <ConfirmDialog
        open={open}
        title="Delete quote?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => setOpen(false)}
        onCancel={() => {
          onCancel();
          setOpen(false);
        }}
      />
    </>
  );
}

function ModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open editor
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit customer"
        description="Update the customer details."
        footer={<button type="button">Save customer</button>}
      >
        <label htmlFor="customer-name">Customer name</label>
        <input id="customer-name" />
      </Modal>
    </>
  );
}

describe('dialog accessibility primitives', () => {
  it('gives ConfirmDialog an accessible name, description, and warm surface', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open confirmation' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete quote?' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    expect(dialog).toHaveClass(
      'bg-surface-container-lowest',
      'border-outline-variant'
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('traps ConfirmDialog focus and restores it after Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialogHarness onCancel={onCancel} />);

    const trigger = screen.getByRole('button', { name: 'Open confirmation' });
    await user.click(trigger);

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Delete' });

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();

    await user.tab();
    expect(cancel).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps Modal focus and restores it after Escape', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const trigger = screen.getByRole('button', { name: 'Open editor' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Edit customer' });
    const close = screen.getByRole('button', { name: 'Close' });
    const save = screen.getByRole('button', { name: 'Save customer' });

    expect(dialog).toHaveAccessibleDescription('Update the customer details.');
    expect(dialog).toHaveClass(
      'bg-surface-container-lowest',
      'border-outline-variant'
    );
    expect(close).toHaveClass('h-11', 'w-11', 'focus-visible:ring-2');
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(save).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });
});
