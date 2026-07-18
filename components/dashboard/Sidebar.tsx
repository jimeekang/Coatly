'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Boxes,
  Receipt,
  Users,
  Settings,
  LogOut,
  DollarSign,
  Home,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/branding/BrandLogo';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/schedule', label: 'Schedule & Jobs', icon: CalendarDays },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/materials-service', label: 'Material / Service', icon: Boxes },
  { href: '/price-rates', label: 'Price Rates', icon: DollarSign },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const mobilePrimaryItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
];

const mobileMoreItems: NavItem[] = [
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/materials-service', label: 'Material / Service', icon: Boxes },
  { href: '/price-rates', label: 'Price Rates', icon: DollarSign },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function isActive(href: string, pathname: string) {
  return (
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href + '/'))
  );
}

export default function DashboardSidebar({
  businessName,
  planLabel,
  isPro,
  signOut,
}: {
  businessName: string;
  planLabel: string;
  isPro: boolean;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const activePathname = hasHydrated ? pathname : '';
  const isMoreActive = mobileMoreItems.some(({ href }) =>
    isActive(href, activePathname)
  );

  return (
    <>
      {/* ── Tablet/Desktop sidebar ── */}
      <aside className="border-outline-variant bg-surface-container-low sticky top-0 z-40 hidden h-screen min-h-screen w-60 shrink-0 flex-col overflow-y-auto border-r p-4 md:flex lg:w-64">
        {/* Logo */}
        <div className="mb-6 flex justify-start px-4 pt-2">
          <BrandLogo width={160} height={36} priority />
        </div>

        {/* Nav */}
        <nav
          className="flex flex-1 flex-col gap-0.5"
          aria-label="Main navigation"
        >
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, activePathname);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={active ? 'page' : undefined}
                className={`focus-visible:ring-primary/30 flex min-h-11 items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                  active
                    ? 'bg-surface-container-high text-on-surface border-outline-variant border font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent font-medium'
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : ''}`}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <form action={signOut} className="mt-2">
          <button
            type="submit"
            title="Logout"
            className="text-on-surface-variant hover:bg-surface-container focus-visible:ring-primary/30 flex min-h-11 w-full items-center justify-start gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            <span>Logout</span>
          </button>
        </form>

        {/* User card */}
        <div className="bg-surface-container-high border-outline-variant mt-2 rounded-xl border px-4 py-4">
          <div className="flex items-center justify-start gap-3">
            <div
              title={businessName}
              className="bg-tertiary text-on-tertiary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
            >
              {businessName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-on-surface truncate text-xs font-bold">
                {businessName}
              </p>
              <p
                className={`text-[11px] font-semibold tracking-widest uppercase ${
                  isPro ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                {planLabel}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="border-outline-variant bg-surface/90 fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md md:hidden">
        <BrandLogo width={112} height={26} priority />
        <div className="flex items-center gap-2">
          <p className="text-on-surface-variant max-w-[120px] truncate text-xs font-medium">
            {businessName}
          </p>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
              isPro
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {planLabel}
          </span>
        </div>
      </header>

      {isMoreOpen ? (
        <>
          <button
            type="button"
            aria-label="Close more navigation"
            className="focus-visible:ring-primary fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 bg-black/30 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset md:hidden"
            onClick={() => setIsMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More menu"
            className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm md:hidden"
          >
            <nav
              id="mobile-more-navigation"
              aria-label="More navigation"
              className="border-outline-variant bg-surface overflow-hidden rounded-2xl border shadow-2xl"
            >
              <div className="border-outline-variant flex items-center justify-between border-b px-4 py-3">
                <p className="text-on-surface text-sm font-bold">More</p>
                <button
                  type="button"
                  aria-label="Close more navigation"
                  className="text-on-surface-variant hover:bg-surface-container-high focus-visible:ring-primary/30 active:bg-outline-variant flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  onClick={() => setIsMoreOpen(false)}
                >
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              <div className="divide-outline-variant divide-y">
                {mobileMoreItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href, activePathname);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`focus-visible:ring-primary/30 flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
                        active
                          ? 'bg-surface-container-high text-primary'
                          : 'text-on-surface hover:bg-surface-container-high'
                      }`}
                      onClick={() => setIsMoreOpen(false)}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                        strokeWidth={active ? 2.25 : 1.75}
                        aria-hidden="true"
                      />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </>
      ) : null}

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="border-outline-variant bg-surface/90 fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Bottom navigation"
      >
        {mobilePrimaryItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, activePathname);
          return (
            <Link
              key={href}
              href={href}
              className={`focus-visible:ring-primary/30 flex min-h-11 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:scale-95 ${
                active
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setIsMoreOpen(false)}
            >
              <Icon
                className={`h-[22px] w-[22px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden="true"
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-controls="mobile-more-navigation"
          aria-current={isMoreActive ? 'page' : undefined}
          aria-expanded={isMoreOpen}
          className={`focus-visible:ring-primary/30 flex min-h-11 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:scale-95 ${
            isMoreActive || isMoreOpen
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-primary'
          }`}
          onClick={() => setIsMoreOpen((open) => !open)}
        >
          <MoreHorizontal
            className={`h-[22px] w-[22px] ${
              isMoreActive || isMoreOpen
                ? 'text-primary'
                : 'text-on-surface-variant'
            }`}
            strokeWidth={isMoreActive || isMoreOpen ? 2.25 : 1.75}
            aria-hidden="true"
          />
          <span className="truncate">More</span>
        </button>
      </nav>
    </>
  );
}
