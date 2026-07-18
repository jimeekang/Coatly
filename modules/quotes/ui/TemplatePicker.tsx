'use client';

import { useState, useTransition } from 'react';
import { deleteQuoteTemplate } from '@/modules/quotes/application/template-actions';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import type {
  QuoteTemplate,
  QuoteTemplatePayload,
} from '@/modules/quotes/application/template-actions';

interface TemplatePickerProps {
  templates: QuoteTemplate[];
  onApply: (payload: QuoteTemplatePayload) => void;
}

export function TemplatePicker({ templates, onApply }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (templates.length === 0) {
    return (
      <div className="border-outline-variant bg-surface-container-lowest mb-6 rounded-2xl border px-4 py-3">
        <p className="text-on-surface-variant text-sm">
          No saved templates yet. After submitting a quote, you can save it as a
          template to reuse next time.
        </p>
      </div>
    );
  }

  function handleApply(template: QuoteTemplate) {
    onApply(template.payload);
    setOpen(false);
  }

  function handleDeleteRequest(templateId: string) {
    setConfirmDeleteId(templateId);
  }

  function handleDeleteConfirm(templateId: string) {
    setDeleteError(null);
    setConfirmDeleteId(null);
    startTransition(async () => {
      const result = await deleteQuoteTemplate(templateId);
      if (result.error) setDeleteError(result.error);
    });
  }

  function handleDeleteCancel() {
    setConfirmDeleteId(null);
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="border-outline-variant bg-surface-container-lowest text-on-surface active:bg-surface-container focus-visible:ring-primary/30 flex h-12 w-full items-center justify-between rounded-xl border px-4 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span>Start from a saved template</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-outline-variant bg-surface-container-lowest mt-2 rounded-2xl border shadow-sm">
          {deleteError && (
            <ErrorAlert className="m-3">{deleteError}</ErrorAlert>
          )}
          <ul className="divide-outline-variant divide-y">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleApply(template)}
                  className="text-on-surface hover:text-primary focus-visible:ring-primary/30 min-h-11 flex-1 rounded-xl px-2 text-left text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                  {template.name}
                </button>
                {confirmDeleteId === template.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteConfirm(template.id)}
                      disabled={isPending}
                      className="bg-error text-on-error focus-visible:ring-error/30 min-h-11 rounded-xl px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCancel}
                      className="border-outline-variant text-on-surface-variant hover:bg-surface-container focus-visible:ring-primary/30 min-h-11 rounded-xl border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteRequest(template.id)}
                    disabled={isPending}
                    aria-label={`Delete template ${template.name}`}
                    className="text-on-surface-variant hover:bg-surface-container hover:text-error focus-visible:ring-error/30 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
