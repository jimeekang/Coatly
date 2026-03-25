import { describe, expect, it, vi } from 'vitest';
import {
  BUSINESS_LOGO_BUCKET,
  createStorageObjectDataUrl,
  createSignedStorageUrl,
  LEGACY_BUSINESS_LOGO_BUCKET,
  parseStorageObjectReference,
} from '@/lib/supabase/storage';

function buildStorageClient(
  createSignedUrl = vi.fn(),
  download = vi.fn()
) {
  return {
    storage: {
      from: vi.fn(() => ({
        createSignedUrl,
        download,
      })),
    },
  };
}

describe('parseStorageObjectReference', () => {
  it('parses bucket-qualified storage paths', () => {
    expect(parseStorageObjectReference('logos/user-1/logo.png')).toEqual({
      bucket: BUSINESS_LOGO_BUCKET,
      path: 'user-1/logo.png',
    });
  });

  it('parses legacy bucket URLs', () => {
    expect(
      parseStorageObjectReference(
        'https://example.supabase.co/storage/v1/object/public/business-assets/user-1/logo.png'
      )
    ).toEqual({
      bucket: LEGACY_BUSINESS_LOGO_BUCKET,
      path: 'user-1/logo.png',
    });
  });
});

describe('createSignedStorageUrl', () => {
  it('falls back to the legacy bucket for plain legacy logo paths', async () => {
    const createSignedUrl = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
      .mockResolvedValueOnce({
        data: {
          signedUrl:
            'https://example.supabase.co/storage/v1/object/sign/business-assets/user-1/logo.png?token=legacy',
        },
        error: null,
      });

    const supabase = buildStorageClient(createSignedUrl);
    const signedUrl = await createSignedStorageUrl(
      supabase as never,
      'user-1/logo.png'
    );

    expect(supabase.storage.from).toHaveBeenNthCalledWith(1, BUSINESS_LOGO_BUCKET);
    expect(supabase.storage.from).toHaveBeenNthCalledWith(
      2,
      LEGACY_BUSINESS_LOGO_BUCKET
    );
    expect(signedUrl).toBe(
      'https://example.supabase.co/storage/v1/object/sign/business-assets/user-1/logo.png?token=legacy'
    );
  });
});

describe('createStorageObjectDataUrl', () => {
  it('downloads a bucket-qualified logo path as a data URL', async () => {
    const download = vi.fn().mockResolvedValue({
      data: new Blob(['png-bytes'], { type: 'image/png' }),
      error: null,
    });
    const supabase = buildStorageClient(vi.fn(), download);

    const dataUrl = await createStorageObjectDataUrl(
      supabase as never,
      'logos/user-1/logo.png'
    );

    expect(supabase.storage.from).toHaveBeenCalledWith(BUSINESS_LOGO_BUCKET);
    expect(download).toHaveBeenCalledWith('user-1/logo.png');
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
