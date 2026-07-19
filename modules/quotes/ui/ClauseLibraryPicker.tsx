'use client';

import { Plus, Trash2 } from 'lucide-react';
import { QUOTE_FORM_CLAUSE_LIBRARY } from '@/config/quote-form-taxonomy';
import type { QuoteClauseItemInput } from '@/modules/quotes/domain/quote';

type ClauseLibraryPickerProps = {
  value: QuoteClauseItemInput[];
  onChange: (clauses: QuoteClauseItemInput[]) => void;
};

type LibraryClause = (typeof QUOTE_FORM_CLAUSE_LIBRARY)[number];

const CLAUSE_BODY_BY_KEY: Record<string, string> = {
  inclusions:
    'This quote includes labour, standard preparation, painting materials, and cleanup for the listed scope of work.',
  workmanship_warranty:
    'Workmanship is covered for defects caused by application issues, excluding movement, moisture, impact damage, or substrate failure.',
  vivid_white:
    'White and very light colours may require extra coats for full coverage depending on the existing colour and surface condition.',
  paint_peeling:
    'Existing peeling or poorly bonded paint may continue to fail after preparation. Extra repair may be quoted if uncovered during works.',
  water_damage_best_effort:
    'Water-damaged areas will be prepared and repainted on a best-effort basis once the visible surface is dry and ready for painting.',
  source_repair_excluded:
    'This painting quote excludes plumbing, waterproofing, roofing, structural, or other source repairs causing the damage.',
  mould_recurrence_risk:
    'Mould staining can return if ventilation or moisture issues remain. This quote covers visible treatment/preparation and repainting only.',
  touch_up_colour_match_limit:
    'Touch-ups and colour matching may remain visible in some lighting, especially where existing paint has aged or faded.',
  tenant_owner_access_required:
    'Access must be arranged with the tenant, owner, or property manager before the scheduled work can proceed.',
  strata_common_area_access:
    'Common area access, approvals, lifts, parking, and work-hour restrictions must be confirmed before work starts.',
  before_after_photo_note:
    'Before and after photos can be recorded for the quoted areas where access and lighting allow.',
  efflorescence:
    'Efflorescence is moisture-driven and may reappear if the underlying source is still active.',
  difficult_access:
    'The quote allows for reasonable access. Unsafe or materially different access conditions may require a revised quote.',
  payment_deposit:
    'Deposit and balance payment requirements are shown in the quote summary and must be paid according to the agreed schedule.',
  quote_validity:
    'This quote is valid until the stated expiry date unless the scope, site condition, or material pricing changes.',
};

function nextClientId() {
  return `clause-${Math.random().toString(36).slice(2, 10)}`;
}

function createClause(clause: LibraryClause, sortOrder: number) {
  return {
    client_id: nextClientId(),
    clause_key: clause.key,
    category: clause.category,
    title: clause.title,
    body: CLAUSE_BODY_BY_KEY[clause.key] ?? clause.title,
    severity: clause.severity,
    source: 'default_library',
    is_customer_visible: true,
    sort_order: sortOrder,
  } satisfies QuoteClauseItemInput;
}

export function ClauseLibraryPicker({
  value,
  onChange,
}: ClauseLibraryPickerProps) {
  const selectedKeys = new Set(value.map((clause) => clause.clause_key));

  function addClause(clause: LibraryClause) {
    if (selectedKeys.has(clause.key)) return;
    onChange([...value, createClause(clause, value.length)]);
  }

  function updateClause(index: number, patch: Partial<QuoteClauseItemInput>) {
    onChange(
      value.map((clause, clauseIndex) =>
        clauseIndex === index ? { ...clause, ...patch } : clause
      )
    );
  }

  function removeClause(index: number) {
    onChange(value.filter((_, clauseIndex) => clauseIndex !== index));
  }

  return (
    <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm sm:p-6">
      <div>
        <h3 className="text-on-surface text-base leading-snug font-bold">
          Clause Library
        </h3>
        <p className="text-on-surface-variant mt-0.5 text-sm">
          Customer-visible inclusions, exclusions, risks, warranty, payment, and
          access notes.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {QUOTE_FORM_CLAUSE_LIBRARY.map((clause) => {
          const selected = selectedKeys.has(clause.key);

          return (
            <button
              key={clause.key}
              type="button"
              disabled={selected}
              onClick={() => addClause(clause)}
              className="border-outline-variant text-on-surface hover:border-primary disabled:bg-surface-container disabled:text-on-surface-variant flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-surface-container-lowest px-3 py-2 text-left text-sm disabled:cursor-not-allowed"
            >
              <span>
                <span className="block font-semibold">{clause.title}</span>
                <span className="text-on-surface-variant block text-xs capitalize">
                  {clause.category.replaceAll('_', ' ')}
                </span>
              </span>
              <span className="text-primary inline-flex items-center gap-1 text-xs font-semibold">
                {!selected && <Plus className="h-3.5 w-3.5" />}
                {selected ? 'Added' : `Add ${clause.title}`}
              </span>
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
            Selected clauses
          </p>
          {value.map((clause, index) => (
            <div
              key={clause.client_id ?? clause.clause_key}
              className="border-outline-variant rounded-xl border bg-surface-container-lowest p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-on-surface text-sm font-semibold">
                    {clause.title}
                  </p>
                  <p className="text-on-surface-variant text-xs capitalize">
                    {clause.category.replaceAll('_', ' ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeClause(index)}
                  className="text-error hover:bg-error/10 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Clause title
                  </label>
                  <input
                    value={clause.title}
                    onChange={(event) =>
                      updateClause(index, { title: event.target.value })
                    }
                    className="border-outline-variant bg-surface-container-lowest text-on-surface h-11 w-full rounded-lg border px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Clause body
                  </label>
                  <textarea
                    rows={3}
                    value={clause.body}
                    onChange={(event) =>
                      updateClause(index, { body: event.target.value })
                    }
                    className="border-outline-variant bg-surface-container-lowest text-on-surface w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
