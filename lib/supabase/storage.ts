import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';

export const BUSINESS_LOGO_BUCKET = 'logos';
export const JOB_PHOTO_BUCKET = 'photos';
export const LEGACY_BUSINESS_LOGO_BUCKET = 'business-assets';
const KNOWN_STORAGE_BUCKETS = [
  BUSINESS_LOGO_BUCKET,
  JOB_PHOTO_BUCKET,
  LEGACY_BUSINESS_LOGO_BUCKET,
] as const;

const STORAGE_PATH_PREFIXES = [
  '/storage/v1/object/public/',
  '/storage/v1/object/sign/',
  '/storage/v1/object/authenticated/',
  '/storage/v1/render/image/public/',
  '/storage/v1/render/image/authenticated/',
] as const;

type StorageClient = Pick<SupabaseClient<AppDatabase>, 'storage'>;

export type StorageObjectReference = {
  bucket: string;
  path: string;
};

function getMimeTypeFromPath(path: string) {
  const normalized = path.toLowerCase();

  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.webp')) return 'image/webp';

  return 'application/octet-stream';
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeStoragePath(value: string) {
  return value.trim().replace(/^\/+/, '');
}

function parseBucketQualifiedPath(value: string) {
  const normalized = normalizeStoragePath(value);
  const [bucket, ...pathParts] = normalized.split('/');
  const path = pathParts.join('/');

  if (
    bucket &&
    path &&
    KNOWN_STORAGE_BUCKETS.includes(
      bucket as (typeof KNOWN_STORAGE_BUCKETS)[number]
    )
  ) {
    return { bucket, path };
  }

  return null;
}

function isStoragePath(value: string) {
  const normalized = normalizeStoragePath(value);

  return normalized.length > 0 && normalized.includes('/') && !isHttpUrl(normalized);
}

export function isValidStorageReference(value: string) {
  const trimmed = value.trim();

  return trimmed === '' || isHttpUrl(trimmed) || isStoragePath(trimmed);
}

export function parseStorageObjectReference(
  value: string | null | undefined,
  defaultBucket = BUSINESS_LOGO_BUCKET
): StorageObjectReference | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isStoragePath(trimmed)) {
    const bucketQualifiedPath = parseBucketQualifiedPath(trimmed);

    if (bucketQualifiedPath) {
      return bucketQualifiedPath;
    }

    return {
      bucket: defaultBucket,
      path: normalizeStoragePath(trimmed),
    };
  }

  if (!isHttpUrl(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    for (const prefix of STORAGE_PATH_PREFIXES) {
      const prefixIndex = url.pathname.indexOf(prefix);

      if (prefixIndex < 0) continue;

      const objectPath = decodeURIComponent(
        url.pathname.slice(prefixIndex + prefix.length)
      );
      const [bucket, ...pathParts] = objectPath.split('/');
      const path = pathParts.join('/');

      if (bucket && path) {
        return { bucket, path };
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function createSignedUrlForReference(
  supabase: StorageClient,
  reference: StorageObjectReference,
  expiresIn: number
) {
  const { data, error } = await supabase.storage
    .from(reference.bucket)
    .createSignedUrl(reference.path, expiresIn);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

async function downloadStorageObjectAsDataUrlForReference(
  supabase: StorageClient,
  reference: StorageObjectReference
) {
  const { data, error } = await supabase.storage
    .from(reference.bucket)
    .download(reference.path);

  if (error || !data) {
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  const mimeType = data.type || getMimeTypeFromPath(reference.path);

  return `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
}

export async function createSignedStorageUrl(
  supabase: StorageClient,
  value: string | null | undefined,
  {
    defaultBucket = BUSINESS_LOGO_BUCKET,
    expiresIn = 60 * 60,
  }: {
    defaultBucket?: string;
    expiresIn?: number;
  } = {}
) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const reference = parseStorageObjectReference(trimmed, defaultBucket);

  if (!reference) {
    return isHttpUrl(trimmed) ? trimmed : null;
  }

  const signedUrl = await createSignedUrlForReference(supabase, reference, expiresIn);

  if (signedUrl) {
    return signedUrl;
  }

  const isLegacyLogoPathCandidate =
    reference.bucket === defaultBucket &&
    defaultBucket === BUSINESS_LOGO_BUCKET &&
    parseBucketQualifiedPath(trimmed) == null;

  if (isLegacyLogoPathCandidate) {
    return createSignedUrlForReference(
      supabase,
      {
        bucket: LEGACY_BUSINESS_LOGO_BUCKET,
        path: reference.path,
      },
      expiresIn
    );
  }

  return null;
}

export async function createStorageObjectDataUrl(
  supabase: StorageClient,
  value: string | null | undefined,
  { defaultBucket = BUSINESS_LOGO_BUCKET }: { defaultBucket?: string } = {}
) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const reference = parseStorageObjectReference(trimmed, defaultBucket);

  if (!reference) {
    return null;
  }

  const dataUrl = await downloadStorageObjectAsDataUrlForReference(supabase, reference);

  if (dataUrl) {
    return dataUrl;
  }

  const isLegacyLogoPathCandidate =
    reference.bucket === defaultBucket &&
    defaultBucket === BUSINESS_LOGO_BUCKET &&
    parseBucketQualifiedPath(trimmed) == null;

  if (isLegacyLogoPathCandidate) {
    return downloadStorageObjectAsDataUrlForReference(supabase, {
      bucket: LEGACY_BUSINESS_LOGO_BUCKET,
      path: reference.path,
    });
  }

  return null;
}
