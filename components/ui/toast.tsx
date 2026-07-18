'use client';

import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { create } from 'zustand';

// ── 타입 ──────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

// ── Zustand store ─────────────────────────────────────────────────────
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ── useToast hook ─────────────────────────────────────────────────────
export function useToast() {
  const add = useToastStore((s) => s.add);
  return {
    success: (message: string, duration = 4000) =>
      add({ message, variant: 'success', duration }),
    error: (message: string, duration = 5000) =>
      add({ message, variant: 'error', duration }),
    warning: (message: string, duration = 4000) =>
      add({ message, variant: 'warning', duration }),
    info: (message: string, duration = 4000) =>
      add({ message, variant: 'info', duration }),
  };
}

// ── 스타일 맵 ────────────────────────────────────────────────────────
const STYLES: Record<
  ToastVariant,
  { container: string; icon: typeof CheckCircle; iconClass: string }
> = {
  success: {
    container: 'bg-success-container border-success/30',
    icon: CheckCircle,
    iconClass: 'text-on-success-container',
  },
  error: {
    container: 'bg-error-container border-error',
    icon: AlertCircle,
    iconClass: 'text-error',
  },
  warning: {
    container: 'bg-warning-container border-warning',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  info: {
    container: 'bg-secondary-container border-secondary/30',
    icon: Info,
    iconClass: 'text-on-secondary-container',
  },
};

// ── 개별 Toast 아이템 ────────────────────────────────────────────────
function Toast({ toast }: { toast: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  const { container, icon: Icon, iconClass } = STYLES[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => remove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, remove]);

  return (
    <div
      className={[
        'flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg',
        container,
      ].join(' ')}
      role="alert"
    >
      <Icon className={['mt-0.5 h-5 w-5 shrink-0', iconClass].join(' ')} />
      <p className="text-on-surface flex-1 text-sm font-medium">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => remove(toast.id)}
        className="text-on-surface-variant hover:bg-surface-container-low/70 hover:text-on-surface focus-visible:ring-primary/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── ToastProvider (root layout에 추가) ──────────────────────────────
export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={[
        'pointer-events-none fixed right-0 bottom-24 left-0 z-[100]',
        'flex flex-col items-center gap-2 px-4',
        'sm:right-6 sm:bottom-6 sm:left-auto sm:items-end',
      ].join(' ')}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  );
}
