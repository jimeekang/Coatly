'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  formControlClassName,
  formTextareaClassName,
} from '@/components/forms/FormField';
import { MAINTENANCE_JOB_PACKS } from '@/config/maintenance-job-packs';
import {
  QUOTE_SCOPE_MEASUREMENT_STATUSES,
  QUOTE_SCOPE_PRICING_STATUSES,
  QUOTE_SCOPE_SECTION_KINDS,
  QUOTE_SCOPE_STEP_TYPES,
} from '@/config/quote-form-taxonomy';
import type {
  MaintenanceJobPackId,
  QuoteJobType,
  QuoteScopeSectionInput,
  QuoteScopeStepInput,
} from '@/modules/quotes/domain/quote';

type ScopeBuilderProps = {
  jobType: QuoteJobType;
  value: QuoteScopeSectionInput[];
  onChange: (sections: QuoteScopeSectionInput[]) => void;
};

const KIND_LABELS: Record<string, string> = {
  interior: 'Interior',
  exterior: 'Exterior',
  maintenance: 'Maintenance',
  general: 'General',
  optional: 'Optional',
};

const STATUS_LABELS: Record<string, string> = {
  unpriced: 'Unpriced',
  priced: 'Priced elsewhere',
  included: 'Included',
  excluded: 'Excluded',
  allowance: 'Allowance',
  to_confirm: 'To confirm',
};

const MEASUREMENT_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  rough: 'Rough',
  photo_hint: 'Photo hint',
  to_confirm: 'To confirm',
};

const STEP_LABELS: Record<string, string> = {
  prep: 'Prep',
  primer: 'Primer',
  topcoat: 'Topcoat',
  repair: 'Repair',
  paint_system: 'Paint system',
  colour_note: 'Colour note',
  special_note: 'Special note',
  exclusion_note: 'Exclusion note',
};

function nextClientId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultSectionKind(jobType: QuoteJobType) {
  if (jobType === 'maintenance') return 'maintenance';
  if (jobType === 'both') return 'general';
  return jobType;
}

function createScopeSection(jobType: QuoteJobType): QuoteScopeSectionInput {
  return {
    client_id: nextClientId('scope'),
    section_kind: defaultSectionKind(jobType),
    title: '',
    description: '',
    area_label: '',
    surface_category: '',
    is_optional: false,
    is_selected: true,
    pricing_status: 'included',
    measurement_status: 'to_confirm',
    source: 'manual',
    sort_order: 0,
    report_context: jobType === 'maintenance',
    visible_defects: [],
    steps: [],
  };
}

function createScopeStep(): QuoteScopeStepInput {
  return {
    client_id: nextClientId('step'),
    step_type: 'prep',
    label: '',
    description: '',
    requires_confirmation: false,
    is_customer_visible: true,
  };
}

