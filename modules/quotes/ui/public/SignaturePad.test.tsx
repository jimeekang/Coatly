import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignaturePad } from './SignaturePad';

describe('SignaturePad', () => {
  it('keeps both signature modes keyboard-visible and touch-sized', () => {
    render(<SignaturePad value={null} onChange={vi.fn()} />);

    for (const name of ['Draw', 'Upload']) {
      expect(screen.getByRole('button', { name })).toHaveClass(
        'min-h-11',
        'rounded-xl',
        'focus-visible:ring-2'
      );
    }
  });
});
