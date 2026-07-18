'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

export type AIDraftPhotoAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  description?: string;
};

type AIDraftPanelProps = {
  entityLabel: string;
  prompt: string;
  placeholder: string;
  examples: string[];
  photos?: AIDraftPhotoAttachment[];
  maxPhotos?: number;
  pending: boolean;
  error: string | null;
  summary: string | null;
  warnings: string[];
  onPromptChange: (value: string) => void;
  onPhotosChange?: (photos: AIDraftPhotoAttachment[]) => void;
  onGenerate: () => void;
  onApply: () => void;
  canApply: boolean;
};

export function AIDraftPanel({
  entityLabel,
  prompt,
  placeholder,
  examples,
  photos = [],
  maxPhotos = 3,
  pending,
  error,
  summary,
  warnings,
  onPromptChange,
  onPhotosChange,
  onGenerate,
  onApply,
  canApply,
}: AIDraftPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canAttachPhotos = Boolean(onPhotosChange);
  const remainingPhotoSlots = Math.max(0, maxPhotos - photos.length);

  async function handlePhotoSelection(files: FileList | null) {
    if (!files || !onPhotosChange || remainingPhotoSlots <= 0) return;

    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingPhotoSlots);

    const attachments = await Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<AIDraftPhotoAttachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: `${file.name}-${file.size}-${file.lastModified}`,
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: String(reader.result ?? ''),
                description: file.name,
              });
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );

    onPhotosChange([...photos, ...attachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removePhoto(photoId: string) {
    onPhotosChange?.(photos.filter((photo) => photo.id !== photoId));
  }

  return (
    <section className="border-primary-container/40 from-primary-container/30 to-surface mb-6 rounded-2xl border bg-gradient-to-br p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            AI Draft
          </p>
          <h2 className="text-on-surface mt-1 text-lg font-semibold">
            Describe the {entityLabel.toLowerCase()} in plain English
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            AI prepares a structured draft only. You still review the form
            before saving.
          </p>
          <p className="border-primary-container/40 bg-surface-container-lowest/80 text-on-surface-variant mt-2 rounded-xl border px-3 py-2 text-xs">
            AI drafts scope and questions only. Prices stay tied to your saved
            rates and must be reviewed before saving.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={4}
          placeholder={placeholder}
          className="border-primary-container/50 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/30 w-full rounded-xl border px-4 py-3 text-base focus:ring-2 focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPromptChange(example)}
            className="border-primary-container/50 bg-surface-container-lowest text-primary hover:bg-primary-container/30 focus-visible:ring-primary/30 active:bg-primary-container/50 min-h-11 rounded-xl border px-4 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {example}
          </button>
        ))}
      </div>

      {canAttachPhotos && (
        <div className="border-primary-container/40 bg-surface-container-lowest/80 mt-4 rounded-2xl border px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-on-surface text-sm font-semibold">
                Site photos
              </p>
              <p className="text-on-surface-variant mt-1 text-xs">
                Add up to {maxPhotos} photos. AI uses them only as
                visible-condition hints; measurements and prices still need
                review.
              </p>
            </div>
            <label className="border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high focus-within:ring-primary/30 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:outline-none">
              Upload Photos
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={remainingPhotoSlots <= 0 || pending}
                onChange={(event) => {
                  void handlePhotoSelection(event.target.files);
                }}
                className="sr-only"
              />
            </label>
          </div>

          {photos.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {photos.map((photo) => (
                <li
                  key={photo.id}
                  className="border-outline-variant bg-surface flex items-center gap-3 rounded-2xl border px-3 py-2"
                >
                  <Image
                    src={photo.dataUrl}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-on-surface truncate text-sm font-medium">
                      {photo.name}
                    </p>
                    <p className="text-on-surface-variant text-xs">
                      {(photo.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="text-error hover:bg-error-container/30 focus-visible:ring-error/30 min-h-11 rounded-xl px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(summary || warnings.length > 0) && (
        <div className="border-outline-variant bg-surface-container-lowest mt-4 rounded-2xl border px-4 py-3">
          {summary && (
            <p className="text-on-surface text-sm font-medium">{summary}</p>
          )}
          {warnings.length > 0 && (
            <ul className="text-on-warning-container mt-2 space-y-1 text-sm">
              {warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <ErrorAlert className="mt-4">{error}</ErrorAlert>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending || !prompt.trim()}
          className="bg-primary text-on-primary focus-visible:ring-primary focus-visible:ring-offset-surface inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Generating…' : 'Generate Draft'}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply || pending}
          className="border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high active:bg-outline-variant focus-visible:ring-primary/30 inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply to Form
        </button>
      </div>
    </section>
  );
}
