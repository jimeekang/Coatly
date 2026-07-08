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
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
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
  const hasHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const activePathname = hasHydrated ? pathname : '';
  const isMoreActive = mobileMoreItems.some(({ href }) => isActive(href, activePathname));

  return (
    <>
      {/* ── Tablet/Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-surface-container-low p-4 min-h-screen sticky top-0 h-screen overflow-y-auto z-50 border-r border-outline-variant shrink-0">
        {/* Logo */}
        <div className="mb-6 flex justify-start px-4 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center">
              <span className="text-on-primary text-[11px] font-extrabold leading-none">C</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-on-surface" style={{ letterSpacing: '-0.02em' }}>Coatly</h1>
              <p className="text-[10px] font-bold tracking-[0.14em] text-on-surface-variant uppercase mt-0.5">
                Painter Workspace
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, activePathname);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-start gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? 'bg-surface-container-high text-on-surface font-bold border border-outline-variant shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium border border-transparent'
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
            className="flex items-center justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors w-full"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            <span>Logout</span>
          </button>
        </form>

        {/* User card */}
        <div className="mt-2 px-4 py-4 bg-surface-container-high rounded-xl border border-outline-variant">
          <div className="flex items-center justify-start gap-3">
            <div
              title={businessName}
              className="w-9 h-9 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary text-sm font-bold flex-shrink-0"
            >
              {businessName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{businessName}</p>
              <p
                className={`text-[11px] uppercase tracking-widest font-semibold ${
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
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-outline-variant bg-surface/90 px-4 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-on-surface">Coatly</h1>
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

      {isMoreOpen ? (
        <>
          <button
            type="button"
            aria-label="Close more navigation"
            className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 bg-black/30 md:hidden"
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
              className="overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
                <p className="text-sm font-bold text-on-surface">More</p>
                <button
                  type="button"
                  aria-label="Close more navigation"
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high active:bg-outline-variant"
                  onClick={() => setIsMoreOpen(false)}
                >
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              <div className="divide-y divide-outline-variant">
                {mobileMoreItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href, activePathname);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-12 items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${
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
        className="md:hidden fixed bottom-0 inset-x-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-outline-variant bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        aria-label="Bottom navigation"
      >
        {mobilePrimaryItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, activePathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 duration-150 ${
                active ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
              }`}
              aria-current={active ? 'page' : undefined}
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
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold transition-colors active:scale-95 duration-150 ${
            isMoreActive || isMoreOpen ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
          }`}
          onClick={() => setIsMoreOpen((open) => !open)}
        >
          <MoreHorizontal
            className={`h-[22px] w-[22px] ${
              isMoreActive || isMoreOpen ? 'text-primary' : 'text-on-surface-variant'
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
