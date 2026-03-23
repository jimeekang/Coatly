'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  // 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* 다이얼로그 패널 */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 flex flex-col gap-4">
        <div>
          <h2
            id="confirm-dialog-title"
            className="text-lg font-semibold text-pm-body"
          >
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-pm-secondary leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border border-pm-border bg-white text-sm font-medium text-pm-body hover:bg-pm-surface active:bg-pm-surface transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-12 rounded-xl text-sm font-semibold text-white transition-colors ${
              destructive
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-pm-teal hover:bg-pm-teal-hover active:bg-pm-teal-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
