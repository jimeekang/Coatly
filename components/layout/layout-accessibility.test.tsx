import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BackButton } from '@/components/layout/BackButton';
import { BackLink } from '@/components/layout/BackLink';
import {
  PageHeader,
  PrimaryActionLink,
  SecondaryActionLink,
} from '@/components/layout/PageHeader';

describe('layout accessibility primitives', () => {
  it('keeps BackButton keyboard-visible and at least 44px square', () => {
    render(<BackButton href="/dashboard" label="Back to dashboard" />);

    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveClass(
      'h-11',
      'w-11',
      'focus-visible:ring-2'
    );
  });

  it('keeps BackLink keyboard-visible and at least 44px tall', () => {
    render(<BackLink href="/quotes" label="All quotes" />);

    expect(screen.getByRole('link', { name: 'All quotes' })).toHaveClass(
      'min-h-11',
      'focus-visible:ring-2'
    );
  });

  it('keeps PageHeader links keyboard-visible with semantic surfaces', () => {
    render(
      <PageHeader
        title="Quotes"
        backHref="/dashboard"
        backLabel="Back to dashboard"
        action={
          <>
            <PrimaryActionLink href="/quotes/new">New quote</PrimaryActionLink>
            <SecondaryActionLink href="/quotes/templates">
              Templates
            </SecondaryActionLink>
          </>
        }
      />
    );

    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveClass(
      'min-h-11',
      'focus-visible:ring-2'
    );
    expect(screen.getByRole('link', { name: 'New quote' })).toHaveClass(
      'min-h-11',
      'focus-visible:ring-2'
    );
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveClass(
      'min-h-11',
      'bg-surface-container',
      'focus-visible:ring-2'
    );
  });
});
