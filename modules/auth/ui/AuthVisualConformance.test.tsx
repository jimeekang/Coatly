import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignupPage from '@/app/(auth)/signup/page';
import ForgotPasswordPageClient from '@/modules/auth/ui/ForgotPasswordPageClient';
import LoginPageClient from '@/modules/auth/ui/LoginPageClient';
import ResetPasswordPageClient from '@/modules/auth/ui/ResetPasswordPageClient';

const { getSession, replace, refresh, unsubscribe } = vi.hoisted(() => ({
  getSession: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock('@/modules/auth/application/actions', () => ({
  getGoogleOAuthUrl: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe } },
      })),
      updateUser: vi.fn(),
    },
  }),
}));

describe('auth visual conformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
  });

  it('uses user-value login copy and an accessible password visibility control', async () => {
    const user = userEvent.setup();
    render(<LoginPageClient />);

    expect(
      screen.getByText(
        'Open your workspace to keep quotes, invoices, scheduling, and customer follow-up moving.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/warm Coatly tone/i)).not.toBeInTheDocument();

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveClass('h-12', 'rounded-xl', 'text-base');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );
    expect(screen.getByRole('link', { name: 'Sign up free' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Hide password' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders login server failures through the shared error alert style', () => {
    render(<LoginPageClient initialError="Sign in is unavailable." />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sign in is unavailable.'
    );
    expect(screen.getByRole('alert')).toHaveClass(
      'rounded-xl',
      'border-error/20',
      'bg-error-container'
    );
  });

  it('provides independent password controls on signup', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const password = screen.getByLabelText('Password');
    const confirmation = screen.getByLabelText('Confirm password');

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-2'
    );

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: 'Show confirm password' })
    );
    expect(confirmation).toHaveAttribute('type', 'text');
  });

  it('renders password recovery inside the shared auth shell', () => {
    render(<ForgotPasswordPageClient />);

    expect(
      screen.getByRole('heading', { name: 'Reset your password.' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'The calm admin layer for busy painting teams.',
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveClass(
      'h-12',
      'rounded-xl',
      'text-base'
    );
  });

  it('renders the ready reset state in AuthShell with two password controls', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPageClient />);

    expect(
      await screen.findByRole('heading', { name: 'Choose a new password.' })
    ).toBeInTheDocument();

    const password = screen.getByLabelText('New password');
    const confirmation = screen.getByLabelText('Confirm new password');

    await user.click(screen.getByRole('button', { name: 'Show new password' }));
    await user.click(
      screen.getByRole('button', { name: 'Show confirm new password' })
    );

    expect(password).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveAttribute('type', 'text');
  });
});
