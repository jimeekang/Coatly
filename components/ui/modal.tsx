'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

const SIZE: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC 키 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // 열릴 때 패널로 초기 포커스 이동
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 패널 */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={[
          'relative flex w-full flex-col rounded-2xl bg-surface-container-lowest shadow-xl',
          'max-h-[90dvh] focus:outline-none',
          SIZE[size],
        ].join(' ')}
      >
        {/* 헤더 */}
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline p-5">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-on-surface">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* 푸터 */}
        {footer && (
          <div className="shrink-0 border-t border-outline p-5">{footer}</div>
        )}
      </div>
    </div>
  );
}
