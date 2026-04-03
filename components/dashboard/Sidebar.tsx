'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  DollarSign,
} from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import type { SubscriptionSnapshot } from '@/lib/subscription/access';
import { formatPlanName } from '@/lib/subscription/access';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/materials-service', label: 'Material / Service', icon: Boxes },
  { href: '/price-rates', label: 'Price Rates', icon: DollarSign },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(href: string, pathname: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
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
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
              active
                ? 'bg-stone-200 text-stone-900 font-bold'
                : 'text-stone-600 hover:bg-stone-200/50 font-medium'
            }`}
          >
            <Icon
              className="h-4 w-4 flex-shrink-0"
              strokeWidth={active ? 2.5 : 1.75}
            />
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
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-200/50 transition-colors w-full"
        aria-label="Logout"
      >
        <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
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
  const isPro = subscription.plan === 'pro';

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 flex-col bg-stone-100 p-4 min-h-screen sticky top-0 h-screen overflow-y-auto border-r-0 z-50">
        {/* Logo */}
        <div className="mb-10 px-4">
          <h1 className="text-2xl font-bold tracking-tighter text-stone-900">Coatly</h1>
          <p className="text-xs font-medium tracking-tight text-stone-500 uppercase mt-0.5">
            Premium Painting SaaS
          </p>
        </div>

        <NavLinks pathname={pathname} />
        <LogoutButton />

        {/* User card */}
        <div className="mt-auto px-4 py-4 bg-stone-200/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-bold flex-shrink-0">
              {businessName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900 truncate">{businessName}</p>
              <p
                className={`text-[10px] uppercase tracking-widest font-semibold ${
                  isPro ? 'text-primary' : 'text-stone-500'
                }`}
              >
                {planLabel}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-surface/90 backdrop-blur-md border-b border-outline-variant px-4 h-14 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Coatly</h1>
        <div className="flex items-center gap-2">
          <p className="text-xs text-on-surface-variant truncate max-w-[120px] font-medium">
            {businessName}
          </p>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
              isPro ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {planLabel}
          </span>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-md border-t border-outline-variant flex h-20"
        aria-label="Bottom navigation"
      >
        {navItems.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors active:scale-90 duration-150 ${
                active
                  ? 'text-primary bg-primary/10 rounded-lg mx-1'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`h-5 w-5 ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                strokeWidth={active ? 2.5 : 1.75}
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
