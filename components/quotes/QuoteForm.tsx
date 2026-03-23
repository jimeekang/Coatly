'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  QUOTE_COATING_LABELS,
  QUOTE_SURFACE_LABELS,
  QUOTE_TIER_LABELS,
  calculateQuotePreview,
  getSuggestedRatePerM2Cents,
  type QuoteCustomerOption,
  type QuoteStatus,
  type QuoteTier,
} from '@/lib/quotes';
import { formatAUD } from '@/utils/format';

const FIELD_CLASS =
  'h-12 w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30';
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-pm-body';

type SurfaceType = 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows';
type CoatingType =
  | 'touch_up_1coat'
  | 'repaint_2coat'
  | 'new_plaster_3coat'
  | 'stain'
  | 'specialty';
type RoomType = 'interior' | 'exterior';

type QuoteSurfaceState = {
  surface_type: SurfaceType;
  coating_type: CoatingType;
  area_m2: string;
  rate_per_m2_cents: string;
  notes: string;
};

type QuoteRoomState = {
  name: string;
  room_type: RoomType;
  length_m: string;
  width_m: string;
  height_m: string;
  surfaces: QuoteSurfaceState[];
};

type QuoteFormPayload = {
  customer_id: string;
  title: string;
  status: QuoteStatus;
  valid_until: string;
  tier: QuoteTier;
  labour_margin_percent: number;
  material_margin_percent: number;
  notes: string;
  internal_notes: string;
  rooms: Array<{
    name: string;
    room_type: RoomType;
    length_m: number | null;
    width_m: number | null;
    height_m: number | null;
    surfaces: Array<{
      surface_type: SurfaceType;
      coating_type: CoatingType;
      area_m2: number;
      rate_per_m2_cents: number;
      notes: string;
    }>;
  }>;
};

type QuoteFormDefaultValues = {
  customer_id: string;
  title: string;
  status: QuoteStatus;
  valid_until: string;
  tier: QuoteTier;
  labour_margin_percent: number;
  material_margin_percent: number;
  notes: string;
  internal_notes: string;
  rooms: Array<{
    name: string;
    room_type: RoomType;
    length_m: number | null;
    width_m: number | null;
    height_m: number | null;
    surfaces: Array<{
      surface_type: SurfaceType;
      coating_type: CoatingType;
      area_m2: number;
      rate_per_m2_cents: number;
      notes: string | null;
    }>;
  }>;
};

function getDefaultValidUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function createEmptySurface(tier: QuoteTier): QuoteSurfaceState {
  return {
    surface_type: 'walls',
    coating_type: 'repaint_2coat',
    area_m2: '',
    rate_per_m2_cents: String(getSuggestedRatePerM2Cents('walls', 'repaint_2coat', tier)),
    notes: '',
  };
}

function createEmptyRoom(tier: QuoteTier): QuoteRoomState {
  return {
    name: '',
    room_type: 'interior',
    length_m: '',
    width_m: '',
    height_m: '2.7',
    surfaces: [createEmptySurface(tier)],
  };
}

function createInitialQuoteForm(defaultValues?: QuoteFormDefaultValues) {
  return {
    customer_id: defaultValues?.customer_id ?? '',
    title: defaultValues?.title ?? '',
    status: defaultValues?.status ?? ('draft' as const),
    valid_until: defaultValues?.valid_until ?? getDefaultValidUntil(),
    tier: defaultValues?.tier ?? ('better' as const),
    labour_margin_percent: String(defaultValues?.labour_margin_percent ?? 10),
    material_margin_percent: String(defaultValues?.material_margin_percent ?? 5),
    notes: defaultValues?.notes ?? '',
    internal_notes: defaultValues?.internal_notes ?? '',
  };
}

