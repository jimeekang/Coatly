'use client';

type AIDraftPanelProps = {
  entityLabel: string;
  prompt: string;
  placeholder: string;
  examples: string[];
  pending: boolean;
  error: string | null;
  summary: string | null;
  warnings: string[];
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onApply: () => void;
  canApply: boolean;
};

export function AIDraftPanel({
  entityLabel,
  prompt,
  placeholder,
  examples,
  pending,
  error,
  summary,
  warnings,
  onPromptChange,
  onGenerate,
  onApply,
  canApply,
}: AIDraftPanelProps) {
  return (
    <section className="mb-6 rounded-2xl border border-pm-teal-light bg-gradient-to-br from-pm-teal-light to-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pm-teal-hover">
            AI Draft
          </p>
          <h2 className="mt-1 text-lg font-semibold text-pm-body">
            Describe the {entityLabel.toLowerCase()} in plain English
          </h2>
          <p className="mt-1 text-sm text-pm-secondary">
            AI prepares a structured draft only. You still review the form before saving.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={4}
          placeholder={placeholder}
          className="w-full rounded-xl border border-pm-teal-light bg-white px-4 py-3 text-base text-pm-body placeholder:text-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPromptChange(example)}
            className="rounded-full border border-pm-teal-light bg-white px-3 py-1.5 text-xs font-medium text-pm-teal-hover transition-colors hover:bg-pm-teal-light"
          >
            {example}
          </button>
        ))}
      </div>

      {(summary || warnings.length > 0 || error) && (
        <div className="mt-4 rounded-xl border border-pm-border bg-white px-4 py-3">
          {summary && <p className="text-sm font-medium text-pm-body">{summary}</p>}
          {warnings.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-pm-coral-dark">{error}</p>}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending || !prompt.trim()}
          className="flex-1 rounded-xl bg-pm-teal px-4 py-3 text-sm font-semibold text-white transition-colors active:bg-pm-teal-hover disabled:opacity-50"
        >
          {pending ? 'Generating…' : 'Generate Draft'}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply || pending}
          className="flex-1 rounded-xl border border-pm-border bg-white px-4 py-3 text-sm font-medium text-pm-body transition-colors active:bg-pm-surface disabled:opacity-50"
        >
          Apply to Form
        </button>
      </div>
    </section>
  );
}
