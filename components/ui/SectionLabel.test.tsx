import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionLabel } from '@/components/ui/SectionLabel';

describe('SectionLabel', () => {
  it('uses the canonical section-label typography and semantic tone', () => {
    render(<SectionLabel>Schedule</SectionLabel>);

    expect(screen.getByText('Schedule')).toHaveClass(
      'text-[11px]',
      'font-bold',
      'uppercase',
      'tracking-[0.14em]',
      'text-on-surface-variant'
    );
  });

  it('supports inline labels and layout or tone overrides', () => {
    render(
      <SectionLabel as="span" className="text-warning mb-2">
        Cost breakdown
      </SectionLabel>
    );

    const label = screen.getByText('Cost breakdown');
    expect(label.tagName).toBe('SPAN');
    expect(label).toHaveClass('mb-2', 'text-warning');
    expect(label).not.toHaveClass('text-on-surface-variant');
  });
});