function createInitialRooms(defaultValues?: QuoteFormDefaultValues): QuoteRoomState[] {
  if (defaultValues?.rooms.length) {
    return defaultValues.rooms.map((room) => ({
      name: room.name,
      room_type: room.room_type,
      length_m: room.length_m == null ? '' : String(room.length_m),
      width_m: room.width_m == null ? '' : String(room.width_m),
      height_m: room.height_m == null ? '' : String(room.height_m),
      surfaces: room.surfaces.map((surface) => ({
        surface_type: surface.surface_type,
        coating_type: surface.coating_type,
        area_m2: String(surface.area_m2),
        rate_per_m2_cents: String(surface.rate_per_m2_cents),
        notes: surface.notes ?? '',
      })),
    }));
  }
  return [createEmptyRoom('better')];
}

export function QuoteForm({
  customers,
  onSubmit,
  onCancel,
  cancelLabel = 'Cancel',
  defaultValues,
  quoteNumberPreview = 'Assigned on save',
  submitLabel = 'Save Quote',
}: {
  customers: QuoteCustomerOption[];
  onSubmit?: (data: QuoteFormPayload) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
  defaultValues?: QuoteFormDefaultValues;
  quoteNumberPreview?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => createInitialQuoteForm(defaultValues));
  const [rooms, setRooms] = useState<QuoteRoomState[]>(() => createInitialRooms(defaultValues));

  const preview = useMemo(() => {
    const normalizedRooms = rooms
      .map((room) => ({
        name: room.name.trim(),
        room_type: room.room_type,
        length_m: room.length_m.trim() ? Number(room.length_m) : null,
        width_m: room.width_m.trim() ? Number(room.width_m) : null,
        height_m: room.height_m.trim() ? Number(room.height_m) : null,
        surfaces: room.surfaces
          .filter((surface) => surface.area_m2.trim())
          .map((surface) => ({
            surface_type: surface.surface_type,
            coating_type: surface.coating_type,
            area_m2: Number(surface.area_m2),
            rate_per_m2_cents: Number(surface.rate_per_m2_cents),
            notes: surface.notes.trim() || null,
          })),
      }))
      .filter((room) => room.name && room.surfaces.length > 0);

    return calculateQuotePreview({
      tier: form.tier,
      labour_margin_percent: Number(form.labour_margin_percent) || 0,
      material_margin_percent: Number(form.material_margin_percent) || 0,
      rooms: normalizedRooms,
    });
  }, [form.labour_margin_percent, form.material_margin_percent, form.tier, rooms]);

  const canSubmit =
    Boolean(onSubmit) &&
    Boolean(form.customer_id) &&
    Boolean(form.title.trim()) &&
    Boolean(form.valid_until) &&
    preview.rooms.length > 0;

  function handleFormChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === 'tier') {
      setRooms((current) =>
        current.map((room) => ({
          ...room,
          surfaces: room.surfaces.map((surface) => ({
            ...surface,
            rate_per_m2_cents: String(
              getSuggestedRatePerM2Cents(
                surface.surface_type,
                surface.coating_type,
                value as QuoteTier
              )
            ),
          })),
        }))
      );
    }
    setError(null);
  }

  function handleRoomChange(roomIndex: number, field: keyof Omit<QuoteRoomState, 'surfaces'>, value: string) {
    setRooms((current) =>
      current.map((room, index) => (index === roomIndex ? { ...room, [field]: value } : room))
    );
    setError(null);
  }

  function handleSurfaceChange(roomIndex: number, surfaceIndex: number, field: keyof QuoteSurfaceState, value: string) {
    setRooms((current) =>
      current.map((room, index) => {
        if (index !== roomIndex) return room;
        return {
          ...room,
          surfaces: room.surfaces.map((surface, currentSurfaceIndex) => {
            if (currentSurfaceIndex !== surfaceIndex) return surface;
            const nextSurface = { ...surface, [field]: value };
            if (field === 'surface_type' || field === 'coating_type') {
              nextSurface.rate_per_m2_cents = String(
                getSuggestedRatePerM2Cents(
                  (field === 'surface_type' ? value : nextSurface.surface_type) as SurfaceType,
                  (field === 'coating_type' ? value : nextSurface.coating_type) as CoatingType,
                  form.tier
                )
              );
            }
            return nextSurface;
          }),
        };
      })
    );
    setError(null);
  }

  function addRoom() {
    setRooms((current) => [...current, createEmptyRoom(form.tier)]);
  }

  function removeRoom(roomIndex: number) {
    setRooms((current) =>
      current.length === 1 ? current : current.filter((_, index) => index !== roomIndex)
    );
  }

  function addSurface(roomIndex: number) {
    setRooms((current) =>
      current.map((room, index) =>
        index === roomIndex
          ? { ...room, surfaces: [...room.surfaces, createEmptySurface(form.tier)] }
          : room
      )
    );
  }

  function removeSurface(roomIndex: number, surfaceIndex: number) {
    setRooms((current) =>
      current.map((room, index) => {
        if (index !== roomIndex) return room;
        return {
          ...room,
          surfaces:
            room.surfaces.length === 1
              ? room.surfaces
              : room.surfaces.filter((_, indexValue) => indexValue !== surfaceIndex),
        };
      })
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!onSubmit) {
      setError('Quote save action is not connected yet.');
      return;
    }

    startTransition(async () => {
      const preparedRooms = rooms
        .map((room) => ({
          name: room.name.trim(),
          room_type: room.room_type,
          length_m: room.length_m.trim() ? Number(room.length_m) : null,
          width_m: room.width_m.trim() ? Number(room.width_m) : null,
          height_m: room.height_m.trim() ? Number(room.height_m) : null,
          surfaces: room.surfaces
            .filter(
              (surface) =>
                surface.area_m2.trim() &&
                Number(surface.area_m2) > 0 &&
                Number(surface.rate_per_m2_cents) >= 0
            )
            .map((surface) => ({
              surface_type: surface.surface_type,
              coating_type: surface.coating_type,
              area_m2: Number(surface.area_m2),
              rate_per_m2_cents: Number(surface.rate_per_m2_cents),
              notes: surface.notes,
            })),
        }))
        .filter((room) => room.name && room.surfaces.length > 0);

      const result = await onSubmit({
        customer_id: form.customer_id,
        title: form.title.trim(),
        status: form.status,
        valid_until: form.valid_until,
        tier: form.tier,
        labour_margin_percent: Number(form.labour_margin_percent) || 0,
        material_margin_percent: Number(form.material_margin_percent) || 0,
        notes: form.notes,
        internal_notes: form.internal_notes,
        rooms: preparedRooms,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-28">
      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Quote Number
            </p>
            <p className="mt-1 text-lg font-semibold text-pm-body">{quoteNumberPreview}</p>
          </div>
          <div className="rounded-xl bg-pm-teal-light px-3 py-2 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-pm-teal-mid">Total</p>
            <p className="mt-1 text-lg font-semibold text-pm-teal">
              {formatAUD(preview.total_cents)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Quote Details
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="customer_id" className={LABEL_CLASS}>
              Customer
            </label>
            <select
              id="customer_id"
              name="customer_id"
              value={form.customer_id}
              onChange={handleFormChange}
              className={FIELD_CLASS}
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name || customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className={LABEL_CLASS}>
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleFormChange}
              placeholder="Interior repaint for Harbor Cafe"
              className={FIELD_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="status" className={LABEL_CLASS}>
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleFormChange}
                className={FIELD_CLASS}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label htmlFor="tier" className={LABEL_CLASS}>
                Tier
              </label>
              <select
                id="tier"
                name="tier"
                value={form.tier}
                onChange={handleFormChange}
                className={FIELD_CLASS}
              >
                {Object.entries(QUOTE_TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="valid_until" className={LABEL_CLASS}>
              Valid Until
            </label>
            <input
              id="valid_until"
              name="valid_until"
              type="date"
              value={form.valid_until}
              onChange={handleFormChange}
              className={FIELD_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="labour_margin_percent" className={LABEL_CLASS}>
                Labour Margin %
              </label>
              <input
                id="labour_margin_percent"
                name="labour_margin_percent"
                type="number"
                min="0"
                max="100"
                value={form.labour_margin_percent}
                onChange={handleFormChange}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="material_margin_percent" className={LABEL_CLASS}>
                Material Margin %
              </label>
              <input
                id="material_margin_percent"
                name="material_margin_percent"
                type="number"
                min="0"
                max="100"
                value={form.material_margin_percent}
                onChange={handleFormChange}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Rooms
          </h3>
          <button
            type="button"
            onClick={addRoom}
            className="inline-flex min-h-11 items-center rounded-lg border border-pm-border px-3 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
          >
            + Add Room
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {rooms.map((room, roomIndex) => (
            <div
              key={`${roomIndex}-${room.name}`}
              className="rounded-2xl border border-pm-border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-pm-body">Room {roomIndex + 1}</p>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(roomIndex)}
                    className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-pm-secondary hover:bg-pm-surface hover:text-pm-body"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <label className={LABEL_CLASS} htmlFor={`room-name-${roomIndex}`}>
                    Room Name
                  </label>
                  <input
                    id={`room-name-${roomIndex}`}
                    type="text"
                    value={room.name}
                    onChange={(event) => handleRoomChange(roomIndex, 'name', event.target.value)}
                    placeholder="Living room"
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-4 sm:col-span-1">
                    <label className={LABEL_CLASS} htmlFor={`room-type-${roomIndex}`}>
                      Room Type
                    </label>
                    <select
                      id={`room-type-${roomIndex}`}
                      value={room.room_type}
                      onChange={(event) =>
                        handleRoomChange(roomIndex, 'room_type', event.target.value)
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="interior">Interior</option>
                      <option value="exterior">Exterior</option>
                    </select>
                  </div>
                  <div className="col-span-4 grid grid-cols-3 gap-3 sm:col-span-3">
                    <div>
                      <label className={LABEL_CLASS} htmlFor={`room-length-${roomIndex}`}>
                        Length
                      </label>
                      <input
                        id={`room-length-${roomIndex}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={room.length_m}
                        onChange={(event) =>
                          handleRoomChange(roomIndex, 'length_m', event.target.value)
                        }
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor={`room-width-${roomIndex}`}>
                        Width
                      </label>
                      <input
                        id={`room-width-${roomIndex}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={room.width_m}
                        onChange={(event) =>
                          handleRoomChange(roomIndex, 'width_m', event.target.value)
                        }
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor={`room-height-${roomIndex}`}>
                        Height
                      </label>
                      <input
                        id={`room-height-${roomIndex}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={room.height_m}
                        onChange={(event) =>
                          handleRoomChange(roomIndex, 'height_m', event.target.value)
                        }
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-pm-surface p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-pm-body">Surfaces</p>
                    <button
                      type="button"
                      onClick={() => addSurface(roomIndex)}
                      className="rounded-lg border border-pm-border bg-white px-3 py-2 text-xs font-medium text-pm-body"
                    >
                      + Add Surface
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {room.surfaces.map((surface, surfaceIndex) => {
                      const surfaceTotal =
                        (Number(surface.area_m2) || 0) *
                        ((Number(surface.rate_per_m2_cents) || 0) / 100);

                      return (
                        <div
                          key={`${roomIndex}-${surfaceIndex}`}
                          className="rounded-xl border border-pm-border bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm font-medium text-pm-body">
                              Surface {surfaceIndex + 1}
                            </p>
                            {room.surfaces.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSurface(roomIndex, surfaceIndex)}
                                className="text-xs font-medium text-pm-secondary hover:text-pm-body"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <label
                                className={LABEL_CLASS}
                                htmlFor={`surface-type-${roomIndex}-${surfaceIndex}`}
                              >
                                Surface
                              </label>
                              <select
                                id={`surface-type-${roomIndex}-${surfaceIndex}`}
                                value={surface.surface_type}
                                onChange={(event) =>
                                  handleSurfaceChange(
                                    roomIndex,
                                    surfaceIndex,
                                    'surface_type',
                                    event.target.value
                                  )
                                }
                                className={FIELD_CLASS}
                              >
                                {Object.entries(QUOTE_SURFACE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label
                                className={LABEL_CLASS}
                                htmlFor={`coating-type-${roomIndex}-${surfaceIndex}`}
                              >
                                Coating
                              </label>
                              <select
                                id={`coating-type-${roomIndex}-${surfaceIndex}`}
                                value={surface.coating_type}
                                onChange={(event) =>
                                  handleSurfaceChange(
                                    roomIndex,
                                    surfaceIndex,
                                    'coating_type',
                                    event.target.value
                                  )
                                }
                                className={FIELD_CLASS}
                              >
                                {Object.entries(QUOTE_COATING_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label
                                className={LABEL_CLASS}
                                htmlFor={`area-${roomIndex}-${surfaceIndex}`}
                              >
                                Area (m²)
                              </label>
                              <input
                                id={`area-${roomIndex}-${surfaceIndex}`}
                                type="number"
                                min="0"
                                step="0.1"
                                value={surface.area_m2}
                                onChange={(event) =>
                                  handleSurfaceChange(
                                    roomIndex,
                                    surfaceIndex,
                                    'area_m2',
                                    event.target.value
                                  )
                                }
                                className={FIELD_CLASS}
                              />
                            </div>
                            <div>
                              <label
                                className={LABEL_CLASS}
                                htmlFor={`rate-${roomIndex}-${surfaceIndex}`}
                              >
                                Rate / m² (cents)
                              </label>
                              <input
                                id={`rate-${roomIndex}-${surfaceIndex}`}
                                type="number"
                                min="0"
                                step="1"
                                value={surface.rate_per_m2_cents}
                                onChange={(event) =>
                                  handleSurfaceChange(
                                    roomIndex,
                                    surfaceIndex,
                                    'rate_per_m2_cents',
                                    event.target.value
                                  )
                                }
                                className={FIELD_CLASS}
                              />
                            </div>
                          </div>

                          <div className="mt-3">
                            <label
                              className={LABEL_CLASS}
                              htmlFor={`surface-notes-${roomIndex}-${surfaceIndex}`}
                            >
                              Surface Notes
                            </label>
                            <textarea
                              id={`surface-notes-${roomIndex}-${surfaceIndex}`}
                              rows={2}
                              value={surface.notes}
                              onChange={(event) =>
                                handleSurfaceChange(
                                  roomIndex,
                                  surfaceIndex,
                                  'notes',
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
                            />
                          </div>

                          <div className="mt-3 rounded-lg bg-pm-surface px-3 py-2 text-sm text-pm-secondary">
                            Surface total:{' '}
                            <span className="font-semibold text-pm-body">
                              {formatAUD(Math.round(surfaceTotal * 100))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pm-secondary">
          Notes
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="notes" className={LABEL_CLASS}>
              Client Notes
            </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={form.notes}
            onChange={handleFormChange}
            placeholder="Visible notes for the client"
            className="w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          />
          </div>
          <div>
            <label htmlFor="internal_notes" className={LABEL_CLASS}>
              Internal Notes
            </label>
          <textarea
            id="internal_notes"
            name="internal_notes"
            rows={3}
            value={form.internal_notes}
            onChange={handleFormChange}
            placeholder="Internal notes not shown to the client"
            className="w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-pm-border bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">Totals</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-pm-secondary">Base subtotal</dt>
            <dd className="font-medium text-pm-body">
              {formatAUD(preview.base_subtotal_cents)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-pm-secondary">Quoted subtotal</dt>
            <dd className="font-medium text-pm-body">{formatAUD(preview.subtotal_cents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-pm-secondary">GST</dt>
            <dd className="font-medium text-pm-body">{formatAUD(preview.gst_cents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-pm-border pt-3">
            <dt className="font-semibold text-pm-body">Total</dt>
            <dd className="text-base font-semibold text-pm-body">
              {formatAUD(preview.total_cents)}
            </dd>
          </div>
        </dl>
      </section>

      {error && (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-pm-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
              router.back();
            }}
            disabled={isPending}
            className="h-14 flex-1 rounded-xl border border-pm-border bg-white text-base font-medium text-pm-body transition-colors active:bg-pm-surface disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="h-14 flex-[2] rounded-xl bg-pm-teal text-base font-semibold text-white transition-colors active:bg-pm-teal-hover disabled:opacity-50"
          >
            {isPending ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
