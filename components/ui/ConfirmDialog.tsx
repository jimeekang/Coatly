'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      !element.hasAttribute('hidden') &&
      element.getAttribute('aria-hidden') !== 'true'
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmPendingLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  confirmPendingLabel = confirmLabel,
  destructive = false,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const pendingRef = useRef(pending);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    onCancelRef.current = onCancel;
    pendingRef.current = pending;
  }, [onCancel, pending]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    cancelButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!pendingRef.current) onCancelRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = getFocusableElements(panelRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement ||
          !panelRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement ||
          !panelRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={pending ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* 다이얼로그 패널 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="border-outline-variant bg-surface-container-lowest relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border p-6 shadow-xl outline-none"
      >
        <div>
          <h2 id={titleId} className="text-on-surface text-lg font-semibold">
            {title}
          </h2>
          <p
            id={messageId}
            className="text-on-surface-variant mt-1.5 text-sm leading-relaxed"
          >
            {message}
          </p>
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="flex gap-3 pt-1">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low active:bg-surface-container-low focus-visible:ring-primary focus-visible:ring-offset-surface-container-lowest h-12 flex-1 rounded-xl border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`focus-visible:ring-primary focus-visible:ring-offset-surface-container-lowest h-12 flex-1 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
              destructive
                ? 'bg-error text-on-error hover:bg-error/90 active:bg-error/90'
                : 'bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/90'
            }`}
          >
            {pending ? confirmPendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
