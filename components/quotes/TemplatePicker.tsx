'use client';

import { useState, useTransition } from 'react';
import { deleteQuoteTemplate } from '@/app/actions/quote-templates';
import type { QuoteTemplate, QuoteTemplatePayload } from '@/app/actions/quote-templates';

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
      <div className="mb-6 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
        <p className="text-sm text-on-surface-variant">
          No saved templates yet. After submitting a quote, you can save it as a template to reuse next time.
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
        className="flex h-12 w-full items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm font-medium text-on-surface transition-colors active:bg-surface-container"
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
        <div className="mt-2 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          {deleteError && (
            <p className="px-4 pt-3 text-sm text-error">{deleteError}</p>
          )}
          <ul className="divide-y divide-outline-variant">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleApply(template)}
                  className="flex-1 text-left text-sm font-medium text-on-surface hover:text-primary"
                >
                  {template.name}
                </button>
                {confirmDeleteId === template.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteConfirm(template.id)}
                      disabled={isPending}
                      className="h-8 rounded-lg bg-error px-3 text-xs font-medium text-on-primary transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCancel}
                      className="h-8 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
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
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error disabled:opacity-50"
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