function normalizeDefects(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getDefectsInput(section: QuoteScopeSectionInput) {
  return (section.visible_defects ?? []).join(', ');
}

export function ScopeBuilder({ jobType, value, onChange }: ScopeBuilderProps) {
  function updateSection(
    index: number,
    patch: Partial<QuoteScopeSectionInput>
  ) {
    onChange(
      value.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section
      )
    );
  }

  function updateStep(
    sectionIndex: number,
    stepIndex: number,
    patch: Partial<QuoteScopeStepInput>
  ) {
    onChange(
      value.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          steps: (section.steps ?? []).map((step, currentStepIndex) =>
            currentStepIndex === stepIndex ? { ...step, ...patch } : step
          ),
        };
      })
    );
  }

  function addSection() {
    onChange([
      ...value,
      {
        ...createScopeSection(jobType),
        sort_order: value.length,
      },
    ]);
  }

  function removeSection(index: number) {
    onChange(value.filter((_, sectionIndex) => sectionIndex !== index));
  }

  function addStep(sectionIndex: number) {
    onChange(
      value.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          steps: [...(section.steps ?? []), createScopeStep()],
        };
      })
    );
  }

  function removeStep(sectionIndex: number, stepIndex: number) {
    onChange(
      value.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          steps: (section.steps ?? []).filter(
            (_, currentStepIndex) => currentStepIndex !== stepIndex
          ),
        };
      })
    );
  }

  function applyMaintenancePack(index: number, packId: string) {
    const pack = MAINTENANCE_JOB_PACKS.find((item) => item.id === packId);
    if (!pack) return;

    const current = value[index];
    updateSection(index, {
      section_kind: 'maintenance',
      maintenance_job_pack: pack.id as MaintenanceJobPackId,
      title: current.title.trim() ? current.title : pack.label,
      surface_category:
        current.surface_category?.trim() || pack.allowed_surfaces[0] || '',
      visible_defects: current.visible_defects?.length
        ? current.visible_defects
        : pack.visible_defect_tags.slice(0, 3),
      report_context: true,
    });
  }

  return (
    <section className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-on-surface text-base leading-snug font-bold">
            Scope Builder
          </h3>
          <p className="text-on-surface-variant mt-0.5 text-sm">
            Customer-visible work sections for the quote document.
          </p>
        </div>
        <button
          type="button"
          onClick={addSection}
          className="border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary focus-visible:ring-primary/30 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          <Plus className="h-3.5 w-3.5" />
          Add scope section
        </button>
      </div>

      {value.length === 0 ? (
        <p className="border-outline-variant bg-surface-container text-on-surface-variant mt-4 rounded-xl border border-dashed px-4 py-5 text-sm">
          Add sections such as walls, ceiling, water damage repaint, or optional
          touch-up work.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {value.map((section, sectionIndex) => (
            <div
              key={section.client_id ?? sectionIndex}
              className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <p className="text-on-surface text-sm font-semibold">
                  Section {sectionIndex + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeSection(sectionIndex)}
                  className="text-error hover:bg-error/10 focus-visible:ring-error/30 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Section kind
                  </label>
                  <select
                    value={section.section_kind}
                    onChange={(event) =>
                      updateSection(sectionIndex, {
                        section_kind: event.target
                          .value as QuoteScopeSectionInput['section_kind'],
                      })
                    }
                    className={formControlClassName}
                  >
                    {QUOTE_SCOPE_SECTION_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>

                {section.section_kind === 'maintenance' && (
                  <div>
                    <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                      Maintenance job pack
                    </label>
                    <select
                      aria-label="Maintenance job pack"
                      value={section.maintenance_job_pack ?? ''}
                      onChange={(event) =>
                        applyMaintenancePack(sectionIndex, event.target.value)
                      }
                      className={formControlClassName}
                    >
                      <option value="">Select a supported pack</option>
                      {MAINTENANCE_JOB_PACKS.map((pack) => (
                        <option key={pack.id} value={pack.id}>
                          {pack.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Scope title
                  </label>
                  <input
                    aria-label="Scope title"
                    value={section.title}
                    onChange={(event) =>
                      updateSection(sectionIndex, { title: event.target.value })
                    }
                    className={formControlClassName}
                  />
                </div>

                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Area label
                  </label>
                  <input
                    aria-label="Area label"
                    value={section.area_label ?? ''}
                    onChange={(event) =>
                      updateSection(sectionIndex, {
                        area_label: event.target.value,
                      })
                    }
                    className={formControlClassName}
                  />
                </div>

                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Surface category
                  </label>
                  <input
                    value={section.surface_category ?? ''}
                    onChange={(event) =>
                      updateSection(sectionIndex, {
                        surface_category: event.target.value,
                      })
                    }
                    className={formControlClassName}
                  />
                </div>

                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Pricing status
                  </label>
                  <select
                    aria-label="Pricing status"
                    value={section.pricing_status ?? 'included'}
                    onChange={(event) =>
                      updateSection(sectionIndex, {
                        pricing_status: event.target
                          .value as QuoteScopeSectionInput['pricing_status'],
                      })
                    }
                    className={formControlClassName}
                  >
                    {QUOTE_SCOPE_PRICING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                    Measurement status
                  </label>
                  <select
                    value={section.measurement_status ?? 'to_confirm'}
                    onChange={(event) =>
                      updateSection(sectionIndex, {
                        measurement_status: event.target
                          .value as QuoteScopeSectionInput['measurement_status'],
                      })
                    }
                    className={formControlClassName}
                  >
                    {QUOTE_SCOPE_MEASUREMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {MEASUREMENT_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                  Scope description
                </label>
                <textarea
                  aria-label="Scope description"
                  rows={3}
                  value={section.description ?? ''}
                  onChange={(event) =>
                    updateSection(sectionIndex, {
                      description: event.target.value,
                    })
                  }
                  className={formTextareaClassName}
                />
              </div>

              {section.section_kind === 'maintenance' && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-on-surface flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={section.report_context ?? false}
                      onChange={(event) =>
                        updateSection(sectionIndex, {
                          report_context: event.target.checked,
                        })
                      }
                      className="accent-primary"
                    />
                    Show in maintenance summary
                  </label>
                  <div>
                    <label className="text-on-surface-variant mb-1 block text-xs font-semibold">
                      Visible defects
                    </label>
                    <input
                      value={getDefectsInput(section)}
                      onChange={(event) =>
                        updateSection(sectionIndex, {
                          visible_defects: normalizeDefects(event.target.value),
                        })
                      }
                      className={formControlClassName}
                    />
                  </div>
                </div>
              )}

              <div className="border-outline-variant mt-4 border-t pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
                    Steps
                  </p>
                  <button
                    type="button"
                    onClick={() => addStep(sectionIndex)}
                    className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add step
                  </button>
                </div>

                {(section.steps ?? []).length === 0 ? (
                  <p className="text-on-surface-variant text-sm">
                    Add prep, primer, topcoat, repair, colour, or confirmation
                    notes for this section.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(section.steps ?? []).map((step, stepIndex) => (
                      <div
                        key={step.client_id ?? stepIndex}
                        className="border-outline-variant bg-surface-container rounded-xl border p-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
                          <select
                            value={step.step_type}
                            onChange={(event) =>
                              updateStep(sectionIndex, stepIndex, {
                                step_type: event.target
                                  .value as QuoteScopeStepInput['step_type'],
                              })
                            }
                            className={formControlClassName}
                          >
                            {QUOTE_SCOPE_STEP_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {STEP_LABELS[type]}
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label="Step description"
                            value={step.description}
                            onChange={(event) =>
                              updateStep(sectionIndex, stepIndex, {
                                description: event.target.value,
                              })
                            }
                            className={formControlClassName}
                          />
                          <button
                            type="button"
                            onClick={() => removeStep(sectionIndex, stepIndex)}
                            className="text-error hover:bg-error/10 focus-visible:ring-error/30 inline-flex min-h-11 items-center rounded-xl px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
