'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/branding/BrandLogo';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Boxes,
  Receipt,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import type { SubscriptionSnapshot } from '@/lib/subscription/access';
import { formatPlanName } from '@/lib/subscription/access';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/materials-service', label: 'Material / Service', icon: Boxes },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(href: string, pathname: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 flex-1" aria-label="Main navigation">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-pm-teal text-white'
                : 'text-pm-secondary hover:bg-pm-teal-light hover:text-pm-teal'
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton() {
  return (
    <form action={signOut} className="mt-2">
      <button
        type="submit"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-pm-secondary hover:bg-pm-teal-light hover:text-pm-teal transition-colors w-full"
        aria-label="Logout"
      >
        <LogOut className="h-4 w-4 flex-shrink-0" />
        Logout
      </button>
    </form>
  );
}

export default function DashboardSidebar({
  businessName,
  subscription,
}: {
  businessName: string;
  subscription: SubscriptionSnapshot;
}) {
  const pathname = usePathname();
  const planLabel = formatPlanName(subscription.plan);
  const planTone =
    subscription.plan === 'pro'
      ? 'bg-pm-teal text-white'
      : 'bg-pm-surface text-pm-body ring-1 ring-pm-border';

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-pm-border p-5 min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div className="mb-2">
          <BrandLogo width={132} height={30} priority />
        </div>
        <p className="text-xs text-pm-secondary mb-6 mt-1 truncate" title={businessName}>
          {businessName}
        </p>
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-pm-border bg-pm-surface px-3 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pm-secondary">
              Current Plan
            </p>
            <p className="mt-1 text-sm font-semibold text-pm-body">{planLabel}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${planTone}`}>
            {planLabel}
          </span>
        </div>
        <NavLinks pathname={pathname} />
        <LogoutButton />
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-white border-b border-pm-border px-4 h-14">
        <div className="min-w-0">
          <BrandLogo width={104} height={24} priority />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-xs text-pm-secondary truncate max-w-[120px]">{businessName}</p>
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${planTone}`}>
            {planLabel}
          </span>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-pm-border flex"
        aria-label="Bottom navigation"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-pm-teal' : 'text-pm-secondary'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`h-5 w-5 ${active ? 'text-pm-teal' : 'text-pm-secondary'}`}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
